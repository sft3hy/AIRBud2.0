import time
import json
import uuid
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from datetime import datetime
from src.config import settings
from src.utils.logger import logger

class DatabaseManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DatabaseManager, cls).__new__(cls)
            cls._instance._init_pool()
        return cls._instance

    def _init_pool(self):
        retries = 5
        while retries > 0:
            try:
                self.pool = psycopg2.pool.ThreadedConnectionPool(
                    1, 10,
                    host=settings.DB_HOST,
                    user=settings.DB_USER,
                    password=settings.DB_PASSWORD,
                    dbname=settings.DB_NAME,
                    port=settings.DB_PORT
                )
                self._init_tables()
                logger.info("Database connection established.")
                return
            except psycopg2.OperationalError as e:
                logger.warning(f"DB Connection failed, retrying... ({retries} left)")
                retries -= 1
                time.sleep(3)
        raise Exception("Could not connect to PostgreSQL database")

    @contextmanager
    def get_cursor(self, commit=False):
        conn = self.pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                yield cur
                if commit:
                    conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self.pool.putconn(conn)

    def _init_tables(self):
        with self.get_cursor(commit=True) as cur:
            # 1. Users Table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    piv_id TEXT UNIQUE NOT NULL, 
                    display_name TEXT,
                    organization TEXT,
                    email TEXT,
                    last_login TIMESTAMP,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)

            # 2. Groups Table (NEW)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS groups (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    owner_id INTEGER REFERENCES users(id),
                    is_public BOOLEAN DEFAULT FALSE,
                    invite_token TEXT UNIQUE,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)

            # 3. Group Members Table (NEW)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS group_members (
                    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    joined_at TIMESTAMP DEFAULT NOW(),
                    PRIMARY KEY (group_id, user_id)
                )
            """)

            # 4. Collections Table
            # (Note: This only works for fresh installs)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS collections (
                    id SERIAL PRIMARY KEY,
                    name TEXT,
                    owner_id INTEGER REFERENCES users(id),
                    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
                    created_at TIMESTAMP
                )
            """)
            
            # --- SCHEMA MIGRATION: PATCH EXISTING TABLES ---
            # If the table exists but is missing columns, we add them here.
            
            # Ensure 'owner_id' exists
            cur.execute("""
                ALTER TABLE collections 
                ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id)
            """)

            # Ensure 'group_id' exists (Fixes your specific error)
            cur.execute("""
                ALTER TABLE collections 
                ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE
            """)
            # -----------------------------------------------

            # 5. Documents & Queries (Unchanged)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    id SERIAL PRIMARY KEY,
                    collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
                    original_filename TEXT,
                    vision_model_used TEXT,
                    timestamp TIMESTAMP,
                    chart_dir TEXT,
                    faiss_index_path TEXT,
                    chunks_path TEXT,
                    chart_descriptions_json TEXT
                )
            """)
            
            # 1. UPDATE QUERIES TABLE (Add user_id)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS queries (
                    id SERIAL PRIMARY KEY,
                    collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(id),  -- NEW COLUMN
                    question TEXT,
                    response TEXT,
                    sources_json TEXT,
                    timestamp TIMESTAMP
                )
            """)
            cur.execute("""
                ALTER TABLE queries 
                ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)
            """)

    # --- User Operations ---
    def upsert_user(self, piv_id, display_name, organization, email=""):
        """
        Inserts a new user or updates the last_login AND display_name if they exist.
        """
        with self.get_cursor(commit=True) as cur:
            # Check if exists
            cur.execute("SELECT id FROM users WHERE piv_id = %s", (piv_id,))
            res = cur.fetchone()
            
            if res:
                uid = res['id']
                # UPDATED: Update display_name as well to fix old formatting on next login
                cur.execute("""
                    UPDATE users 
                    SET last_login=%s, display_name=%s 
                    WHERE id=%s
                """, (datetime.now(), display_name, uid))
                return uid
            else:
                cur.execute("""
                    INSERT INTO users (piv_id, display_name, organization, email, last_login)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (piv_id, display_name, organization, email, datetime.now()))
                return cur.fetchone()['id']

    # --- Group Operations ---
    def create_group(self, name, description, is_public, owner_id):
        token = str(uuid.uuid4())
        with self.get_cursor(commit=True) as cur:
            cur.execute("""
                INSERT INTO groups (name, description, owner_id, is_public, invite_token)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
            """, (name, description, owner_id, is_public, token))
            gid = cur.fetchone()['id']
            cur.execute("INSERT INTO group_members (group_id, user_id) VALUES (%s, %s)", (gid, owner_id))
            return gid, token

    def get_user_groups(self, user_id):
        with self.get_cursor() as cur:
            cur.execute("""
                SELECT g.*, u.display_name as owner_name,
                (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) as member_count
                FROM groups g
                JOIN group_members gm ON g.id = gm.group_id
                JOIN users u ON g.owner_id = u.id
                WHERE gm.user_id = %s
                ORDER BY g.created_at DESC
            """, (user_id,))
            return cur.fetchall()

    def get_public_groups(self, user_id):
        """Get ALL public groups, including ones I am in, with status flag."""
        with self.get_cursor() as cur:
            cur.execute("""
                SELECT g.*, u.display_name as owner_name,
                (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) as member_count,
                EXISTS (SELECT 1 FROM group_members gm3 WHERE gm3.group_id = g.id AND gm3.user_id = %s) as is_member
                FROM groups g
                JOIN users u ON g.owner_id = u.id
                WHERE g.is_public = TRUE
                ORDER BY g.created_at DESC
            """, (user_id,))
            return cur.fetchall()
    
    def join_group_by_token(self, user_id, token):
        with self.get_cursor(commit=True) as cur:
            cur.execute("SELECT id FROM groups WHERE invite_token = %s", (token,))
            res = cur.fetchone()
            if not res: return None
            gid = res['id']
            cur.execute("INSERT INTO group_members (group_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (gid, user_id))
            return gid

    def join_group_by_id(self, user_id, group_id):
        with self.get_cursor(commit=True) as cur:
            cur.execute("SELECT is_public FROM groups WHERE id = %s", (group_id,))
            res = cur.fetchone()
            if not res or not res['is_public']: return False
            cur.execute("INSERT INTO group_members (group_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (group_id, user_id))
            return True

    def delete_group(self, group_id, user_id):
        with self.get_cursor(commit=True) as cur:
            cur.execute("SELECT id FROM groups WHERE id = %s AND owner_id = %s", (group_id, user_id))
            if not cur.fetchone():
                return False
            cur.execute("DELETE FROM groups WHERE id = %s", (group_id,))
            return True

    def leave_group(self, group_id, user_id):
        """
        Allows a user to leave a group.
        Prevents leaving if the user is the owner (Owner must delete the group).
        """
        with self.get_cursor(commit=True) as cur:
            # 1. Check if owner
            cur.execute("SELECT owner_id FROM groups WHERE id = %s", (group_id,))
            res = cur.fetchone()
            if not res:
                return False # Group doesn't exist
            
            if res['owner_id'] == user_id:
                return False # Owner cannot leave, must delete
            
            # 2. Delete membership
            cur.execute("DELETE FROM group_members WHERE group_id = %s AND user_id = %s", (group_id, user_id))
            return True


    # --- UPDATED: QUERY RECORDING ---
    def add_query_record(self, collection_id, user_id, question, response, sources):
        with self.get_cursor(commit=True) as cur:
            cur.execute(
                """
                INSERT INTO queries 
                (collection_id, user_id, question, response, sources_json, timestamp) 
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (collection_id, user_id, question, response, json.dumps(sources), datetime.now())
            )

    # --- Collection Operations ---
    def create_collection(self, name, owner_id, group_id=None):
        with self.get_cursor(commit=True) as cur:
            cur.execute(
                "INSERT INTO collections (name, owner_id, group_id, created_at) VALUES (%s, %s, %s, %s) RETURNING id",
                (name, owner_id, group_id, datetime.now())
            )
            return cur.fetchone()['id']
    
    def get_all_collections(self, user_id):
        with self.get_cursor() as cur:
            cur.execute("""
                SELECT 
                    c.id, 
                    c.name, 
                    c.created_at, 
                    c.owner_id, 
                    c.group_id,
                    u.display_name as owner_name,
                    g.name as group_name,
                    COUNT(d.id) as docs
                FROM collections c 
                LEFT JOIN documents d ON c.id=d.collection_id
                LEFT JOIN users u ON c.owner_id = u.id
                LEFT JOIN groups g ON c.group_id = g.id
                WHERE 
                    c.owner_id = %s 
                    OR 
                    c.group_id IN (SELECT group_id FROM group_members WHERE user_id = %s)
                GROUP BY c.id, c.name, c.created_at, c.owner_id, c.group_id, u.display_name, g.name
                ORDER BY c.created_at DESC
            """, (user_id, user_id))
            return cur.fetchall()

    def delete_collection(self, collection_id, user_id):
        """
        Deletes a collection ONLY if the user_id matches the owner_id.
        """
        with self.get_cursor(commit=True) as cur:
            # 1. Delete from SQL (Cascades to documents/queries)
            # We add 'AND owner_id = %s' to enforce ownership
            cur.execute(
                "DELETE FROM collections WHERE id=%s AND owner_id=%s RETURNING id", 
                (collection_id, user_id)
            )
            deleted_row = cur.fetchone()
            
            # Returns True if a row was deleted, False if not found or not owned
            return deleted_row is not None

    # --- Documents & Queries ---
    def add_document_record(self, filename, vision_model, chart_dir, faiss_path, chunks_path, chart_descriptions, collection_id):
        desc_json = json.dumps(chart_descriptions) if isinstance(chart_descriptions, dict) else chart_descriptions
        with self.get_cursor(commit=True) as cur:
            cur.execute("""
                INSERT INTO documents 
                (collection_id, original_filename, vision_model_used, timestamp, chart_dir, faiss_index_path, chunks_path, chart_descriptions_json)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (collection_id, filename, vision_model, datetime.now(), chart_dir, faiss_path, chunks_path, desc_json))
            return cur.fetchone()['id']

    def update_document_paths(self, doc_id, faiss_path, chunks_path):
        with self.get_cursor(commit=True) as cur:
            cur.execute(
                "UPDATE documents SET faiss_index_path=%s, chunks_path=%s WHERE id=%s",
                (faiss_path, chunks_path, doc_id)
            )

    def get_collection_documents(self, collection_id):
        with self.get_cursor() as cur:
            cur.execute("SELECT * FROM documents WHERE collection_id=%s ORDER BY original_filename ASC", (collection_id,))
            rows = cur.fetchall()
            for row in rows:
                raw = row.get("chart_descriptions_json")
                if raw and isinstance(raw, str):
                    try:
                        row["chart_descriptions"] = json.loads(raw)
                    except:
                        row["chart_descriptions"] = {}
                elif isinstance(raw, dict):
                    row["chart_descriptions"] = raw
                else:
                    row["chart_descriptions"] = {}
            return rows

    def delete_document(self, doc_id):
        with self.get_cursor(commit=True) as cur:
            cur.execute("DELETE FROM documents WHERE id=%s", (doc_id,))



    def get_queries_for_collection(self, collection_id, user_id):
        with self.get_cursor() as cur:
            cur.execute(
                """
                SELECT question, response, sources_json 
                FROM queries 
                WHERE collection_id=%s AND user_id=%s 
                ORDER BY timestamp ASC
                """,
                (collection_id, user_id)
            )
            results = cur.fetchall()
            for r in results:
                if isinstance(r['sources_json'], str):
                    r['sources'] = json.loads(r['sources_json'])
                    r['results'] = r['sources']
            return results
        
    def get_document_by_id(self, doc_id):
        with self.get_cursor() as cur:
            cur.execute("SELECT * FROM documents WHERE id = %s", (doc_id,))
            return cur.fetchone()
        
    def rename_collection(self, collection_id, new_name, owner_id):
        """Renames a collection only if the user owns it."""
        with self.get_cursor(commit=True) as cur:
            cur.execute(
                "UPDATE collections SET name=%s WHERE id=%s AND owner_id=%s RETURNING id",
                (new_name, collection_id, owner_id)
            )
            return cur.fetchone() is not None

    def rename_group(self, group_id, new_name, owner_id):
        """Renames a group only if the user owns it."""
        with self.get_cursor(commit=True) as cur:
            cur.execute(
                "UPDATE groups SET name=%s WHERE id=%s AND owner_id=%s RETURNING id",
                (new_name, group_id, owner_id)
            )
            return cur.fetchone() is not None
        
    def get_document_ownership(self, doc_id: int):
        """Returns the owner_id of the collection this document belongs to."""
        with self.get_cursor() as cur:
            cur.execute("""
                SELECT c.owner_id, c.id as collection_id
                FROM documents d
                JOIN collections c ON d.collection_id = c.id
                WHERE d.id = %s
            """, (doc_id,))
            return cur.fetchone()