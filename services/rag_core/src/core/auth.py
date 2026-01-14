import re
from fastapi import Request, HTTPException
from typing import Optional, Dict
from src.config import settings
from src.utils.db import DatabaseManager
from src.utils.logger import logger

class AuthHandler:
    def __init__(self):
        self.db = DatabaseManager()

    def _format_friendly_name(self, raw_cn: str) -> str:
        """
        Converts CAC format 'LAST.FIRST.MIDDLE.12345' -> 'First Last'.
        """
        if not raw_cn:
            return "Unknown User"

        # 1. Split by '.'
        parts = raw_cn.split('.')
        
        # 2. Filter out the EDIPI (pure digits usually at the end)
        name_parts = [p for p in parts if not p.isdigit()]
        
        # 3. Reformat
        # Standard DoD is LAST.FIRST.MIDDLE
        if len(name_parts) >= 2:
            last = name_parts[0].lower().capitalize()
            first = name_parts[1].lower().capitalize()
            return f"{first} {last}"
        
        # Fallback: Title case whatever is there
        return raw_cn.replace('.', ' ').title()

    def get_current_user(self, request: Request) -> Dict:
        """
        Parses headers and returns a standardized User object.
        """
        
        # 1. TEST MODE
        if settings.TEST_MODE:
            return self._upsert_mock_user()

        # 2. PROD MODE
        subject_dn = request.headers.get("X-Subject-DN")
        verify_result = request.headers.get("X-Client-Verify")

        if verify_result != "SUCCESS":
            logger.warning(f"Auth Failed | Result: {verify_result} | DN: {subject_dn}")
            return {
                "id": 0, 
                "piv_id": "0", 
                "cn": "Guest", 
                "org": "Unauthenticated"
            }

        # Parse the DN to get raw attributes
        user_info = self._parse_dn(subject_dn)
        
        # FORMATTING STEP: Clean the CN for display
        friendly_name = self._format_friendly_name(user_info['cn'])

        # Upsert into DB (Stores the Clean Name)
        user_id = self.db.upsert_user(
            user_info['piv_id'], 
            friendly_name, 
            user_info['org']
        )
        
        return {
            "id": user_id,
            "piv_id": user_info['piv_id'],
            "cn": friendly_name,       # Frontend receives "First Last"
            "org": user_info['org']
        }

    def require_user(self, request: Request) -> Dict:
        user = self.get_current_user(request)
        if user["id"] == 0:
            logger.warning(f"Unauthorized access attempt to {request.url.path}")
            raise HTTPException(status_code=403, detail="Smart Card Required")
        return user

    def _upsert_mock_user(self):
        # Mock Data (Format matches raw CAC for testing the cleaner)
        piv_id = "1000000001"
        raw_cn = "DOE.JOHN.TEST.1000000001" 
        organization = "U.S. GOVERNMENT"
        
        # Clean it
        friendly_name = self._format_friendly_name(raw_cn)
        
        user_id = self.db.upsert_user(piv_id, friendly_name, organization)
        
        return {
            "id": user_id, 
            "piv_id": piv_id, 
            "cn": friendly_name, 
            "org": organization
        }

    def _parse_dn(self, dn: str) -> Dict:
        """
        Extracts raw attributes from DN string.
        """
        data = {}
        if not dn: return {"piv_id": "0", "cn": "Unknown User", "org": "Unknown"}

        # Regex to handle comma separators inside values vs delimiters
        pattern = r'([a-zA-Z\.]+)\s*=\s*([^,/]+)'
        matches = re.findall(pattern, dn)
        
        for key, val in matches:
            data[key.upper()] = val.strip()
            
        cn = data.get('CN', 'Unknown User')
        org = data.get('O', 'Unknown Org')
        
        # Extract EDIPI/PivID from raw CN (digits at end)
        # Ex: "LAST.FIRST.12345" -> "12345"
        piv_id = cn
        if '.' in cn:
            parts = cn.split('.')
            if parts[-1].isdigit():
                piv_id = parts[-1]

        return {
            "piv_id": piv_id,
            "cn": cn, # Return RAW CN here, clean it later
            "org": org
        }

auth_handler = AuthHandler()