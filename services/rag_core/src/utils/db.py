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
        """Initialize connection pool with retry logic."""
        retries = 5
        while retries > 0:
            try:
                self.pool = psycopg2.pool.ThreadedConnectionPool(
                    1,
                    10,  # Min 1, Max 10 connections
                    host=settings.DB_HOST,
                    user=settings.DB_USER,
                    password=settings.DB_PASSWORD,
                    dbname=settings.DB_NAME,
                    port=settings.DB_PORT,
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
        """Context manager for getting a cursor from the pool."""
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
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    id SERIAL PRIMARY KEY,
                    session_name TEXT,
                    timestamp TIMESTAMP
                )
            """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS documents (
                    id SERIAL PRIMARY KEY,
                    session_id INTEGER,
                    original_filename TEXT,
                    vision_model_used TEXT,
                    timestamp TIMESTAMP,
                    chart_dir TEXT,
                    faiss_index_path TEXT,
                    chunks_path TEXT,
                    chart_descriptions_json TEXT
                )
            """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS queries (
                    id SERIAL PRIMARY KEY,
                    session_id INTEGER,
                    question TEXT,
                    response TEXT,
                    sources_json TEXT,
                    timestamp TIMESTAMP
                )
            """
            )

    # --- Session Operations ---
    def create_session(self, filenames):
        name = (
            filenames[0]
            if len(filenames) == 1
            else f"{filenames[0]} + {len(filenames)-1}"
        )
        with self.get_cursor(commit=True) as cur:
            cur.execute(
                "INSERT INTO sessions (session_name, timestamp) VALUES (%s, %s) RETURNING id",
                (name, datetime.now()),
            )
            return cur.fetchone()["id"]

    def get_all_sessions(self):
        with self.get_cursor() as cur:
            cur.execute(
                """
                SELECT s.id, s.session_name, s.timestamp, COUNT(d.id) as docs
                FROM sessions s 
                LEFT JOIN documents d ON s.id=d.session_id 
                GROUP BY s.id, s.session_name, s.timestamp 
                ORDER BY s.timestamp DESC
            """
            )
            return cur.fetchall()

    # --- Document Operations ---
    def add_document_record(
        self,
        filename,
        vision_model,
        chart_dir,
        faiss_path,
        chunks_path,
        chart_descriptions,
        session_id,
    ):
        desc_json = (
            json.dumps(chart_descriptions)
            if isinstance(chart_descriptions, dict)
            else chart_descriptions
        )

        with self.get_cursor(commit=True) as cur:
            cur.execute(
                """
                INSERT INTO documents 
                (session_id, original_filename, vision_model_used, timestamp, chart_dir, faiss_index_path, chunks_path, chart_descriptions_json)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """,
                (
                    session_id,
                    filename,
                    vision_model,
                    datetime.now(),
                    chart_dir,
                    faiss_path,
                    chunks_path,
                    desc_json,
                ),
            )
            return cur.fetchone()["id"]

    def update_document_paths(self, doc_id, faiss_path, chunks_path):
        with self.get_cursor(commit=True) as cur:
            cur.execute(
                "UPDATE documents SET faiss_index_path=%s, chunks_path=%s WHERE id=%s",
                (faiss_path, chunks_path, doc_id),
            )

    def get_session_documents(self, session_id):
        with self.get_cursor() as cur:
            cur.execute("SELECT * FROM documents WHERE session_id=%s", (session_id,))
            rows = cur.fetchall()

            # Clean up JSON fields
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

    # --- Query History ---
    def add_query_record(self, session_id, question, response, sources):
        with self.get_cursor(commit=True) as cur:
            cur.execute(
                "INSERT INTO queries (session_id, question, response, sources_json, timestamp) VALUES (%s, %s, %s, %s, %s)",
                (session_id, question, response, json.dumps(sources), datetime.now()),
            )

    def get_queries_for_session(self, session_id):
        with self.get_cursor() as cur:
            cur.execute(
                "SELECT question, response, sources_json FROM queries WHERE session_id=%s ORDER BY timestamp ASC",
                (session_id,),
            )
            results = cur.fetchall()
            for r in results:
                if isinstance(r["sources_json"], str):
                    r["sources"] = json.loads(r["sources_json"])
                    r["results"] = r["sources"]  # Alias for frontend compatibility
            return results
