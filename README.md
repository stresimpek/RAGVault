# 🧠 AI Document Analyst (RAG System)

A full-stack AI application designed to analyze PDF documents using **Llama-3** and **RAG (Retrieval-Augmented Generation)**. It provides answers with verifiable citations linking directly to the source PDF pages.

## 🚀 Features
* **Smart PDF Analysis:** Chat with your documents using LLM.
* **Verifiable Citations:** Answers include direct page references.
* **Privacy-First:** Documents are processed locally using Qdrant vector DB.
* **Dockerized:** Simple one-command deployment.

## 🛠️ Tech Stack
* **Frontend:** Next.js 14, Tailwind CSS, React-PDF
* **Backend:** FastAPI, Python 3.10
* **AI Engine:** Groq (Llama-3-70b), Sentence-Transformers
* **Database:** Qdrant (Vector Store)

## 🐳 How to Run

1.  **Clone the Repo**
    ```bash
    git clone [https://github.com/USERNAME_KAMU/doc-rag-app.git](https://github.com/USERNAME_KAMU/doc-rag-app.git)
    cd doc-rag-app
    ```

2.  **Setup Environment**
    Create a `.env` file and add your Groq API Key:
    ```bash
    cp .env.example .env
    ```
    *(Open `.env` and paste your API Key)*

3.  **Start App**
    ```bash
    docker-compose up --build
    ```

4.  **Access**
    * Frontend: http://localhost:3000
    * Backend Docs: http://localhost:8000/docs