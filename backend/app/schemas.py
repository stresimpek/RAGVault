from pydantic import BaseModel
from typing import List, Optional

class DocumentChunk(BaseModel):
    page_number: int
    text: str
    source_file: str

class ProcessResponse(BaseModel):
    filename: str
    chunks_count: int
    message: str

class ChatRequest(BaseModel):
    question: str

class Source(BaseModel):
    filename: str
    page_number: int
    text: str

class ChatResponse(BaseModel):
    answer: str
    sources: List[Source]
