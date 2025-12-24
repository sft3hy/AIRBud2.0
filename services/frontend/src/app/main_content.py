import streamlit as st
from src.api_client import query_system, get_history
import os
from pathlib import Path


def display_main_content():
    if not st.session_state.session_id:
        st.title("👋 Welcome to Smart RAG")
        st.write("Please start a new session or load an existing one from the sidebar.")
        return

    # Load history if empty
    if not st.session_state.chat_history:
        st.session_state.chat_history = get_history(st.session_state.session_id)

    # Display Chat
    for msg in st.session_state.chat_history:
        with st.chat_message("user"):
            st.write(msg["question"])
        with st.chat_message("assistant"):
            st.write(msg["response"])
            if "sources" in msg and msg["sources"]:
                with st.expander("View Sources"):
                    for s in msg["sources"]:
                        st.markdown(f"**Source:** {s['source']} (Page {s['page']})")
                        st.markdown(f"_{s['text'][:300]}..._")

    # Input
    if prompt := st.chat_input("Ask a question about your documents..."):
        with st.chat_message("user"):
            st.write(prompt)

        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                result = query_system(st.session_state.session_id, prompt)

                if "error" in result:
                    st.error(result["error"])
                else:
                    response = result.get("response", "No response generated.")
                    st.write(response)

                    # Update local state
                    st.session_state.chat_history.append(
                        {
                            "question": prompt,
                            "response": response,
                            "sources": result.get("results", []),
                        }
                    )
