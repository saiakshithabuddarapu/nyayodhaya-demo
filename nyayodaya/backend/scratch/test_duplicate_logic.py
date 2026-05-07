import asyncio
import os
import sys
from dotenv import load_dotenv

# Add backend root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

from db.supabase_client import get_supabase_client
from services.storage import save_case_to_db

async def test_duplicate_logic():
    client = get_supabase_client()
    test_case_number = "TEST-WP-9999-2026"
    
    # Mock data
    extraction = {
        "case_number": test_case_number,
        "court": "Test Court",
        "order_date": "2026-01-01",
        "respondent_department": "Public Works Department",
        "key_directives": ["Test Directive"],
        "relative_deadline_text": "within 4 weeks"
    }
    action_plan = {
        "checklist_items": [],
        "context_insights": "Test insights",
        "nature_of_action": {"type": "compliance"},
        "consideration_for_appeal": "None"
    }
    confidence_scores = {"overall": 90}
    
    print(f"--- STARTING TEST FOR {test_case_number} ---")
    
    try:
        # 1. Clean up existing test record if any
        client.table("cases").delete().eq("case_number", test_case_number).execute()
        print("Cleaned up any existing test records.")

        # 2. First upload (Should succeed)
        print("\nStep 1: First upload...")
        case_id = await save_case_to_db(
            extraction, action_plan, confidence_scores, "2026-02-01", "test_job_1"
        )
        print(f"✅ First upload successful. Case ID: {case_id}")

        # 3. Try to upload again (Should succeed since status is pending_verification)
        print("\nStep 2: Re-uploading while pending...")
        case_id_2 = await save_case_to_db(
            extraction, action_plan, confidence_scores, "2026-02-01", "test_job_2"
        )
        print(f"✅ Re-upload successful (Overwritten). Case ID: {case_id_2}")
        assert case_id == case_id_2

        # 4. Mark as verified
        print("\nStep 3: Marking case as verified...")
        client.table("cases").update({"status": "verified"}).eq("id", case_id).execute()
        print("✅ Case marked as 'verified'.")

        # 5. Try to upload again (Should FAIL)
        print("\nStep 4: Re-uploading while verified (Expecting Failure)...")
        try:
            await save_case_to_db(
                extraction, action_plan, confidence_scores, "2026-02-01", "test_job_3"
            )
            print("❌ Error: Re-upload should have failed but succeeded!")
        except ValueError as e:
            print(f"✅ Successfully caught expected error: {e}")

    finally:
        # Clean up
        client.table("cases").delete().eq("case_number", test_case_number).execute()
        print("\nCleaned up test records.")

if __name__ == "__main__":
    asyncio.run(test_duplicate_logic())
