import os
from app.core.exceptions import AppException

def extract_text(file_path: str, file_type: str) -> str:
    if not os.path.exists(file_path):
        raise AppException("Physical file not found", status_code=404)
        
    try:
        if file_type == "application/pdf":
            return _extract_pdf(file_path)
        elif file_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            return _extract_docx(file_path)
        elif file_type == "text/plain":
            return _extract_txt(file_path)
        else:
            raise AppException(f"Unsupported file type for extraction: {file_type}", status_code=400)
    except AppException:
        raise
    except Exception as e:
        raise AppException(f"Failed to extract text: {str(e)}", status_code=500)

def _extract_pdf(file_path: str) -> str:
    import fitz  # PyMuPDF
    text = []
    try:
        with fitz.open(file_path) as doc:
            for page in doc:
                page_text = page.get_text()
                if page_text:
                    text.append(page_text)
    except Exception as e:
        raise Exception(f"PDF extraction failed: {str(e)}")
        
    return "\n".join(text).strip()

def _extract_docx(file_path: str) -> str:
    import docx
    try:
        doc = docx.Document(file_path)
        return "\n".join([p.text for p in doc.paragraphs]).strip()
    except Exception as e:
        raise Exception(f"DOCX extraction failed: {str(e)}")

def _extract_txt(file_path: str) -> str:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read().strip()
    except UnicodeDecodeError:
        try:
            with open(file_path, 'r', encoding='latin-1') as f:
                return f.read().strip()
        except Exception as e:
            raise Exception(f"TXT extraction failed after encoding fallback: {str(e)}")
    except Exception as e:
        raise Exception(f"TXT extraction failed: {str(e)}")
