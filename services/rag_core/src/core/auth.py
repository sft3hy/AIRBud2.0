
import re
import time
import hashlib
from threading import Lock
from typing import Dict, Optional, Any
from fastapi import Request, HTTPException, status
from src.config import settings
from src.utils.db import DatabaseManager
from src.utils.logger import logger
class AuthHandler:
    """
    Handles authentication via mTLS/CAC headers.

    Implements:
    - Robust DN parsing
    - Thread-safe caching to reduce DB pressure under load
    - Security checks for headers
    """

    # Cache TTL in seconds (5 minutes)
    CACHE_TTL = 300

    def __init__(self):
        # DatabaseManager is assumed to be a wrapper around a connection pool.
        # We instantiate it once.
        self.db = DatabaseManager()
        
        # Simple in-memory cache: {dn_string: (user_dict, expire_timestamp)}
        self._cache: Dict[str, Any] = {}
        self._cache_lock = Lock()

    def get_current_user(self, request: Request) -> Dict[str, Any]:
        """
        Retrieves the authenticated user based on request headers.
        Uses internal caching to avoid database writes on every request.
        Support modes: CAC (mTLS), OAUTH (OAuth2 Proxy), HYBRID (Both).
        """
        # 1. TEST MODE or EPHEMERAL MODE
        if settings.TEST_MODE or settings.EPHEMERAL_MODE:
            logger.debug(f"{'TEST_MODE' if settings.TEST_MODE else 'EPHEMERAL_MODE'} active: Using mock user.")
            return self._upsert_mock_user()

        # 2. OAUTH MODE / HYBRID Check
        if settings.AUTH_MODE in ["OAUTH", "HYBRID"]:
            # OAuth2 Proxy standard header
            email = request.headers.get("X-Auth-Request-Email")
            if email:
                return self._process_oauth_user(request, email)

        # 3. CAC MODE / HYBRID Check
        # If we are in OAUTH-only mode, we skip CAC checks.
        if settings.AUTH_MODE == "OAUTH":
             # If we reached here in OAUTH mode, no email header was found.
             return self._get_guest_user()

        # Fallback to CAC Logic (Default or Hybrid)
        subject_dn = request.headers.get("X-Subject-DN", "")
        verify_result = request.headers.get("X-Client-Verify")

        # Strict check on the verification header from the proxy
        if verify_result != "SUCCESS":
            if subject_dn:
                logger.warning(f"Auth Failed | Result: {verify_result} | DN: {subject_dn}")
            return self._get_guest_user()

        if not subject_dn:
            if settings.AUTH_MODE == "CAC":
                logger.warning("Auth Failed | Missing X-Subject-DN header")
            return self._get_guest_user()

        # 4. Check Cache (CAC)
        cached_user = self._get_cached_user(subject_dn)
        if cached_user:
            return cached_user

        # 5. Parse & Process (Cache Miss)
        try:
            user_info = self._parse_dn(subject_dn)
            
            friendly_name = self._format_friendly_name(user_info['cn'])
            friendly_org = self._format_organization(subject_dn, user_info['org'])

            # Upsert into DB (Update last login, etc.)
            user_id = self.db.upsert_user(
                user_info['piv_id'], 
                friendly_name, 
                friendly_org
            )

            user = {
                "id": user_id,
                "piv_id": user_info['piv_id'],
                "cn": friendly_name,
                "org": friendly_org
            }

            # Update Cache
            self._set_cached_user(subject_dn, user)
            
            return user

        except Exception as e:
            logger.error(f"Error processing user auth for DN {subject_dn}: {e}", exc_info=True)
            return self._get_guest_user()

    def require_user(self, request: Request) -> Dict[str, Any]:
        """
        Dependency for routes that require a valid CAC/Smart Card user.
        Raises 403 if user is not authenticated.
        """
        user = self.get_current_user(request)
        if user["id"] == 0:
            # Log the specific path attempted
            logger.warning(f"Unauthorized access attempt to {request.url.path} from {request.client.host if request.client else 'unknown'}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Smart Card Required"
            )
        return user

    def _get_cached_user(self, dn: str) -> Optional[Dict[str, Any]]:
        """Thread-safe cache lookup."""
        with self._cache_lock:
            data = self._cache.get(dn)
            if data:
                user, expires_at = data
                if time.time() < expires_at:
                    return user
                else:
                    del self._cache[dn]
        return None

    def _set_cached_user(self, dn: str, user: Dict[str, Any]):
        """Thread-safe cache update."""
        with self._cache_lock:
            # Clean up old entries occasionally (simple approach)
            if len(self._cache) > 1000:
                self._purge_expired_cache()
            
            self._cache[dn] = (user, time.time() + self.CACHE_TTL)

    def _purge_expired_cache(self):
        """Removes expired entries to prevent memory leaks."""
        now = time.time()
        keys_to_remove = [k for k, v in self._cache.items() if v[1] < now]
        for k in keys_to_remove:
            del self._cache[k]

    def _get_guest_user(self) -> Dict[str, Any]:
        return {
            "id": 0, 
            "piv_id": "0", 
            "cn": "Guest", 
            "org": "Unauthenticated"
        }

    def _parse_dn(self, dn: str) -> Dict[str, str]:
        """
        Robustly parses DN string to extract CN and Organization.
        Handles variations in spacing and formatting.
        """
        if not dn:
            return {"piv_id": "0", "cn": "Unknown User", "org": "Unknown"}

        # Search for CN and O/OU using regex that tolerates spacing and some quoting
        # Matches "Key=Value" where Value stops at comma or end of string
        cn_match = re.search(r'(?:^|,\s*)CN=([^,]+)', dn, re.IGNORECASE)
        org_match = re.search(r'(?:^|,\s*)O=([^,]+)', dn, re.IGNORECASE)

        cn = cn_match.group(1).strip() if cn_match else "Unknown User"
        org = org_match.group(1).strip() if org_match else "Unknown Org"

        # Strategy: The PIV/DOD ID is the single source of truth.
        # 99% of CACs have a 10-digit EDIPI.
        
        piv_id = "0"

        # Priority 1: Search for 10-digit sequence in CN
        cn_digit_search = re.search(r'\d{10}', cn)
        if cn_digit_search:
            piv_id = cn_digit_search.group(0)
        
        # Priority 2: Search for 10-digit sequence in entire DN (e.g. if in UID= attribute)
        if piv_id == "0":
            dn_digit_search = re.search(r'\d{10}', dn)
            if dn_digit_search:
                piv_id = dn_digit_search.group(0)

        # Priority 3: Fallback for non-standard IDs (e.g. test cards with 5 digits)
        # strictly looks at the last component if it is numeric
        if piv_id == "0" and '.' in cn:
            parts = cn.split('.')
            if parts[-1].isdigit():
                piv_id = parts[-1]
        
        return {
            "piv_id": piv_id,
            "cn": cn,
            "org": org
        }

    def _format_friendly_name(self, raw_cn: str) -> str:
        """
        Converts CAC format 'LAST.FIRST.MIDDLE.12345' -> 'First Last'.
        """
        if not raw_cn or raw_cn == "Unknown User":
            return "Guest User"

        parts = raw_cn.split('.')
        # Filter out the EDIPI (digits) and purely empty strings
        name_parts = [p for p in parts if not p.isdigit() and p]

        if len(name_parts) >= 2:
            # DoD Standard: LAST.FIRST.MIDDLE...
            last = name_parts[0].lower().capitalize()
            first = name_parts[1].lower().capitalize()
            return f"{first} {last}"
        
        if len(name_parts) == 1:
            return name_parts[0].title()

        return raw_cn.replace('.', ' ').title()

    def _format_organization(self, dn_str: str, raw_org: str) -> str:
        """
        Extracts Role from DN and combines with Org.
        """
        dn_upper = dn_str.upper()
        role = ""

        if "OU=CONTRACTOR" in dn_upper:
            role = "Contractor"
        elif "OU=CIVILIAN" in dn_upper:
            role = "Civilian"
        elif "OU=MILITARY" in dn_upper:
            role = "Military"
        
        org_clean = raw_org.strip()

        if role:
            return f"{role}, {org_clean}"
        return org_clean

    def _upsert_mock_user(self):
        """Mock Data for local testing."""
        piv_id = "1000000001"
        raw_cn = "user.test.F.1000000001" 
        raw_dn = "CN=user.test.F.1000000001,OU=CONTRACTOR,O=U.S. Government"
        
        friendly_name = self._format_friendly_name(raw_cn)
        friendly_org = self._format_organization(raw_dn, "U.S. Government")
        
        try:
            user_id = self.db.upsert_user(piv_id, friendly_name, friendly_org)
        except Exception as e:
            logger.error(f"Mock user upsert failed: {e}")
            user_id = 1
        
        return {
            "id": user_id, 
            "piv_id": piv_id, 
            "cn": friendly_name, 
            "org": friendly_org
        }
    
    def _process_oauth_user(self, request: Request, email: str) -> Dict[str, Any]:
        """
        Processes OAuth2 Proxy headers to create/retrieve a user.
        """
        # Check Cache first (using email as key)
        cached_user = self._get_cached_user(email)
        if cached_user:
            return cached_user
            
        try:
            # Extract additional info if available
            # Ideally we'd get name from X-Auth-Request-User or ID Token claims
            # But the user only guaranteed email in the prompt example
            raw_user = request.headers.get("X-Auth-Request-User", "")
            
            # Robust Logic: We no longer generate fake PIV IDs.
            # We rely on email uniqueness in the DB.
            piv_id_sim = None 

            # User Friendly Name logic
            if raw_user:
                cn = raw_user
            else:
                cn = email.split('@')[0].replace('.', ' ').title()
            
            org = "OAuth User"
            
            # Upsert into DB (piv_id is None)
            user_id = self.db.upsert_user(
                piv_id_sim,
                cn,
                org,
                email # Make sure email is passed!
            )
            
            user = {
                "id": user_id,
                "piv_id": piv_id_sim,
                "cn": cn,
                "org": org,
                "email": email
            }
            
            # Update Cache
            self._set_cached_user(email, user)
            return user
            
        except Exception as e:
            logger.error(f"Error processing OAuth user {email}: {e}", exc_info=True)
            return self._get_guest_user()


auth_handler = AuthHandler()