import uvicorn
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.core.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "src.app:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=True,
    )
