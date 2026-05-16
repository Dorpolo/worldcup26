import os
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

bearer = HTTPBearer()
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")


def verify_token(credentials: HTTPAuthorizationCredentials = Security(bearer)):
    if not INTERNAL_API_KEY:
        raise HTTPException(status_code=500, detail="INTERNAL_API_KEY not configured")
    if credentials.credentials != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid token")
    return credentials.credentials
