import time
import json
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
            # --- NEW: Users Table ---
            # piv_id is the unique identifier from the smart card (EDIPI or UUID)
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

            # Collections (Updated with user_id)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS collections (
                    id SERIAL PRIMARY KEY,
                    name TEXT,
                    owner_id INTEGER REFERENCES users(id), -- Link to User
                    created_at TIMESTAMP
                )
            """)
            
            cur.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    id SERIAL PRIMARY KEY,
                    collection_id INTEGER,
                    original_filename TEXT,
                    vision_model_used TEXT,
                    timestamp TIMESTAMP,
                    chart_dir TEXT,
                    faiss_index_path TEXT,
                    chunks_path TEXT,
                    chart_descriptions_json TEXT
                )
            """)
            
            cur.execute("""
                CREATE TABLE IF NOT EXISTS queries (
                    id SERIAL PRIMARY KEY,
                    collection_id INTEGER,
                    question TEXT,
                    response TEXT,
                    sources_json TEXT,
                    timestamp TIMESTAMP
                )
            """)

    # --- User Operations ---
    def upsert_user(self, piv_id, display_name, organization, email=""):
        """
        Inserts a new user or updates the last_login if they exist.
        Returns the user ID.
        """
        with self.get_cursor(commit=True) as cur:
            # Check if exists
            cur.execute("SELECT id FROM users WHERE piv_id = %s", (piv_id,))
            res = cur.fetchone()
            
            if res:
                uid = res['id']
                cur.execute("UPDATE users SET last_login=%s WHERE id=%s", (datetime.now(), uid))
                return uid
            else:
                cur.execute("""
                    INSERT INTO users (piv_id, display_name, organization, email, last_login)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (piv_id, display_name, organization, email, datetime.now()))
                return cur.fetchone()['id']

    def get_user_by_id(self, uid):
        with self.get_cursor() as cur:
            cur.execute("SELECT * FROM users WHERE id = %s", (uid,))
            return cur.fetchone()

    # --- Collection Operations (Updated with Owner) ---
    def create_collection(self, name, owner_id):
        with self.get_cursor(commit=True) as cur:
            cur.execute(
                "INSERT INTO collections (name, owner_id, created_at) VALUES (%s, %s, %s) RETURNING id",
                (name, owner_id, datetime.now())
            )
            return cur.fetchone()['id']
    
    def get_all_collections(self, owner_id=None):
        # In a real secure app, we'd filter by owner_id. 
        # For now, we list all but show ownership.
        with self.get_cursor() as cur:
            cur.execute("""
                SELECT c.id, c.name, c.created_at, c.owner_id, u.display_name as owner_name, COUNT(d.id) as docs
                FROM collections c 
                LEFT JOIN documents d ON c.id=d.collection_id
                LEFT JOIN users u ON c.owner_id = u.id
                GROUP BY c.id, c.name, c.created_at, c.owner_id, u.display_name
                ORDER BY c.created_at DESC
            """)
            return cur.fetchall()

    # ... (Rest of functions: rename, delete, add_document, etc. remain the same) ...
    def rename_collection(self, collection_id, new_name):
        with self.get_cursor(commit=True) as cur:
            cur.execute("UPDATE collections SET name=%s WHERE id=%s", (new_name, collection_id))

    def delete_collection(self, collection_id):
        with self.get_cursor(commit=True) as cur:
            cur.execute("DELETE FROM queries WHERE collection_id=%s", (collection_id,))
            cur.execute("DELETE FROM documents WHERE collection_id=%s", (collection_id,))
            cur.execute("DELETE FROM collections WHERE id=%s", (collection_id,))

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

    def delete_document(self, doc_id):
        with self.get_cursor(commit=True) as cur:
            cur.execute("DELETE FROM documents WHERE id=%s", (doc_id,))

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

    def add_query_record(self, collection_id, question, response, sources):
        with self.get_cursor(commit=True) as cur:
            cur.execute(
                "INSERT INTO queries (collection_id, question, response, sources_json, timestamp) VALUES (%s, %s, %s, %s, %s)",
                (collection_id, question, response, json.dumps(sources), datetime.now())
            )

    def get_queries_for_collection(self, collection_id):
        with self.get_cursor() as cur:
            cur.execute(
                "SELECT question, response, sources_json FROM queries WHERE collection_id=%s ORDER BY timestamp ASC",
                (collection_id,)
            )
            results = cur.fetchall()
            for r in results:
                if isinstance(r['sources_json'], str):
                    r['sources'] = json.loads(r['sources_json'])
                    r['results'] = r['sources']
            return results