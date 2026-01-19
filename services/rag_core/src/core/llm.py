import httpx
from groq import AsyncGroq
from typing import Optional, Dict, Any
from abc import ABC, abstractmethod
from src.config import settings
from src.utils.logger import logger

class LLMResponse:
    __slots__ = ['content', 'error', 'meta']
    
    def __init__(self, content: str, error: Optional[str] = None, meta: Optional[Dict[str, Any]] = None):
        self.content = content
        self.error = error
        self.meta = meta or {}

class BaseLLMClient(ABC):
    """
    Abstract Base Class for LLM implementations.
    Enforces Async I/O for scalability.
    """
    
    @abstractmethod
    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> LLMResponse:
        pass

    async def reword_query(self, original_query: str) -> str:
        """
        Rewrites a user query to be optimized for Vector Search and Knowledge Graph retrieval.
        """
        if not original_query or not original_query.strip():
            return ""

        if len(original_query) > 2000:
            logger.warning("Query too long for rewording, truncating safely.")
            original_query = original_query[:2000]

        system_prompt = (
            "You are a Query Optimization Expert for a RAG system. "
            "Your goal is to rewrite the user's raw query into a precise, semantically dense search query.\n"
            "1. Remove conversational filler (e.g., 'I was wondering if you could tell me...').\n"
            "2. Resolve ambiguous references if possible.\n"
            "3. Focus on entities, specific terminology, and relationships.\n"
            "4. Do NOT answer the question. Output ONLY the rewritten query text."
        )
        
        response = await self.generate(original_query, system_prompt)
        
        if response.error or not response.content:
            logger.warning(f"Query rewording failed: {response.error}. Using original.")
            return original_query
            
        cleaned = response.content.strip().replace('"', '')
        logger.debug(f"Query Reworded: '{original_query}' -> '{cleaned}'")
        return cleaned

class GroqClient(BaseLLMClient):
    """
    Client for Groq API using the official AsyncGroq SDK.
    """
    def __init__(self):
        self.client = None
        self.model = settings.GEN_MODEL_NAME
        self.timeout = 30.0
        
        # Initialize client immediately
        api_key = settings.GROQ_API_KEY
        if not api_key:
            logger.error("GROQ_API_KEY is missing from configuration. LLM calls will fail.")
        else:
            try:
                self.client = AsyncGroq(api_key=api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Groq Client: {e}")

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> LLMResponse:
        if not self.client:
            return LLMResponse(content="", error="Groq Client not initialized (Missing API Key?)")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            resp = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.1,
                max_tokens=1024,
                timeout=self.timeout
            )
            return LLMResponse(content=resp.choices[0].message.content)
        except Exception as e:
            logger.error(f"Groq API Error: {e}")
            return LLMResponse(content="", error=str(e))

class SanctuaryClient(BaseLLMClient):
    """
    Client for Sanctuary (Private/On-Prem style) API.
    """
    def __init__(self):
        self.api_key = settings.SANCTUARY_API_KEY
        self.base_url = "https://api-sanctuary.i2cv.io/v1"
        self.model = settings.GEN_MODEL_NAME
        
        if not self.api_key:
             logger.error("SANCTUARY_API_KEY is missing. LLM calls will fail.")

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> LLMResponse:
        if not self.api_key:
            return LLMResponse(content="", error="Sanctuary API Key missing")

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
            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(f"{self.base_url}/chat/completions", json=payload, headers=headers)
                
                if resp.status_code != 200:
                    return LLMResponse(content="", error=f"Status {resp.status_code}: {resp.text}")
                
                data = resp.json()
                content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
                
                if not content:
                     return LLMResponse(content="", error="Empty response from provider")

                return LLMResponse(content=content)

        except Exception as e:
            logger.error(f"Sanctuary API Error: {e}")
            return LLMResponse(content="", error=str(e))

# Singleton instance
_llm_instance: Optional[BaseLLMClient] = None

def get_llm_client() -> BaseLLMClient:
    global _llm_instance
    if _llm_instance is None:
        if settings.LLM_PROVIDER == "groq":
            _llm_instance = GroqClient()
        else:
            _llm_instance = SanctuaryClient()
    return _llm_instance