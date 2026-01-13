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
        Parses headers and returns a User object.
        Returns 'Guest' (id=0) if auth fails, so the Frontend can load the Login Page.
        """
        # 1. TEST MODE
        if settings.TEST_MODE:
            return self._upsert_mock_user()

        # 2. PROD MODE
        subject_dn = request.headers.get("X-Subject-DN")
        verify_result = request.headers.get("X-Client-Verify")

        # If Nginx didn't validate a cert, return Guest
        if verify_result != "SUCCESS" or not subject_dn:
            return {"id": 0, "display_name": "Guest", "organization": "Unauthenticated"}

        user_info = self._parse_dn(subject_dn)
        user_id = self.db.upsert_user(user_info['piv_id'], user_info['cn'], user_info['org'])
        
        return {**user_info, "id": user_id}

    def require_user(self, request: Request) -> Dict:
        """
        Dependency for protected routes. Raises 403 if user is Guest.
        """
        user = self.get_current_user(request)
        if user["id"] == 0:
            logger.warning(f"Unauthorized access attempt to {request.url.path}")
            raise HTTPException(status_code=403, detail="Smart Card Required")
        return user

    # ... (Keep _upsert_mock_user and _parse_dn exactly as they were) ...
    def _upsert_mock_user(self):
        piv_id = "1234567890"
        display_name = "DOE.JOHN.TEST.1234567890"
        org = "TEST-DEV-ORG"
        user_id = self.db.upsert_user(piv_id, display_name, org)
        return {"id": user_id, "piv_id": piv_id, "display_name": display_name, "organization": org}

    def _parse_dn(self, dn: str) -> Dict:
        data = {}
        pattern = r'([A-Z]+)=([^,/]+)'
        matches = re.findall(pattern, dn)
        for key, val in matches:
            data[key.upper()] = val.strip()
        cn = data.get('CN', 'Unknown User')
        org = data.get('O', 'Unknown Org')
        piv_id = cn.split('.')[-1] if '.' in cn and cn.split('.')[-1].isdigit() else cn
        return {"piv_id": piv_id, "cn": cn, "org": org}

auth_handler = AuthHandler()