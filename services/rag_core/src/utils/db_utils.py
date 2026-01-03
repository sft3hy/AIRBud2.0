import sqlite3
import json
import os
from datetime import datetime

class DatabaseManager:
    def __init__(self, db_path="data/history.db"):
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._init_db()

    def _init_db(self):
        cur = self.conn.cursor()
        cur.execute("""CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_name TEXT,
            timestamp DATETIME
        )""")
        cur.execute("""CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER,
            original_filename TEXT,
            vision_model_used TEXT,
            timestamp DATETIME,
            chart_dir TEXT,
            faiss_index_path TEXT,
            chunks_path TEXT,
            chart_descriptions_json TEXT
        )""")
        cur.execute("""CREATE TABLE IF NOT EXISTS queries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER,
            question TEXT,
            response TEXT,
            sources_json TEXT,
            timestamp DATETIME
        )""")
        self.conn.commit()

    def create_session(self, filenames):
        name = filenames[0] if len(filenames) == 1 else f"{filenames[0]} + {len(filenames)-1}"
        cur = self.conn.cursor()
        cur.execute("INSERT INTO sessions (session_name, timestamp) VALUES (?, ?)", 
                   (name, datetime.now()))
        self.conn.commit()
        return cur.lastrowid

    def add_document_record(self, filename, vision_model, chart_dir, faiss_path, chunks_path, chart_descriptions, session_id):
        cur = self.conn.cursor()
        # Ensure chart_descriptions is a string before saving
        desc_json = json.dumps(chart_descriptions) if isinstance(chart_descriptions, dict) else chart_descriptions
        
        cur.execute("""INSERT INTO documents 
            (session_id, original_filename, vision_model_used, timestamp, chart_dir, faiss_index_path, chunks_path, chart_descriptions_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (session_id, filename, vision_model, datetime.now(), chart_dir, faiss_path, chunks_path, desc_json))
        self.conn.commit()
        return cur.lastrowid

    def update_document_paths(self, doc_id, faiss_path, chunks_path):
        self.conn.execute("UPDATE documents SET faiss_index_path=?, chunks_path=? WHERE id=?", 
                         (faiss_path, chunks_path, doc_id))
        self.conn.commit()

    def add_query_record(self, session_id, question, response, sources):
        self.conn.execute("INSERT INTO queries (session_id, question, response, sources_json, timestamp) VALUES (?, ?, ?, ?, ?)",
                         (session_id, question, response, json.dumps(sources), datetime.now()))
        self.conn.commit()

    def get_all_sessions(self):
        return self.conn.execute("SELECT s.id, s.session_name, s.timestamp, COUNT(d.id) FROM sessions s LEFT JOIN documents d ON s.id=d.session_id GROUP BY s.id ORDER BY s.timestamp DESC").fetchall()

    def get_session_documents(self, session_id):
        cur = self.conn.execute("SELECT * FROM documents WHERE session_id=?", (session_id,))
        # Get column names
        cols = [description[0] for description in cur.description]
        
        results = []
        for row in cur.fetchall():
            doc = dict(zip(cols, row))
            
            # PARSING LOGIC: Ensure descriptions are a dictionary
            raw_desc = doc.get("chart_descriptions_json", "{}")
            if not raw_desc:
                raw_desc = "{}"
                
            try:
                if isinstance(raw_desc, str):
                    doc["chart_descriptions"] = json.loads(raw_desc)
                else:
                    doc["chart_descriptions"] = raw_desc
            except Exception as e:
                print(f"Error parsing JSON for doc {doc.get('id')}: {e}")
                doc["chart_descriptions"] = {}
                
            results.append(doc)
            
        return results

    def get_queries_for_session(self, session_id):
        cur = self.conn.execute("SELECT question, response, sources_json FROM queries WHERE session_id=? ORDER BY timestamp ASC", (session_id,))
        return [{"question": r[0], "response": r[1], "sources": json.loads(r[2])} for r in cur.fetchall()]