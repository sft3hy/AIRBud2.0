import os
import requests
from groq import Groq
from typing import List, Dict, Any
import json

class GroqClient:
    def __init__(self):
        self.client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

    def create_chat_completion(self, model: str, messages: list, temperature: float, max_tokens: int):
        # Groq returns a Pydantic object
        return self.client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

# Helper classes to make Dict responses look like Pydantic objects
class MockMessage:
    def __init__(self, content):
        self.content = content

class MockChoice:
    def __init__(self, content):
        self.message = MockMessage(content)

class MockResponse:
    def __init__(self, content):
        self.choices = [MockChoice(content)]

class SanctuaryClient:
    def __init__(
        self,
        api_key: str = None,
        base_url: str = "https://api-sanctuary.i2cv.io",
        model_name: str = "bedrock-claude-3-5-sonnet-v1",
    ):
        # FIX: Removed super().__init__(model_name)
        self.model_name = model_name
        self.api_key = api_key or os.environ.get("SANCTUARY_API_KEY")
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update(
            {"Content-Type": "application/json", "Authorization": f"Bearer {self.api_key}"}
        )

    def create_chat_completion(self, model: str, messages: List[Dict], temperature: float = 0.3, max_tokens: int = 1024) -> Any:
        payload = {
            "model": self.model_name, # Sanctuary uses its own model config
            "messages": messages,
            "temperature": temperature,
        }

        try:
            response = self.session.post(
                f"{self.base_url}/v1/chat/completions", json=payload
            )
            
            if not response.ok:
                print(f"Sanctuary API Error: {response.text}")
                # Fallback or raise
                return MockResponse("Error: Could not retrieve answer from Sanctuary.")

            data = response.json()
            
            # Extract content from typical OpenAI/Sanctuary JSON format
            # Usually: {'choices': [{'message': {'content': '...'}}]}
            try:
                content = data['choices'][0]['message']['content']
                return MockResponse(content)
            except (KeyError, IndexError):
                return MockResponse(str(data))

        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return MockResponse(f"Error calling API: {e}")