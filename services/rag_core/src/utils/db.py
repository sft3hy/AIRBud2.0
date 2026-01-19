import time
import json
import uuid
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from datetime import datetime
from typing import Optional, List, Dict, Tuple, Any

from src.config import settings
from src.utils.logger import logger

class DatabaseManager:
    """
    Singleton Database Manager handling a ThreadedConnectionPool.
    Designed for high-concurrency environments (100+ users).
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DatabaseManager, cls).__new__(cls)
            cls._instance._init_pool()
        return cls._instance

    def _init_pool(self):
        """
        Initializes the connection pool with retry logic.
        """
        retries = 10
        # Min=5 ensures we have connections ready. Max=50 supports concurrent load.
        min_conn = 5
        max_conn = 50 
        
        while retries > 0:
            try:
                self.pool = psycopg2.pool.ThreadedConnectionPool(
                    min_conn, max_conn,
                    host=settings.DB_HOST,
                    user=settings.DB_USER,
                    password=settings.DB_PASSWORD,
                    dbname=settings.DB_NAME,
                    port=settings.DB_PORT,
                    # keepalives help detect dead connections
                    keepalives=1,
                    keepalives_idle=30,
                    keepalives_interval=10,
                    keepalives_count=5
                )
                self._init_tables()
                logger.info(f"Database connection established. Pool Size: {min_conn}-{max_conn}")
                return
            except psycopg2.OperationalError as e:
                logger.warning(f"DB Connection failed: {e}. Retrying... ({retries} left)")
                retries -= 1
                time.sleep(3)
            except Exception as e:
                logger.error(f"Critical DB Error: {e}")
                raise

        raise Exception("Could not connect to PostgreSQL database after multiple attempts.")

    @contextmanager
    def get_cursor(self, commit: bool = False):
        """
        Yields a cursor from a pooled connection.
        Handles transactions and ensures connections are returned to the pool.
        """
        conn = None
        try:
            conn = self.pool.getconn()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                yield cur
                if commit:
                    conn.commit()
        except psycopg2.InterfaceError:
            # Connection is dead, don't return it to the pool in a usable state
            if conn:
                self.pool.putconn(conn, close=True)
                conn = None
            raise
        except Exception as e:
            if conn:
                conn.rollback()
            raise e
        finally:
            if conn:
                self.pool.putconn(conn)

    def _init_tables(self):
        """
        Idempotent schema initialization.
        Includes migration logic for backward compatibility.
        """
        with self.get_cursor(commit=True) as cur:
            # 1. Users
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

            # 2. Groups
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

            # 3. Group Members
            cur.execute("""
                CREATE TABLE IF NOT EXISTS group_members (
                    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    joined_at TIMESTAMP DEFAULT NOW(),
                    PRIMARY KEY (group_id, user_id)
                )
            """)

            # 4. Collections
            cur.execute("""
                CREATE TABLE IF NOT EXISTS collections (
                    id SERIAL PRIMARY KEY,
                    name TEXT,
                    owner_id INTEGER REFERENCES users(id),
                    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            
            # --- MIGRATIONS: PATCH EXISTING TABLES ---
            # Ensure columns exist if table was created in older version
            cur.execute("ALTER TABLE collections ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id)")
            cur.execute("ALTER TABLE collections ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE")

            # 5. Documents
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
            
            # 6. Queries
            cur.execute("""
                CREATE TABLE IF NOT EXISTS queries (
                    id SERIAL PRIMARY KEY,
                    collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(id),
                    question TEXT,
                    response TEXT,
                    sources_json TEXT,
                    timestamp TIMESTAMP
                )
            """)
            # Migration for queries
            cur.execute("ALTER TABLE queries ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)")

    # --- User Operations ---
    def upsert_user(self, piv_id: str, display_name: str, organization: str, email: str = "") -> int:
        """
        Inserts new user or updates metadata for existing user.
        """
        with self.get_cursor(commit=True) as cur:
            cur.execute("SELECT id FROM users WHERE piv_id = %s", (piv_id,))
            res = cur.fetchone()
            
            if res:
                uid = res['id']
                cur.execute("""
                    UPDATE users 
                    SET last_login=%s, display_name=%s, organization=%s
                    WHERE id=%s
                """, (datetime.now(), display_name, organization, uid))
                return uid
            else:
                cur.execute("""
                    INSERT INTO users (piv_id, display_name, organization, email, last_login)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (piv_id, display_name, organization, email, datetime.now()))
                return cur.fetchone()['id']

    # --- Group Operations ---
    def create_group(self, name: str, description: str, is_public: bool, owner_id: int) -> Tuple[int, str]:
        token = str(uuid.uuid4())
        with self.get_cursor(commit=True) as cur:
            cur.execute("""
                INSERT INTO groups (name, description, owner_id, is_public, invite_token)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
            """, (name, description, owner_id, is_public, token))
            gid = cur.fetchone()['id']
            # Add owner as member
            cur.execute("INSERT INTO group_members (group_id, user_id) VALUES (%s, %s)", (gid, owner_id))
            return gid, token

    def get_user_groups(self, user_id: int) -> List[Dict]:
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

    def get_public_groups(self, user_id: int) -> List[Dict]:
        """Get ALL public groups, with 'is_member' flag for the requesting user."""
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
    
    def join_group_by_token(self, user_id: int, token: str) -> Optional[int]:
        with self.get_cursor(commit=True) as cur:
            cur.execute("SELECT id FROM groups WHERE invite_token = %s", (token,))
            res = cur.fetchone()
            if not res: return None
            gid = res['id']
            cur.execute("INSERT INTO group_members (group_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (gid, user_id))
            return gid

    def join_group_by_id(self, user_id: int, group_id: int) -> bool:
        with self.get_cursor(commit=True) as cur:
            cur.execute("SELECT is_public FROM groups WHERE id = %s", (group_id,))
            res = cur.fetchone()
            if not res or not res['is_public']: return False
            cur.execute("INSERT INTO group_members (group_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (group_id, user_id))
            return True

    def delete_group(self, group_id: int, user_id: int) -> bool:
        with self.get_cursor(commit=True) as cur:
            cur.execute("SELECT id FROM groups WHERE id = %s AND owner_id = %s", (group_id, user_id))
            if not cur.fetchone():
                return False
            cur.execute("DELETE FROM groups WHERE id = %s", (group_id,))
            return True

    def leave_group(self, group_id: int, user_id: int) -> bool:
        with self.get_cursor(commit=True) as cur:
            cur.execute("SELECT owner_id FROM groups WHERE id = %s", (group_id,))
            res = cur.fetchone()
            if not res: return False
            
            # Owner cannot leave; they must delete the group
            if res['owner_id'] == user_id:
                return False 
            
            cur.execute("DELETE FROM group_members WHERE group_id = %s AND user_id = %s", (group_id, user_id))
            return True

    def update_group(self, group_id: int, new_name: str, new_description: str, owner_id: int) -> bool:
        with self.get_cursor(commit=True) as cur:
            cur.execute(
                "UPDATE groups SET name=%s, description=%s WHERE id=%s AND owner_id=%s RETURNING id",
                (new_name, new_description, group_id, owner_id)
            )
            return cur.fetchone() is not None
        
    # --- Collection Operations ---
    def create_collection(self, name: str, owner_id: int, group_id: Optional[int] = None) -> int:
        with self.get_cursor(commit=True) as cur:
            cur.execute(
                "INSERT INTO collections (name, owner_id, group_id, created_at) VALUES (%s, %s, %s, %s) RETURNING id",
                (name, owner_id, group_id, datetime.now())
            )
            return cur.fetchone()['id']
    
    def get_all_collections(self, user_id: int) -> List[Dict]:
        """
        Fetch collections owned by the user OR belonging to groups the user is in.
        """
        with self.get_cursor() as cur:
            cur.execute("""
                SELECT 
                    c.id, c.name, c.created_at, c.owner_id, c.group_id,
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

    def rename_collection(self, collection_id: int, new_name: str, owner_id: int) -> bool:
        with self.get_cursor(commit=True) as cur:
            cur.execute(
                "UPDATE collections SET name=%s WHERE id=%s AND owner_id=%s RETURNING id",
                (new_name, collection_id, owner_id)
            )
            return cur.fetchone() is not None

    def delete_collection(self, collection_id: int, user_id: int) -> bool:
        with self.get_cursor(commit=True) as cur:
            # Cascades delete to documents/queries due to ON DELETE CASCADE
            cur.execute(
                "DELETE FROM collections WHERE id=%s AND owner_id=%s RETURNING id", 
                (collection_id, user_id)
            )
            return cur.fetchone() is not None

    # --- Document Operations ---
    def add_document_record(self, filename: str, vision_model: str, chart_dir: str, 
                          faiss_path: str, chunks_path: str, chart_descriptions: Any, 
                          collection_id: int) -> int:
        
        desc_json = json.dumps(chart_descriptions) if isinstance(chart_descriptions, dict) else "{}"
        
        with self.get_cursor(commit=True) as cur:
            cur.execute("""
                INSERT INTO documents 
                (collection_id, original_filename, vision_model_used, timestamp, chart_dir, faiss_index_path, chunks_path, chart_descriptions_json)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (collection_id, filename, vision_model, datetime.now(), chart_dir, faiss_path, chunks_path, desc_json))
            return cur.fetchone()['id']

    def update_document_paths(self, doc_id: int, faiss_path: str, chunks_path: str):
        with self.get_cursor(commit=True) as cur:
            cur.execute(
                "UPDATE documents SET faiss_index_path=%s, chunks_path=%s WHERE id=%s",
                (faiss_path, chunks_path, doc_id)
            )

    def get_collection_documents(self, collection_id: int) -> List[Dict]:
        with self.get_cursor() as cur:
            cur.execute("SELECT * FROM documents WHERE collection_id=%s ORDER BY original_filename ASC", (collection_id,))
            rows = cur.fetchall()
            # Helper to parse JSON on read
            for row in rows:
                raw = row.get("chart_descriptions_json")
                if raw and isinstance(raw, str):
                    try:
                        row["chart_descriptions"] = json.loads(raw)
                    except json.JSONDecodeError:
                        row["chart_descriptions"] = {}
                elif isinstance(raw, dict):
                    row["chart_descriptions"] = raw
                else:
                    row["chart_descriptions"] = {}
            return rows

    def get_document_by_id(self, doc_id: int) -> Optional[Dict]:
        with self.get_cursor() as cur:
            cur.execute("SELECT * FROM documents WHERE id = %s", (doc_id,))
            return cur.fetchone()

    def get_document_ownership(self, doc_id: int) -> Optional[Dict]:
        with self.get_cursor() as cur:
            cur.execute("""
                SELECT c.owner_id, c.id as collection_id
                FROM documents d
                JOIN collections c ON d.collection_id = c.id
                WHERE d.id = %s
            """, (doc_id,))
            return cur.fetchone()

    def delete_document(self, doc_id: int):
        with self.get_cursor(commit=True) as cur:
            cur.execute("DELETE FROM documents WHERE id=%s", (doc_id,))

    # --- Query Operations ---
    def add_query_record(self, collection_id: int, user_id: int, question: str, response: str, sources: List):
        with self.get_cursor(commit=True) as cur:
            cur.execute(
                """
                INSERT INTO queries 
                (collection_id, user_id, question, response, sources_json, timestamp) 
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (collection_id, user_id, question, response, json.dumps(sources), datetime.now())
            )

    def get_queries_for_collection(self, collection_id: int, user_id: int) -> List[Dict]:
        """
        Retrieves query history. 
        Note: Currently restricted to queries by the requesting user within that collection.
        """
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
                    try:
                        r['sources'] = json.loads(r['sources_json'])
                    except:
                        r['sources'] = []
                    # Legacy frontend support: alias sources to results
                    r['results'] = r['sources']
            return results