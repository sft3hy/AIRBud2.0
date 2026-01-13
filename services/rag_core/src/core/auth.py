import re
from fastapi import Request, HTTPException
from typing import Optional, Dict
from src.config import settings
from src.utils.db import DatabaseManager
from src.utils.logger import logger

class AuthHandler:
    def __init__(self):
        self.db = DatabaseManager()

    def get_current_user(self, request: Request) -> Dict:
        """
        Parses headers and returns a standardized User object.
        Keys: id, piv_id, display_name, organization
        """
        
        # 1. TEST MODE (Mock Data)
        if settings.TEST_MODE:
            return self._upsert_mock_user()

        # 2. PROD MODE (Real CAC)
        subject_dn = request.headers.get("X-Subject-DN")
        verify_result = request.headers.get("X-Client-Verify")

        # Log for debugging
        if verify_result != "SUCCESS":
            logger.warning(f"Auth Failed | Result: {verify_result} | DN: {subject_dn}")
            # Return Guest ID 0 to trigger Login Page
            return {
                "id": 0, 
                "piv_id": "0", 
                "cn": "Guest", 
                "org": "Unauthenticated"
            }

        logger.info(f"Auth Success | Raw DN: {subject_dn}")

        # Parse the messy DN string
        user_info = self._parse_dn(subject_dn)
        
        # Fallback if parsing failed
        if user_info['cn'] == "Unknown User":
             user_info['cn'] = subject_dn[:50] # Use raw string if regex fails

        # Upsert into DB
        user_id = self.db.upsert_user(
            user_info['piv_id'], 
            user_info['cn'], 
            user_info['org']
        )
        
        # STANDARDIZED RETURN
        # Map 'cn' -> 'display_name' and 'org' -> 'organization' to match Mock/Frontend
        return {
            "id": user_id,
            "piv_id": user_info['piv_id'],
            "cn": user_info['cn'],       # <--- Mapped here
            "org": user_info['org']       # <--- Mapped here
        }

    def require_user(self, request: Request) -> Dict:
        """
        Dependency for protected routes. Raises 403 if user is Guest.
        """
        user = self.get_current_user(request)
        if user["id"] == 0:
            logger.warning(f"Unauthorized access attempt to {request.url.path}")
            raise HTTPException(status_code=403, detail="Smart Card Required")
        return user

    def _upsert_mock_user(self):
        """
        Creates a mock user that mimics the structure of a real CAC card.
        """
        piv_id = "1000000001"
        # Standard format: LAST.FIRST.MIDDLE.ID
        display_name = "DOE.JOHN.TEST.1000000001" 
        organization = "U.S. GOVERNMENT"
        
        user_id = self.db.upsert_user(piv_id, display_name, organization)
        
        return {
            "id": user_id, 
            "piv_id": piv_id, 
            "cn": display_name, 
            "org": organization
        }

    def _parse_dn(self, dn: str) -> Dict:
        """
        Robustly parses X.509 DN strings.
        Handles: "CN=Name, O=Org" AND "/C=US/cn=Name" (Mixed case, slashes, commas)
        """
        data = {}
        if not dn: return {"piv_id": "0", "cn": "Unknown User", "org": "Unknown"}

        # Regex explanation:
        # ([a-zA-Z\.]+)  -> Capture Key (letters/dots), e.g., "CN" or "emailAddress"
        # \s*=\s*        -> Match equals sign with optional spaces
        # ([^,/]+)       -> Capture Value until comma or slash
        pattern = r'([a-zA-Z\.]+)\s*=\s*([^,/]+)'
        
        matches = re.findall(pattern, dn)
        
        for key, val in matches:
            # Normalize key to uppercase for lookup
            data[key.upper()] = val.strip()
            
        cn = data.get('CN', 'Unknown User')
        org = data.get('O', 'Unknown Org')
        
        # Extract EDIPI/PivID (digits at end of CN)
        # Ex: "LAST.FIRST.12345" -> "12345"
        # Fallback: Use the whole CN if no numbers found
        piv_id = cn
        if '.' in cn:
            parts = cn.split('.')
            if parts[-1].isdigit():
                piv_id = parts[-1]

        print({
            "piv_id": piv_id,
            "cn": cn,
            "org": org
        })
        
        return {
            "piv_id": piv_id,
            "cn": cn,
            "org": org
        }

auth_handler = AuthHandler()