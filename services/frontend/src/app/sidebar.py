import streamlit as st
import os
import shutil
from src.api_client import get_sessions, create_session, process_document


def display_sidebar():
    with st.sidebar:
        st.header("🗂️ Session Manager")

        # Load Sessions
        sessions = get_sessions()
        options = ["✨ Start New Session"] + [
            f"{s['id']} - {s['name']} ({s['date']})" for s in sessions
        ]

        choice = st.selectbox("Select Session", options)

        if choice == "✨ Start New Session":
            st.session_state.session_id = None
            display_uploader()
        else:
            # Parse ID from string "123 - Name..."
            s_id = int(choice.split(" - ")[0])
            if st.session_state.session_id != s_id:
                st.session_state.session_id = s_id
                st.session_state.chat_history = []  # Will reload on refresh
                st.rerun()

        st.divider()
        st.markdown("### Settings")
        st.session_state.selected_vision_model = st.selectbox(
            "Vision Model",
            [
                "Moondream2",
                "Qwen3-VL-2B",
                "InternVL3.5-1B",
                "Ollama-Gemma3",
                "Ollama-Granite3.2-Vision",
            ],
        )


def display_uploader():
    uploaded_files = st.file_uploader(
        "Upload Documents", type=["pdf", "docx", "pptx"], accept_multiple_files=True
    )

    if uploaded_files and st.button("🚀 Process Documents"):
        with st.spinner("Initializing..."):
            filenames = [f.name for f in uploaded_files]
            session_id = create_session(filenames)
            st.session_state.session_id = session_id

            # Save files to shared volume
            # In Docker compose, we map ./data/uploads to /app/data/uploads
            upload_dir = "/app/data/uploads"
            os.makedirs(upload_dir, exist_ok=True)

            progress_bar = st.progress(0)

            for idx, file in enumerate(uploaded_files):
                file_path = os.path.join(upload_dir, file.name)
                with open(file_path, "wb") as f:
                    f.write(file.getvalue())

                st.text(f"Processing {file.name}...")
                res = process_document(
                    session_id, file.name, st.session_state.selected_vision_model
                )

                if "error" in res:
                    st.error(f"Error processing {file.name}: {res['error']}")

                progress_bar.progress((idx + 1) / len(uploaded_files))

            st.success("Processing Complete!")
            st.rerun()
