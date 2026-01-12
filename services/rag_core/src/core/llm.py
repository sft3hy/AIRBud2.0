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


class GroqClient(BaseLLMClient):
    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)

    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> LLMResponse:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            resp = self.client.chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",  # Default for Groq
                messages=messages,
                temperature=0.1,
                max_tokens=1024,
            )
            return LLMResponse(content=resp.choices[0].message.content)
        except Exception as e:
            logger.error(f"Groq API Error: {e}")
            return LLMResponse(content="", error=str(e))


class SanctuaryClient(BaseLLMClient):
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
            "max_tokens": 1024,
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        try:
            resp = requests.post(
                f"{self.base_url}/chat/completions", json=payload, headers=headers
            )
            if not resp.ok:
                return LLMResponse(
                    content="", error=f"Status {resp.status_code}: {resp.text}"
                )

            data = resp.json()
            return LLMResponse(content=data["choices"][0]["message"]["content"])
        except Exception as e:
            logger.error(f"Sanctuary API Error: {e}")
            return LLMResponse(content="", error=str(e))


def get_llm_client() -> BaseLLMClient:
    if settings.LLM_PROVIDER == "groq" and settings.GROQ_API_KEY:
        return GroqClient()
    return SanctuaryClient()
