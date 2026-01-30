import os
import uuid
import re
from typing import List
from groq import Groq
from fastembed import TextEmbedding
from qdrant_client import QdrantClient
from qdrant_client.http import models
from app.config import QDRANT_URL, GROQ_API_KEY
from app.schemas import DocumentChunk, Source

COLLECTION_NAME = "doc_rag_collection"

class RagEngine:
    def __init__(self):
        self.groq_client = Groq(api_key=GROQ_API_KEY)
        self.embedding_model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
        self.qdrant = QdrantClient(url=QDRANT_URL)
        
        if not self.qdrant.collection_exists(COLLECTION_NAME):
            self.create_collection()
            
    def create_collection(self):
        self.qdrant.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(
                size=384,
                distance=models.Distance.COSINE
            )
        )

    def delete_document(self, filename: str):
        self.qdrant.delete(
            collection_name=COLLECTION_NAME,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[models.FieldCondition(key="filename", match=models.MatchValue(value=filename))]
                )
            )
        )

    def index_document(self, chunks: List[DocumentChunk]):
        points = []
        texts = [chunk.text for chunk in chunks]
        embeddings = list(self.embedding_model.embed(texts))
        
        for idx, (chunk, vector) in enumerate(zip(chunks, embeddings)):
            unique_str = f"{chunk.source_file}_{idx}"
            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, unique_str))
            
            points.append(models.PointStruct(
                id=point_id,
                vector=vector.tolist(),
                payload={
                    "filename": chunk.source_file,
                    "page_number": chunk.page_number,
                    "text": chunk.text
                }
            ))
            
        self.qdrant.upsert(
            collection_name=COLLECTION_NAME,
            points=points
        )

    def search(self, query: str, limit: int = 3) -> List[Source]:
        query_vector = list(next(self.embedding_model.embed([query])))
        search_result = self.qdrant.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            limit=limit 
        )
        sources = []
        for hit in search_result:
            sources.append(Source(
                filename=hit.payload["filename"],
                page_number=hit.payload["page_number"],
                text=hit.payload["text"]
            ))
        return sources

    def generate_answer(self, query: str) -> dict:
        candidates = self.search(query, limit=3)
        
        if not candidates:
            return {"answer": "Sorry, no relevant documents found.", "sources": []}

        context_text = ""
        for i, s in enumerate(candidates):
            clean_content = s.text.replace("\n", " ").strip()
            context_text += f"--- [ID: {i}] ---\nFile: {s.filename} (Pg {s.page_number})\nText: {clean_content}\n\n"
        
        system_prompt = """You are an AI Analyst.
Step 1: Read the candidates and find the answer.
Step 2: Select the SINGLE BEST Source ID (0-4).
Step 3: Extract the EXACT sentence/paragraph used for the answer. Clean it from citation numbers like [1], [12].

IMPORTANT: The user MUST NOT see your steps.
You must output ONLY the final result in this specific format:

###FINAL_ANSWER###
[Write your clear answer here]

###METADATA###
SOURCE_ID: [X]
QUOTE: [Exact text from document]
"""
        
        user_prompt = f"""Candidates:
{context_text}

Question: 
{query}
"""

        chat_completion = self.groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="meta-llama/llama-4-maverick-17b-128e-instruct",
            temperature=0.1,
        )
        
        full_response = chat_completion.choices[0].message.content
        clean_answer = "Sorry, AI error."
        final_sources = []
        
        if "###FINAL_ANSWER###" in full_response:
            parts = full_response.split("###METADATA###")
            answer_part = parts[0].replace("###FINAL_ANSWER###", "").strip()
            clean_answer = answer_part
            
            if len(parts) > 1:
                meta_part = parts[1]
                id_match = re.search(r'SOURCE_ID:\s*(\d+)', meta_part)
                quote_match = re.search(r'QUOTE:\s*(.*)', meta_part, re.DOTALL)
                
                if id_match:
                    idx = int(id_match.group(1))
                    if 0 <= idx < len(candidates):
                        selected_source = candidates[idx]
                        if quote_match:
                            raw_quote = quote_match.group(1).strip()
                            clean_quote = raw_quote.strip('"').strip("'")
                            selected_source.text = clean_quote
                        
                        final_sources = [selected_source]
        else:
            clean_answer = full_response
            final_sources = [candidates[0]]

        return {
            "answer": clean_answer,
            "sources": final_sources
        }

rag_engine = None

def get_rag_engine():
    global rag_engine
    if rag_engine is None:
        rag_engine = RagEngine()
    return rag_engine