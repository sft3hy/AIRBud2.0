import os
import requests
from groq import Groq
from typing import List, Dict, Any, Optional
from src.config import settings
from src.utils.logger import logger

class LLMResponse:
    def __init__(self, content: str, error: Optional[str] = None):
        self.content = content
        self.error = error

class BaseLLMClient:
    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> LLMResponse:
        raise NotImplementedError

    # --- NEW METHOD ---
    def reword_query(self, original_query: str) -> str:
        """
        Rewrites a user query to be optimized for Vector Search and Knowledge Graph retrieval.
        """
        system_prompt = """You are a Query Optimization Expert for a RAG system. 
Your goal is to rewrite the user's raw query into a precise, semantically dense search query.
1. Remove conversational filler (e.g., "I was wondering if you could tell me...").
2. Resolve ambiguous references if possible.
3. Focus on entities, specific terminology, and relationships.
4. Do NOT answer the question. output ONLY the rewritten query text.
"""
        # Call the implementation's generate method
        response = self.generate(original_query, system_prompt)
        
        if response.error or not response.content:
            logger.warning(f"Query rewording failed: {response.error}. Using original.")
            return original_query
            
        cleaned = response.content.strip().replace('"', '')
        logger.info(f"Query Reworded: '{original_query}' -> '{cleaned}'")
        return cleaned

class GroqClient(BaseLLMClient):
    # ... (Keep existing __init__ and generate methods) ...
    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = settings.GEN_MODEL_NAME

    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> LLMResponse:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            resp = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.1,
                max_tokens=1024,
            )
            return LLMResponse(content=resp.choices[0].message.content)
        except Exception as e:
            logger.error(f"Groq API Error: {e}")
            return LLMResponse(content="", error=str(e))

class SanctuaryClient(BaseLLMClient):
    # ... (Keep existing __init__ and generate methods) ...
    def __init__(self):
        self.api_key = settings.SANCTUARY_API_KEY
        self.base_url = "https://api-sanctuary.i2cv.io/v1"
        self.model = settings.GEN_MODEL_NAME

    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> LLMResponse:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.1,
            "max_tokens": 1024
        }
        
        headers = {
            "Content-Type": "application/json", 
            "Authorization": f"Bearer {self.api_key}"
        }

        try:
            resp = requests.post(f"{self.base_url}/chat/completions", json=payload, headers=headers)
            if not resp.ok:
                return LLMResponse(content="", error=f"Status {resp.status_code}: {resp.text}")
            
            data = resp.json()
            return LLMResponse(content=data['choices'][0]['message']['content'])
        except Exception as e:
            logger.error(f"Sanctuary API Error: {e}")
            return LLMResponse(content="", error=str(e))

def get_llm_client() -> BaseLLMClient:
    if settings.LLM_PROVIDER == "groq":
        return GroqClient()
    return SanctuaryClient()