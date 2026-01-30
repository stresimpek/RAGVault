import os

UPLOAD_DIR = "/app/data/uploads"

if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

QDRANT_URL = os.getenv("QDRANT_URL", ":memory:") 
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY is not set.")
