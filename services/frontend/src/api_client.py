import requests
import os
import streamlit as st

API_URL = os.environ.get("RAG_API_URL", "http://rag_core:8000")


def get_sessions():
    try:
        resp = requests.get(f"{API_URL}/sessions")
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        st.error(f"Failed to connect to RAG API: {e}")
    return []


def create_session(filenames):
    try:
        resp = requests.post(f"{API_URL}/sessions", json={"filenames": filenames})
        if resp.status_code == 200:
            return resp.json()["session_id"]
    except Exception as e:
        st.error(f"Error creating session: {e}")
    return None


def process_document(session_id, filename, vision_model):
    payload = {
        "session_id": session_id,
        "filename": filename,
        "vision_model": vision_model,
    }
    try:
        # Use a long timeout for processing
        resp = requests.post(f"{API_URL}/process", json=payload, timeout=600)
        return resp.json()
    except Exception as e:
        return {"error": str(e)}


def query_system(session_id, question):
    payload = {"session_id": session_id, "question": question}
    try:
        resp = requests.post(f"{API_URL}/query", json=payload, timeout=120)
        return resp.json()
    except Exception as e:
        return {"error": str(e)}


def get_history(session_id):
    try:
        resp = requests.get(f"{API_URL}/sessions/{session_id}/history")
        if resp.status_code == 200:
            return resp.json()
    except:
        pass
    return []
