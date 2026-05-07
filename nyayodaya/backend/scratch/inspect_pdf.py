import fitz  # PyMuPDF
import sys

def extract_text(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for i in range(min(3, len(doc))):  # First 3 pages should have the info
        text += f"--- Page {i+1} ---\n"
        text += doc[i].get_text()
    return text

if __name__ == "__main__":
    pdf_path = r"c:\ai for bharat\nyayodhaya-demo\sample_data\KAHC030002402018_1_2025-12-04.pdf"
    try:
        print(extract_text(pdf_path))
    except Exception as e:
        print(f"Error: {e}")
