import shutil
import os
import urllib.parse
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.config import UPLOAD_DIR
from app.pdf_parser import parse_pdf
from app.rag import get_rag_engine
from app.schemas import ProcessResponse, ChatRequest, ChatResponse

app = FastAPI(title="Doc-RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")

class FileListResponse(BaseModel):
    files: List[str]

@app.get("/files", response_model=FileListResponse)
async def list_files():
    try:
        if not os.path.exists(UPLOAD_DIR):
            os.makedirs(UPLOAD_DIR)
        
        files = [f for f in os.listdir(UPLOAD_DIR) if f.lower().endswith('.pdf')]
        files.sort()
        return {"files": files}
    except Exception as e:
        print(f"Error listing files: {e}")
        return {"files": []}

@app.delete("/files/{filename}")
async def delete_file(filename: str):
    decoded_filename = urllib.parse.unquote(filename)
    file_path = os.path.join(UPLOAD_DIR, decoded_filename)
    
    if os.path.exists(file_path):
        os.remove(file_path)
    
    try:
        engine = get_rag_engine()
        engine.delete_document(decoded_filename)
    except Exception as e:
        print(f"Warning: Failed to clear vector db: {e}")
        
    return {"message": f"Deleted {filename}"}

@app.post("/upload", response_model=ProcessResponse)
async def upload_file(file: UploadFile = File(...)):
    try:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        if file.filename.lower().endswith('.pdf'):
            chunks = parse_pdf(file_path, file.filename)
            engine = get_rag_engine()
            engine.index_document(chunks)
            
            return ProcessResponse(
                filename=file.filename,
                chunks_count=len(chunks),
                message="File uploaded and indexed successfully"
            )
        else:
            return ProcessResponse(filename=file.filename, chunks_count=0, message="Not a PDF")

    except Exception as e:
        print(f"Error uploading: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        engine = get_rag_engine()
        result = engine.generate_answer(request.question)
        return ChatResponse(
            answer=result["answer"],
            sources=result["sources"]
        )
    except Exception as e:
        print(f"Error chatting: {e}")
        raise HTTPException(status_code=500, detail=str(e))