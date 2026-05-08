# Nyayodaya — Dawn of Justice

AI-powered legal intelligence system that transforms raw Karnataka High Court judgment PDFs into verified, explainable, and actionable compliance plans for government departments.

---

## 🚀 Local Quickstart Guide
Follow these steps to get Nyayodaya running on your local machine in under 10 minutes.

### 1. Database Setup (Supabase)
1.  Create a free project at [supabase.com](https://supabase.com).
2.  In the **SQL Editor**, run the contents of `supabase/migrations/001_initial_schema.sql`.
3.  Run the contents of `supabase/seed.sql` to populate initial departments.
4.  Go to **Storage** and create a public bucket named `judgments`.

### 2. Backend Setup (FastAPI)
```bash
cd nyayodaya/backend
# 1. Install dependencies
pip install -r requirements.txt
# 2. Configure environment
# Create a .env file and add your GOOGLE_API_KEY (Gemini) 
# and your Supabase URL/Keys.
# 3. Start the server
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup (Next.js)
```bash
cd nyayodaya/frontend
# 1. Install dependencies
npm install
# 2. Configure environment
# Create a .env.local file with your Supabase keys 
# and NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
# 3. Start the development server
npm run dev
```
**Access Locally:** Open [http://localhost:3000](http://localhost:3000)

---

## 🌐 Live Application
The system is deployed and accessible for demonstration at:  
**[Nyayodaya Live Dashboard](https://nyayodaya-demo-prod.up.railway.app/login)**

**Demo Access Credentials:**
*   **Email:** `test@example.com`
*   **Password:** `Test@123` (*Note: These are demo credentials for evaluation*)

---

## 🏗️ System Architecture

Nyayodaya utilizes a decoupled, high-performance architecture:

*   **Frontend (Next.js 15)**: Reactive dashboard featuring real-time updates via Supabase subscriptions.
*   **Backend (FastAPI)**: Python AI orchestration engine managing the document processing pipeline.
*   **AI Engine (Gemini 2.5 Flash)**: State-of-the-art LLM for multi-modal extraction, reasoning, and citation mapping.
*   **Database & Storage (Supabase)**: PostgreSQL for structured legal data and S3-compatible storage for PDF management.
*   **Observability (Langfuse)**: Full-trace logging of AI reasoning for complete auditability.

---

## 🤖 The AI Pipeline (Explainable Legal Intelligence)

1.  **High-Precision Parsing**: Uses `PyMuPDF` to extract text and preserve page coordinates.
2.  **Structured Extraction**: Gemini 2.5 Flash extracts entities (Case Number, Parties, Order Date) and identifies the responsible department.
3.  **Action Planning**: Generates step-by-step compliance checklists, identifies contempt risks, and recommends strategy.
4.  **Evidence-First Citations**: Every claim is anchored to a specific page and quote from the original PDF, allowing officers to verify logic instantly.

---

## 📂 Sample Data & Testing

The repository includes original judgment PDFs for testing:
*   **Location:** `sample_pdfs_orginal_karnataka_highcourt_2025_dec/`
*   **Source:** Official Karnataka Government records.
*   **Scope:** Includes Criminal Appeals, PILs, and various High Court order types.
*   **Testing:** Upload any file from this folder in the dashboard to trigger the full AI pipeline.

---

## 🚀 Future Scope

### 1. Handling Large-Scale Unstructured Data
*   **VLM Integration**: Training the pipeline to use Visual Language Models (VLMs) to understand complex, multi-font, and poorly scanned PDFs.
*   **Scattered Content Recovery**: Advanced logic to link directives scattered across 100+ page documents.

### 2. Semantic Feedback Loops
*   **Human-in-the-Loop Learning**: A feedback mechanism where an officer's edits are fed back into the agent's memory.
*   **Reasoning Adaptation**: The system learns to adopt the specific legal reasoning and preferences of the department over time.

---

*Nyayodaya — Empowering the state with intelligence, ensuring justice through compliance.*
