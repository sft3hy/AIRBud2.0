-- Run this in your Postgres pod to fix the "relation users does not exist" error immediately.
-- Command: psql -U rag_user -d rag_db -f repair_db.sql
-- (Or just copy-paste these lines into your psql session)

BEGIN;

CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, piv_id TEXT UNIQUE, display_name TEXT, organization TEXT, email TEXT UNIQUE, last_login TIMESTAMP, created_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS groups (id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT, owner_id INTEGER REFERENCES users(id), is_public BOOLEAN DEFAULT FALSE, invite_token TEXT UNIQUE, created_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS group_members (group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, joined_at TIMESTAMP DEFAULT NOW(), PRIMARY KEY (group_id, user_id));

CREATE TABLE IF NOT EXISTS collections (id SERIAL PRIMARY KEY, name TEXT, owner_id INTEGER REFERENCES users(id), group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE, created_at TIMESTAMP DEFAULT NOW());
-- Depending on version, referencing columns might need to be altering if table creation order was issues, but here referencing users(id) which exists.

CREATE TABLE IF NOT EXISTS documents (id SERIAL PRIMARY KEY, collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE, original_filename TEXT, vision_model_used TEXT, timestamp TIMESTAMP, chart_dir TEXT, faiss_index_path TEXT, chunks_path TEXT, chart_descriptions_json TEXT, preview_path TEXT);

CREATE TABLE IF NOT EXISTS queries (id SERIAL PRIMARY KEY, collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id), question TEXT, response TEXT, sources_json TEXT, timestamp TIMESTAMP);

CREATE TABLE IF NOT EXISTS processing_jobs (collection_id INTEGER PRIMARY KEY, status TEXT, stage TEXT, step TEXT, progress INTEGER, details JSONB, updated_at TIMESTAMP DEFAULT NOW());

-- Migration to make piv_id optional (for OAuth users)
ALTER TABLE users ALTER COLUMN piv_id DROP NOT NULL;

COMMIT;
