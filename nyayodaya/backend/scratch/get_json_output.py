import asyncio
import os
import sys
import json
from dotenv import load_dotenv

# Add backend root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

from services.pdf_parser import parse_pdf, extract_text_for_ai
from services.extractor import extract_from_judgment
from services.action_plan import generate_action_plan

async def get_json_output(file_path: str):
    with open(file_path, "rb") as f:
        pdf_bytes = f.read()
    
    parsed = parse_pdf(pdf_bytes)
    text_info = extract_text_for_ai(parsed)
    text = text_info["text"]
    
    extraction = await extract_from_judgment(text, "json_check_job")
    
    # Populate coverage info
    extraction.pages_read = text_info["pages_read"]
    extraction.total_pages = text_info["total_pages"]
    extraction.is_fully_read = text_info["is_fully_read"]
    
    action_plan = await generate_action_plan(extraction, [], "json_check_job")
    
    result = {
        "extraction": extraction.model_dump(),
        "action_plan": action_plan.model_dump()
    }
    
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    TEST_FILE = r"c:\ai for bharat\nyayodhaya-demo\sample_data\KAHC020003212019_1_2025-12-01.pdf"
    asyncio.run(get_json_output(TEST_FILE))
