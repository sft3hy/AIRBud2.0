import re
from fastapi import Request, HTTPException
from typing import Optional, Dict, List
from src.config import settings
from src.utils.db import DatabaseManager
from src.utils.logger import logger

class AuthHandler:
    def __init__(self):
        self.db = DatabaseManager()

    def _format_friendly_name(self, raw_cn: str) -> str:
        """
        Converts CAC format 'LAST.FIRST.MIDDLE.12345' -> 'First Last'.
        Input: TOWNSEND.SAMUEL.F.1000000001
        Output: Samuel Townsend
        """
        if not raw_cn or raw_cn == "Unknown User":
            return "Guest User"

        # 1. Split by '.'
        parts = raw_cn.split('.')
        
        # 2. Filter out the EDIPI (digits)
        name_parts = [p for p in parts if not p.isdigit()]
        
        # 3. Reformat
        # Standard DoD is LAST.FIRST.MIDDLE
        if len(name_parts) >= 2:
            last = name_parts[0].lower().capitalize()
            first = name_parts[1].lower().capitalize()
            return f"{first} {last}"
        
        # Fallback
        return raw_cn.replace('.', ' ').title()

    def _format_organization(self, dn_str: str, raw_org: str) -> str:
        """
        Extracts Role (Contractor, Civilian, etc) from DN and combines with Org.
        Input DN: ...OU=CONTRACTOR...O=U.S. Government...
        Output: Contractor, U.S. Government
        """
        dn_upper = dn_str.upper()
        role = ""

        # Check for common DoD roles in the full DN string
        if "OU=CONTRACTOR" in dn_upper:
            role = "Contractor"
        elif "OU=CIVILIAN" in dn_upper:
            role = "Civilian"
        elif "OU=MILITARY" in dn_upper:
            role = "Military"
        
        # Clean up the base Organization (remove extra chars if any)
        org_clean = raw_org.strip()

        if role:
            return f"{role}, {org_clean}"
        return org_clean

    def get_current_user(self, request: Request) -> Dict:
        """
        Parses headers and returns a standardized User object.
        """
        
        # 1. TEST MODE
        if settings.TEST_MODE:
            return self._upsert_mock_user()

        # 2. PROD MODE
        subject_dn = request.headers.get("X-Subject-DN", "")
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
        
        # FORMATTING STEPS
        friendly_name = self._format_friendly_name(user_info['cn'])
        friendly_org = self._format_organization(subject_dn, user_info['org'])

        # Upsert into DB (Stores the Clean Name and Org)
        user_id = self.db.upsert_user(
            user_info['piv_id'], 
            friendly_name, 
            friendly_org
        )
        
        return {
            "id": user_id,
            "piv_id": user_info['piv_id'],
            "cn": friendly_name,       # "Samuel Townsend"
            "org": friendly_org        # "Contractor, U.S. Government"
        }

    def require_user(self, request: Request) -> Dict:
        user = self.get_current_user(request)
        if user["id"] == 0:
            logger.warning(f"Unauthorized access attempt to {request.url.path}")
            raise HTTPException(status_code=403, detail="Smart Card Required")
        return user

    def _upsert_mock_user(self):
        # Mock Data matching your format for testing
        piv_id = "1000000001"
        raw_cn = "user.test.F.1000000001" 
        raw_dn = "CN=user.test.F.1000000001,OU=CONTRACTOR,O=U.S. Government"
        
        friendly_name = self._format_friendly_name(raw_cn)
        friendly_org = self._format_organization(raw_dn, "U.S. Government")
        
        user_id = self.db.upsert_user(piv_id, friendly_name, friendly_org)
        
        return {
            "id": user_id, 
            "piv_id": piv_id, 
            "cn": friendly_name, 
            "org": friendly_org
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
            # We take the first occurrence for CN and O usually
            if key.upper() not in data:
                data[key.upper()] = val.strip()
            
        cn = data.get('CN', 'Unknown User')
        org = data.get('O', 'Unknown Org')
        
        # Extract EDIPI/PivID from raw CN (digits at end)
        piv_id = cn
        if '.' in cn:
            parts = cn.split('.')
            if parts[-1].isdigit():
                piv_id = parts[-1]

        return {
            "piv_id": piv_id,
            "cn": cn, 
            "org": org
        }

auth_handler = AuthHandler()