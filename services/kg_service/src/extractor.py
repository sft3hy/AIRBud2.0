import json
import requests
from groq import Groq
from typing import List, Dict, Any
from .config import settings

class GraphExtractor:
    def __init__(self):
        if settings.LLM_PROVIDER == "groq":
            self.client = Groq(api_key=settings.GROQ_API_KEY)
        else:
            self.api_key = settings.SANCTUARY_API_KEY
            self.base_url = "https://api-sanctuary.i2cv.io/v1"

    def extract_triples(self, text: str) -> List[Dict[str, str]]:
        system_prompt = """You are a Knowledge Graph expert. 
Extract entities (nodes) and relationships (edges) from the provided text.
Return JSON ONLY in this format:
{
  "triples": [
    {"subject": "Entity1", "type": "Person", "predicate": "WORKS_FOR", "object": "Entity2", "object_type": "Company"},
    ...
  ]
}
Rules:
1. Simplify entity names (e.g., "Elon Musk" instead of "Mr. Musk").
2. Use UPPER_CASE for predicates (e.g., "LOCATED_IN", "HAS_PART").
3. Avoid generic entities like "The Document" or "It".
"""
        
        try:
            content = self._call_llm(system_prompt, text)
            # Clean potential markdown
            content = content.replace("```json", "").replace("```", "").strip()
            data = json.loads(content)
            return data.get("triples", [])
        except Exception as e:
            print(f"Extraction Error: {e}")
            return []

    def _call_llm(self, system: str, user: str) -> str:
        if settings.LLM_PROVIDER == "groq":
            resp = self.client.chat.completions.create(
                model=settings.MODEL_NAME,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                temperature=0.1,
                response_format={"type": "json_object"} # Groq JSON mode
            )
            return resp.choices[0].message.content
        else:
            # Sanctuary / Generic OpenAI compatible
            headers = {"Authorization": f"Bearer {self.api_key}"}
            payload = {
                "model": settings.MODEL_NAME,
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                "temperature": 0.1
            }
            resp = requests.post(f"{self.base_url}/chat/completions", json=payload, headers=headers)
            return resp.json()['choices'][0]['message']['content']