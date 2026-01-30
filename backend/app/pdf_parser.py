import fitz
from typing import List
from app.schemas import DocumentChunk

def parse_pdf(file_path: str, filename: str) -> List[DocumentChunk]:
    doc = fitz.open(file_path)
    chunks = []

    for page_num, page in enumerate(doc):
        text = page.get_text("text")
        
        clean_text = " ".join(text.split())
        
        if clean_text:
            chunk = DocumentChunk(
                page_number=page_num + 1,
                text=clean_text,
                source_file=filename
            )
            chunks.append(chunk)

    doc.close()
    return chunks

