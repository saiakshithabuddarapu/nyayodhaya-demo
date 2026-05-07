import asyncio
import os
import json
import logging
import sys
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("test_extraction")

# Load environment variables from .env
load_dotenv()

# Add current directory to path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.pdf_parser import parse_pdf, extract_text_for_ai
from services.extractor import extract_from_judgment
from services.action_plan import generate_action_plan

async def test_local_pdf(file_path: str):
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return

    logger.info(f"🚀 Starting test for: {file_path}")
    
    try:
        # 1. Read local file
        logger.info("Reading PDF bytes...")
        with open(file_path, "rb") as f:
            pdf_bytes = f.read()
        
        # 2. Parse PDF
        logger.info("⏳ Step 1: Parsing PDF structure...")
        parsed = parse_pdf(pdf_bytes)
        text = extract_text_for_ai(parsed)
        
        if not text.strip():
            logger.error("No text extracted from PDF. Check if it is a scanned image.")
            return

        logger.info(f"Extracted {len(text)} characters of text.")
        
        # 3. Extract with Gemini 2.5 Flash
        logger.info("⏳ Step 2: Running Gemini 2.5 Flash Extraction...")
        extraction = await extract_from_judgment(text, "test_job_manual")
        
        print("\n" + "="*50)
        # 4. Generate Action Plan
        logger.info("Step 3: Generating Action Plan...")
        # We pass empty similar_cases for this test
        action_plan = await generate_action_plan(extraction, [], "test_job_manual")
        
        # 5. Save to Database
        logger.info("Step 4: Persisting to Supabase...")
        try:
            from services.storage import save_case_to_db
            case_id = await save_case_to_db(
                extraction.model_dump(),
                action_plan.model_dump(),
                {}, # confidence_scores
                extraction.absolute_deadline,
                "test_job_manual",
                "local_file_test"
            )
            logger.info(f"✅ Success! Saved with Case ID: {case_id}")
        except Exception as db_err:
            logger.warning(f"⚠️ Database save skipped or failed: {db_err}")

        print("\n" + "="*50)
        print("AI EXTRACTION RESULT")
        print("="*50)
        print(extraction.model_dump_json(indent=2))
        
        print("\n" + "="*50)
        print("COMPLIANCE ACTION PLAN")
        print("="*50)
        print(action_plan.model_dump_json(indent=2))
        print("="*50 + "\n")

        logger.info("✅ Test completed successfully!")

    except Exception as e:
        logger.error(f"❌ Test failed: {e}", exc_info=True)

if __name__ == "__main__":
    # Path to your sample data
    TEST_FILE = r"c:\ai for bharat\nyayodhaya-demo\sample_data\KAHC020004802019_1_2025-12-01.pdf"
    
    asyncio.run(test_local_pdf(TEST_FILE))
