import time
import json
import uuid
import os
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
    Singleton Database Manager handling a ThreadedConnectionPool (Postgres)
    or a local sqlite3 connection (Ephemeral Mode).
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DatabaseManager, cls).__new__(cls)
            cls._instance._init_db()
        return cls._instance

    def _init_db(self):
        if settings.EPHEMERAL_MODE:
            logger.info("Initializing in EPHEMERAL MODE (SQLite)")
            import sqlite3
            self.sqlite_db = f"{settings.DATA_DIR}/ephemeral_db.sqlite"
            self._init_sqlite_tables()
        else:
            self._init_postgres_pool()

    def _init_postgres_pool(self):
        retries = 10
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
                    keepalives=1,
                    keepalives_idle=30,
                    keepalives_interval=10,
                    keepalives_count=5
                )
                self._init_postgres_tables()
                logger.info(f"Postgres connection established. Pool Size: {min_conn}-{max_conn}")
                return
            except psycopg2.OperationalError as e:
                logger.warning(f"Postgres Connection failed: {e}. Retrying... ({retries} left)")
                retries -= 1
                time.sleep(3)
            except Exception as e:
                logger.error(f"Critical Postgres Error: {e}")
                raise

        raise Exception("Could not connect to PostgreSQL after multiple attempts.")

    @contextmanager
    def get_cursor(self, commit: bool = False):
        if settings.EPHEMERAL_MODE:
            import sqlite3
            conn = sqlite3.connect(self.sqlite_db)
            conn.row_factory = sqlite3.Row
            try:
                cur = conn.cursor()
                yield cur
                if commit:
                    conn.commit()
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                conn.close()
        else:
            conn = None
            try:
                conn = self.pool.getconn()
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    yield cur
                    if commit:
                        conn.commit()
            except psycopg2.InterfaceError:
                if conn:
                    self.pool.putconn(conn, close=True)
                raise
            except Exception as e:
                if conn:
                    conn.rollback()
                raise e
            finally:
                if conn:
                    self.pool.putconn(conn)

    def _q(self, query: str) -> str:
        """Helper to swap %s for ? and other dialect differences if in SQLite mode."""
        if settings.EPHEMERAL_MODE:
            out = query.replace("%s", "?")
            out = out.replace("JSONB", "TEXT")
            out = out.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
            out = out.replace("NOW()", "CURRENT_TIMESTAMP")
            # Protect CURRENT_TIMESTAMP from being mangled into CURRENT_DATETIME
            out = out.replace("CURRENT_TIMESTAMP", "[[CUR_TS]]")
            out = out.replace("TIMESTAMP", "DATETIME")
            return out.replace("[[CUR_TS]]", "CURRENT_TIMESTAMP")
        return query

    def _init_sqlite_tables(self):
        with self.get_cursor(commit=True) as cur:
            cur.execute(self._q("CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, piv_id TEXT UNIQUE NOT NULL, display_name TEXT, organization TEXT, email TEXT, last_login DATETIME, created_at DATETIME DEFAULT NOW())"))
            cur.execute(self._q("CREATE TABLE IF NOT EXISTS groups (id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT, owner_id INTEGER REFERENCES users(id), is_public BOOLEAN DEFAULT 0, invite_token TEXT UNIQUE, created_at DATETIME DEFAULT NOW())"))
            cur.execute(self._q("CREATE TABLE IF NOT EXISTS group_members (group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, joined_at DATETIME DEFAULT NOW(), PRIMARY KEY (group_id, user_id))"))
            cur.execute(self._q("CREATE TABLE IF NOT EXISTS collections (id SERIAL PRIMARY KEY, name TEXT, owner_id INTEGER REFERENCES users(id), group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE, created_at DATETIME DEFAULT NOW())"))
            cur.execute(self._q("CREATE TABLE IF NOT EXISTS documents (id SERIAL PRIMARY KEY, collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE, original_filename TEXT, vision_model_used TEXT, timestamp DATETIME, chart_dir TEXT, faiss_index_path TEXT, chunks_path TEXT, chart_descriptions_json TEXT, preview_path TEXT)"))
            cur.execute(self._q("CREATE TABLE IF NOT EXISTS queries (id SERIAL PRIMARY KEY, collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id), question TEXT, response TEXT, sources_json TEXT, timestamp DATETIME)"))
            cur.execute(self._q("CREATE TABLE IF NOT EXISTS processing_jobs (collection_id INTEGER PRIMARY KEY, status TEXT, stage TEXT, step TEXT, progress INTEGER, details TEXT, updated_at DATETIME DEFAULT NOW())"))

    def _init_postgres_tables(self):
        # 1. Base Schema Creation (Must succeed to ensure tables exist)
        with self.get_cursor(commit=True) as cur:
            # PIV_ID is no longer strictly NOT NULL in new setups, but we keep it compatible
            # We will use _migrate_schema to relax constraints on existing DBs
            cur.execute("CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, piv_id TEXT UNIQUE, display_name TEXT, organization TEXT, email TEXT UNIQUE, last_login TIMESTAMP, created_at TIMESTAMP DEFAULT NOW())")
            cur.execute("CREATE TABLE IF NOT EXISTS groups (id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT, owner_id INTEGER REFERENCES users(id), is_public BOOLEAN DEFAULT FALSE, invite_token TEXT UNIQUE, created_at TIMESTAMP DEFAULT NOW())")
            cur.execute("CREATE TABLE IF NOT EXISTS group_members (group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, joined_at TIMESTAMP DEFAULT NOW(), PRIMARY KEY (group_id, user_id))")
            cur.execute("CREATE TABLE IF NOT EXISTS collections (id SERIAL PRIMARY KEY, name TEXT, owner_id INTEGER REFERENCES users(id), group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE, created_at TIMESTAMP DEFAULT NOW())")
            cur.execute("ALTER TABLE collections ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id)")
            cur.execute("ALTER TABLE collections ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE")
            cur.execute("CREATE TABLE IF NOT EXISTS documents (id SERIAL PRIMARY KEY, collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE, original_filename TEXT, vision_model_used TEXT, timestamp TIMESTAMP, chart_dir TEXT, faiss_index_path TEXT, chunks_path TEXT, chart_descriptions_json TEXT, preview_path TEXT)")
            cur.execute("ALTER TABLE documents ADD COLUMN IF NOT EXISTS preview_path TEXT")
            cur.execute("CREATE TABLE IF NOT EXISTS queries (id SERIAL PRIMARY KEY, collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id), question TEXT, response TEXT, sources_json TEXT, timestamp TIMESTAMP)")
            cur.execute("ALTER TABLE queries ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)")
            cur.execute("CREATE TABLE IF NOT EXISTS processing_jobs (collection_id INTEGER PRIMARY KEY, status TEXT, stage TEXT, step TEXT, progress INTEGER, details JSONB, updated_at TIMESTAMP DEFAULT NOW())")
            
        # 2. Migrations / Constraints (Can fail without rolling back table creation)
        with self.get_cursor(commit=True) as cur:
            # --- MIGRATION: Ensure email is unique and piv_id is nullable ---
            try:
                cur.execute("ALTER TABLE users ALTER COLUMN piv_id DROP NOT NULL")
            except Exception:
                pass # Already nullable or other issue

            try:
                # Deduplicate/Cleanup empty emails before adding unique constraint
                # If multiple users have email='', we set them to NULL
                cur.execute("UPDATE users SET email = NULL WHERE email = ''")
                # Add unique constraint to email if not exists
                cur.execute("ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email)")
            except Exception as e:
                logger.warning(f"Failed to apply email unique constraint: {e}")

    # --- Job Status Operations ---
    def upsert_job_status(self, collection_id: int, status: str, stage: str, step: str, progress: int, details: Dict = None):
        details_json = json.dumps(details) if details else "{}"
        with self.get_cursor(commit=True) as cur:
            if settings.EPHEMERAL_MODE:
                # SQLite ON CONFLICT syntax
                cur.execute(self._q("""
                    INSERT INTO processing_jobs (collection_id, status, stage, step, progress, details, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (collection_id) 
                    DO UPDATE SET 
                        status = EXCLUDED.status,
                        stage = EXCLUDED.stage,
                        step = EXCLUDED.step,
                        progress = EXCLUDED.progress,
                        details = EXCLUDED.details,
                        updated_at = CURRENT_TIMESTAMP
                """), (collection_id, status, stage, step, progress, details_json))
            else:
                cur.execute("""
                    INSERT INTO processing_jobs (collection_id, status, stage, step, progress, details, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (collection_id) 
                    DO UPDATE SET 
                        status = EXCLUDED.status,
                        stage = EXCLUDED.stage,
                        step = EXCLUDED.step,
                        progress = EXCLUDED.progress,
                        details = EXCLUDED.details,
                        updated_at = NOW()
                """, (collection_id, status, stage, step, progress, details_json))

    def get_job_status(self, collection_id: int) -> Optional[Dict]:
        with self.get_cursor() as cur:
            cur.execute(self._q("SELECT * FROM processing_jobs WHERE collection_id = %s"), (collection_id,))
            row = cur.fetchone()
            if row:
                res = dict(row)
                if isinstance(res['details'], str):
                    try:
                        res['details'] = json.loads(res['details'])
                    except:
                        res['details'] = {}
                return res
            return None

    def delete_job_status(self, collection_id: int):
        with self.get_cursor(commit=True) as cur:
            cur.execute(self._q("DELETE FROM processing_jobs WHERE collection_id = %s"), (collection_id,))

    def upsert_user(self, piv_id: Optional[str], display_name: str, organization: str, email: str = "") -> int:
        with self.get_cursor(commit=True) as cur:
            uid = None
            
            # 1. Try Lookup by Email (Priority for OAuth)
            if email:
                cur.execute(self._q("SELECT id FROM users WHERE email = %s"), (email,))
                res = cur.fetchone()
                if res:
                    uid = res['id']

            # 2. Try Lookup by PIV ID (Priority for CAC - fallback if email didn't match)
            if not uid and piv_id:
                cur.execute(self._q("SELECT id FROM users WHERE piv_id = %s"), (piv_id,))
                res = cur.fetchone()
                if res:
                    uid = res['id']
            
            # 3. Update or Insert
            if uid:
                # Update existing user
                # Only update PIV ID if provided and not currently set? Or overwrite? 
                # For now, we update fields provided.
                cur.execute(self._q("UPDATE users SET last_login=%s, display_name=%s, organization=%s WHERE id=%s"), 
                           (datetime.now(), display_name, organization, uid))
                
                # If we found by email but provided a piv_id, define it (linking CAC to OAuth account)
                if piv_id:
                     cur.execute(self._q("UPDATE users SET piv_id=%s WHERE id=%s AND piv_id IS NULL"), (piv_id, uid))
                
                return uid
            else:
                # Insert New User
                cur.execute(self._q("INSERT INTO users (piv_id, display_name, organization, email, last_login) VALUES (%s, %s, %s, %s, %s)"), 
                           (piv_id, display_name, organization, email, datetime.now()))
                
                if settings.EPHEMERAL_MODE:
                    return cur.lastrowid
                else:
                    # We need to fetch ID back. 
                    # If we have piv_id, use it lookup. If not, use email.
                    if piv_id:
                        cur.execute("SELECT id FROM users WHERE piv_id = %s", (piv_id,))
                    else:
                        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
                    return cur.fetchone()['id']

    def create_group(self, name: str, description: str, is_public: bool, owner_id: int) -> Tuple[int, str]:
        token = str(uuid.uuid4())
        with self.get_cursor(commit=True) as cur:
            cur.execute(self._q("INSERT INTO groups (name, description, owner_id, is_public, invite_token) VALUES (%s, %s, %s, %s, %s)"), 
                       (name, description, owner_id, is_public, token))
            gid = cur.lastrowid if settings.EPHEMERAL_MODE else None
            if not gid:
                cur.execute("SELECT id FROM groups WHERE invite_token = %s", (token,))
                gid = cur.fetchone()['id']
            cur.execute(self._q("INSERT INTO group_members (group_id, user_id) VALUES (%s, %s)"), (gid, owner_id))
            return gid, token

    def get_user_groups(self, user_id: int) -> List[Dict]:
        with self.get_cursor() as cur:
            cur.execute(self._q("""
                SELECT g.*, u.display_name as owner_name,
                (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) as member_count
                FROM groups g
                JOIN group_members gm ON g.id = gm.group_id
                JOIN users u ON g.owner_id = u.id
                WHERE gm.user_id = %s
                ORDER BY g.created_at DESC
            """), (user_id,))
            return [dict(r) for r in cur.fetchall()]

    def get_public_groups(self, user_id: int) -> List[Dict]:
        with self.get_cursor() as cur:
            cur.execute(self._q("""
                SELECT g.*, u.display_name as owner_name,
                (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) as member_count,
                EXISTS (SELECT 1 FROM group_members gm3 WHERE gm3.group_id = g.id AND gm3.user_id = %s) as is_member
                FROM groups g
                JOIN users u ON g.owner_id = u.id
                WHERE g.is_public = TRUE
                ORDER BY g.created_at DESC
            """), (user_id,))
            return [dict(r) for r in cur.fetchall()]
    
    def join_group_by_token(self, user_id: int, token: str) -> Optional[int]:
        with self.get_cursor(commit=True) as cur:
            cur.execute(self._q("SELECT id FROM groups WHERE invite_token = %s"), (token,))
            res = cur.fetchone()
            if not res: return None
            gid = res['id']
            
            try:
                cur.execute(self._q("INSERT INTO group_members (group_id, user_id) VALUES (%s, %s)"), (gid, user_id))
            except Exception as e:
                # Check for unique constraint violation (already a member)
                # Postgres: psycopg2.IntegrityError, SQLite: sqlite3.IntegrityError (caught as Exception)
                err_str = str(e).lower()
                is_integrity = isinstance(e, psycopg2.IntegrityError) or "unique constraint" in err_str or "duplicate key" in err_str
                
                if is_integrity:
                    logger.info(f"User {user_id} already in group {gid}, ignoring duplicate join via token.")
                    if hasattr(cur, 'connection'):
                        cur.connection.rollback()
                    return gid
                raise e

            return gid

    def join_group_by_id(self, user_id: int, group_id: int) -> bool:
        with self.get_cursor(commit=True) as cur:
            cur.execute(self._q("SELECT is_public FROM groups WHERE id = %s"), (group_id,))
            res = cur.fetchone()
            if not res or not res['is_public']: return False
            
            try:
                cur.execute(self._q("INSERT INTO group_members (group_id, user_id) VALUES (%s, %s)"), (group_id, user_id))
            except Exception as e:
                # Check for unique constraint violation (already a member)
                err_str = str(e).lower()
                is_integrity = isinstance(e, psycopg2.IntegrityError) or "unique constraint" in err_str or "duplicate key" in err_str
                
                if is_integrity:
                    logger.info(f"User {user_id} already in group {group_id}, ignoring duplicate join via ID.")
                    if hasattr(cur, 'connection'):
                        cur.connection.rollback()
                    return True
                raise e

            return True

    def delete_group(self, group_id: int, user_id: int) -> bool:
        with self.get_cursor(commit=True) as cur:
            cur.execute(self._q("SELECT id FROM groups WHERE id = %s AND owner_id = %s"), (group_id, user_id))
            if not cur.fetchone(): return False
            cur.execute(self._q("DELETE FROM groups WHERE id = %s"), (group_id,))
            return True

    def leave_group(self, group_id: int, user_id: int) -> bool:
        with self.get_cursor(commit=True) as cur:
            cur.execute(self._q("SELECT owner_id FROM groups WHERE id = %s"), (group_id,))
            res = cur.fetchone()
            if not res or res['owner_id'] == user_id: return False
            cur.execute(self._q("DELETE FROM group_members WHERE group_id = %s AND user_id = %s"), (group_id, user_id))
            return True

    def update_group(self, group_id: int, new_name: str, new_description: str, owner_id: int) -> bool:
        with self.get_cursor(commit=True) as cur:
            cur.execute(self._q("UPDATE groups SET name=%s, description=%s WHERE id=%s AND owner_id=%s"), 
                       (new_name, new_description, group_id, owner_id))
            return True # Simplified for ephemeral mode
        
    def create_collection(self, name: str, owner_id: int, group_id: Optional[int] = None) -> int:
        with self.get_cursor(commit=True) as cur:
            cur.execute(self._q("INSERT INTO collections (name, owner_id, group_id, created_at) VALUES (%s, %s, %s, %s)"), 
                       (name, owner_id, group_id, datetime.now()))
            if settings.EPHEMERAL_MODE: return cur.lastrowid
            cur.execute("SELECT id FROM collections ORDER BY id DESC LIMIT 1")
            return cur.fetchone()['id']
    
    def get_all_collections(self, user_id: int) -> List[Dict]:
        with self.get_cursor() as cur:
            cur.execute(self._q("""
                SELECT c.id, c.name, c.created_at, c.owner_id, c.group_id, u.display_name as owner_name, g.name as group_name, COUNT(d.id) as docs
                FROM collections c 
                LEFT JOIN documents d ON c.id=d.collection_id
                LEFT JOIN users u ON c.owner_id = u.id
                LEFT JOIN groups g ON c.group_id = g.id
                WHERE c.owner_id = %s OR c.group_id IN (SELECT group_id FROM group_members WHERE user_id = %s)
                GROUP BY c.id, c.name, c.created_at, c.owner_id, c.group_id, u.display_name, g.name
                ORDER BY c.created_at DESC
            """), (user_id, user_id))
            return [dict(r) for r in cur.fetchall()]

    def rename_collection(self, collection_id: int, new_name: str, owner_id: int) -> bool:
        with self.get_cursor(commit=True) as cur:
            cur.execute(self._q("UPDATE collections SET name=%s WHERE id=%s AND owner_id=%s"), (new_name, collection_id, owner_id))
            return True

    def delete_collection(self, collection_id: int, user_id: int) -> bool:
        with self.get_cursor(commit=True) as cur:
            cur.execute(self._q("DELETE FROM collections WHERE id=%s AND owner_id=%s"), (collection_id, user_id))
            return True

    def add_document_record(self, filename: str, vision_model: str, chart_dir: str, faiss_path: str, chunks_path: str, chart_descriptions: Any, collection_id: int, preview_path: str) -> int:
        desc_json = json.dumps(chart_descriptions) if isinstance(chart_descriptions, dict) else "{}"
        with self.get_cursor(commit=True) as cur:
            cur.execute(self._q("INSERT INTO documents (collection_id, original_filename, vision_model_used, timestamp, chart_dir, faiss_index_path, chunks_path, chart_descriptions_json, preview_path) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"), 
                       (collection_id, filename, vision_model, datetime.now(), chart_dir, faiss_path, chunks_path, desc_json, preview_path))
            if settings.EPHEMERAL_MODE: return cur.lastrowid
            cur.execute("SELECT id FROM documents ORDER BY id DESC LIMIT 1")
            return cur.fetchone()['id']

    def update_document_paths(self, doc_id: int, faiss_path: str, chunks_path: str):
        with self.get_cursor(commit=True) as cur:
            cur.execute(self._q("UPDATE documents SET faiss_index_path=%s, chunks_path=%s WHERE id=%s"), (faiss_path, chunks_path, doc_id))

    def get_collection_documents(self, collection_id: int) -> List[Dict]:
        with self.get_cursor() as cur:
            cur.execute(self._q("SELECT * FROM documents WHERE collection_id=%s ORDER BY original_filename ASC"), (collection_id,))
            rows = [dict(r) for r in cur.fetchall()]
            for row in rows:
                raw = row.get("chart_descriptions_json")
                row["chart_descriptions"] = json.loads(raw) if raw and isinstance(raw, str) else {}
            return rows

    def get_document_by_id(self, doc_id: int) -> Optional[Dict]:
        with self.get_cursor() as cur:
            cur.execute(self._q("SELECT * FROM documents WHERE id = %s"), (doc_id,))
            res = cur.fetchone()
            return dict(res) if res else None

    def get_document_ownership(self, doc_id: int) -> Optional[Dict]:
        with self.get_cursor() as cur:
            cur.execute(self._q("SELECT c.owner_id, c.id as collection_id FROM documents d JOIN collections c ON d.collection_id = c.id WHERE d.id = %s"), (doc_id,))
            res = cur.fetchone()
            return dict(res) if res else None

    def delete_document(self, doc_id: int):
        doc = self.get_document_by_id(doc_id)
        if doc and doc.get('preview_path') and os.path.exists(doc['preview_path']):
            try: os.remove(doc['preview_path'])
            except: pass
        with self.get_cursor(commit=True) as cur:
            cur.execute(self._q("DELETE FROM documents WHERE id=%s"), (doc_id,))

    def add_query_record(self, collection_id: int, user_id: int, question: str, response: str, sources: List):
        with self.get_cursor(commit=True) as cur:
            cur.execute(self._q("INSERT INTO queries (collection_id, user_id, question, response, sources_json, timestamp) VALUES (%s, %s, %s, %s, %s, %s)"), 
                       (collection_id, user_id, question, response, json.dumps(sources), datetime.now()))

    def get_queries_for_collection(self, collection_id: int, user_id: int) -> List[Dict]:
        with self.get_cursor() as cur:
            cur.execute(self._q("SELECT question, response, sources_json FROM queries WHERE collection_id=%s AND user_id=%s ORDER BY timestamp ASC"), (collection_id, user_id))
            results = [dict(r) for r in cur.fetchall()]
            for r in results:
                r['sources'] = json.loads(r['sources_json']) if isinstance(r['sources_json'], str) else []
                r['results'] = r['sources']
            return results