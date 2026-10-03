import sys
import os
import subprocess
import time
import urllib.request
import urllib.error
import json
import unittest
import io
import uuid
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

import app.main  # noqa: F401 registers every model on Base.metadata

from app.db.session import SessionLocal
from app.auth.models import User, Role
from app.auth.repository import UserRepository
from app.subject.repository import SubjectRepository
from app.document.models import Document
from app.auth.constants import ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT
from app.core.security import get_password_hash
from app.core.config import settings

# For local TestClient mocking
from fastapi.testclient import TestClient
from app.main import app

BASE_URL = "http://127.0.0.1:8023/api/v1"

def create_multipart_payload(filename, file_content, content_type="application/pdf"):
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body = (
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\n"
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode('utf-8') + file_content + f"\r\n--{boundary}--\r\n".encode('utf-8')
    return boundary, body

def http_request(method, url, data=None, token=None, is_multipart=False, boundary=None, payload=None):
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
        
    if is_multipart:
        headers['Content-Type'] = f'multipart/form-data; boundary={boundary}'
        req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    else:
        if data is not None:
            headers['Content-Type'] = 'application/json'
            data = json.dumps(data).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        
    try:
        resp = urllib.request.urlopen(req)
        return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(body)
        except json.JSONDecodeError:
            return e.code, body

class DocumentApiTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()
        cls.user_repo = UserRepository(cls.db)
        cls.subject_repo = SubjectRepository(cls.db)
        
        cls.emails = [
            "d_admin@test.com", "d_hod@test.com", "d_facultyA@test.com", "d_facultyB@test.com", "d_student@test.com"
        ]
        cls.cleanup_users()

        r_admin = cls.db.query(Role).filter(Role.name == ROLE_ADMIN).first()
        r_hod = cls.db.query(Role).filter(Role.name == ROLE_HOD).first()
        r_faculty = cls.db.query(Role).filter(Role.name == ROLE_FACULTY).first()
        r_student = cls.db.query(Role).filter(Role.name == ROLE_STUDENT).first()

        cls.user_repo.create_user(email="d_admin@test.com", hashed_password=get_password_hash("Pass123!"), role_id=r_admin.id)
        cls.user_repo.create_user(email="d_hod@test.com", hashed_password=get_password_hash("Pass123!"), role_id=r_hod.id)
        cls.facultyA = cls.user_repo.create_user(email="d_facultyA@test.com", hashed_password=get_password_hash("Pass123!"), role_id=r_faculty.id)
        cls.facultyB = cls.user_repo.create_user(email="d_facultyB@test.com", hashed_password=get_password_hash("Pass123!"), role_id=r_faculty.id)
        cls.user_repo.create_user(email="d_student@test.com", hashed_password=get_password_hash("Pass123!"), role_id=r_student.id)

        print("\nStarting uvicorn server for Document API tests...")
        cls.server = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "tests.test_app:app", "--port", "8023"],
            cwd="d:/qrepo/backend"
        )
        time.sleep(3) 

        cls.tokens = {}
        for role, email in [("admin", "d_admin@test.com"), ("hod", "d_hod@test.com"), ("facultyA", "d_facultyA@test.com"), ("facultyB", "d_facultyB@test.com"), ("student", "d_student@test.com")]:
            status, data = http_request("POST", f"{BASE_URL}/auth/login", {"email": email, "password": "Pass123!"})
            cls.tokens[role] = data["data"]["access_token"]

        # Ensure media/documents is clean before testing
        cls.storage_dir = Path(settings.DOCUMENT_STORAGE_DIR)
        cls.storage_dir.mkdir(parents=True, exist_ok=True)
        for p in cls.storage_dir.glob("*"):
            if p.is_file():
                p.unlink()

    @classmethod
    def tearDownClass(cls):
        print("\nShutting down Document API server...")
        cls.server.terminate()
        cls.server.wait()
        
        # Cleanup Subjects
        subjects = cls.subject_repo.get_all()
        for s in subjects:
            if s.code.startswith("DOC_"):
                cls.subject_repo.delete(s)
                
        cls.cleanup_users()
        cls.db.close()
        
        # Clean physical storage safely
        for p in cls.storage_dir.glob("*"):
            if p.is_file():
                for _ in range(3):
                    try:
                        p.unlink()
                        break
                    except PermissionError:
                        time.sleep(0.5)
                else:
                    try:
                        p.unlink()
                    except OSError:
                        pass

    @classmethod
    def cleanup_users(cls):
        for email in cls.emails:
            u = cls.user_repo.get_user_by_email(email)
            if u:
                cls.db.delete(u)
        cls.db.commit()

    def setUp(self):
        # Faculty A Subject & Unit
        status, data = http_request("POST", f"{BASE_URL}/subjects", {
            "name": "Doc Subject A",
            "code": f"DOC_A_{os.urandom(4).hex()}",
            "faculty_id": str(self.facultyA.id)
        }, self.tokens["admin"])
        self.facA_sub_id = data["data"]["id"]
        
        status, data = http_request("POST", f"{BASE_URL}/subjects/{self.facA_sub_id}/units", {
            "unit_number": 1,
            "title": "Unit A"
        }, self.tokens["admin"])
        self.facA_unit_id = data["data"]["id"]

        # Faculty B Subject & Unit
        status, data = http_request("POST", f"{BASE_URL}/subjects", {
            "name": "Doc Subject B",
            "code": f"DOC_B_{os.urandom(4).hex()}",
            "faculty_id": str(self.facultyB.id)
        }, self.tokens["admin"])
        self.facB_sub_id = data["data"]["id"]
        
        status, data = http_request("POST", f"{BASE_URL}/subjects/{self.facB_sub_id}/units", {
            "unit_number": 1,
            "title": "Unit B"
        }, self.tokens["admin"])
        self.facB_unit_id = data["data"]["id"]

    def _upload_file(self, unit_id, token, filename="test.pdf", content=b"fake pdf", content_type="application/pdf"):
        boundary, payload = create_multipart_payload(filename, content, content_type)
        return http_request("POST", f"{BASE_URL}/units/{unit_id}/documents", is_multipart=True, boundary=boundary, payload=payload, token=token)

    # -----------------------------
    # 4. UPLOAD TESTS (RBAC & Faculty Ownership)
    # -----------------------------
    def test_upload_admin(self):
        status, data = self._upload_file(self.facA_unit_id, self.tokens["admin"])
        self.assertEqual(status, 201)
        
    def test_upload_hod(self):
        status, data = self._upload_file(self.facA_unit_id, self.tokens["hod"])
        self.assertEqual(status, 201)

    def test_upload_faculty_ownership(self):
        # Faculty A -> Unit A (Owned)
        status, data = self._upload_file(self.facA_unit_id, self.tokens["facultyA"])
        self.assertEqual(status, 201)

        # Faculty A -> Unit B (Not Owned)
        status, data = self._upload_file(self.facB_unit_id, self.tokens["facultyA"])
        self.assertEqual(status, 403)

    def test_upload_student(self):
        status, data = self._upload_file(self.facA_unit_id, self.tokens["student"])
        self.assertEqual(status, 403)

    def test_upload_unauthenticated(self):
        status, data = self._upload_file(self.facA_unit_id, None)
        self.assertEqual(status, 401)

    # -----------------------------
    # 5. FILE VALIDATION TESTS
    # -----------------------------
    def test_upload_valid_docx_and_txt(self):
        status, _ = self._upload_file(self.facA_unit_id, self.tokens["admin"], "test.docx", b"word doc", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        self.assertEqual(status, 201)
        
        status, _ = self._upload_file(self.facA_unit_id, self.tokens["admin"], "test.txt", b"plain text", "text/plain")
        self.assertEqual(status, 201)

    def test_upload_invalid_extension(self):
        status, _ = self._upload_file(self.facA_unit_id, self.tokens["admin"], "test.exe", b"executable", "application/pdf")
        self.assertEqual(status, 400)

    def test_upload_mime_mismatch(self):
        status, _ = self._upload_file(self.facA_unit_id, self.tokens["admin"], "test.pdf", b"text", "text/plain")
        self.assertEqual(status, 400)

    def test_upload_empty_file(self):
        status, _ = self._upload_file(self.facA_unit_id, self.tokens["admin"], "empty.pdf", b"", "application/pdf")
        self.assertEqual(status, 400)

    def test_upload_oversized_file(self):
        # Create an 11MB file
        large_content = b"0" * (11 * 1024 * 1024)
        status, _ = self._upload_file(self.facA_unit_id, self.tokens["admin"], "big.pdf", large_content, "application/pdf")
        self.assertEqual(status, 400)

    # -----------------------------
    # 6. DOCUMENT RETRIEVAL TESTS
    # -----------------------------
    def test_retrieval(self):
        status, data = self._upload_file(self.facA_unit_id, self.tokens["admin"])
        doc_id = data["data"]["id"]

        # Admin, HOD, Faculty, Student can list
        for token in ["admin", "hod", "facultyB", "student"]:
            s, _ = http_request("GET", f"{BASE_URL}/units/{self.facA_unit_id}/documents", token=self.tokens[token])
            self.assertEqual(s, 200)

            s, _ = http_request("GET", f"{BASE_URL}/documents/{doc_id}", token=self.tokens[token])
            self.assertEqual(s, 200)

        # Unauthenticated
        s, _ = http_request("GET", f"{BASE_URL}/documents/{doc_id}")
        self.assertEqual(s, 401)
        
        # Non-existent unit
        fake_uuid = str(uuid.uuid4())
        s, _ = http_request("GET", f"{BASE_URL}/units/{fake_uuid}/documents", token=self.tokens["admin"])
        self.assertEqual(s, 404)

        # Non-existent document
        s, _ = http_request("GET", f"{BASE_URL}/documents/{fake_uuid}", token=self.tokens["admin"])
        self.assertEqual(s, 404)

    # -----------------------------
    # 7. UPDATE TESTS
    # -----------------------------
    def test_update_document(self):
        _, data = self._upload_file(self.facA_unit_id, self.tokens["facultyA"])
        doc_id = data["data"]["id"]
        original_uploaded_by = data["data"]["uploaded_by"]

        # Admin
        s, _ = http_request("PUT", f"{BASE_URL}/documents/{doc_id}", {"file_name": "up_a.pdf"}, token=self.tokens["admin"])
        self.assertEqual(s, 200)

        # HOD
        s, _ = http_request("PUT", f"{BASE_URL}/documents/{doc_id}", {"file_name": "up_h.pdf"}, token=self.tokens["hod"])
        self.assertEqual(s, 200)

        # Faculty A (owner)
        s, update_data = http_request("PUT", f"{BASE_URL}/documents/{doc_id}", {"file_name": "up_f.pdf", "uploaded_by": str(uuid.uuid4())}, token=self.tokens["facultyA"])
        self.assertEqual(s, 200)
        # Verify protected field was ignored
        self.assertEqual(update_data["data"]["uploaded_by"], original_uploaded_by)
        self.assertEqual(update_data["data"]["file_name"], "up_f.pdf")

        # Faculty B (non-owner)
        s, _ = http_request("PUT", f"{BASE_URL}/documents/{doc_id}", {"file_name": "up_fb.pdf"}, token=self.tokens["facultyB"])
        self.assertEqual(s, 403)

        # Student
        s, _ = http_request("PUT", f"{BASE_URL}/documents/{doc_id}", {"file_name": "up_s.pdf"}, token=self.tokens["student"])
        self.assertEqual(s, 403)

    # -----------------------------
    # 8. DELETE AND PHYSICAL FILE TESTS
    # -----------------------------
    def test_delete_and_physical_file(self):
        _, data = self._upload_file(self.facA_unit_id, self.tokens["facultyA"])
        doc_id = data["data"]["id"]
        storage_path = data["data"]["storage_path"]
        
        # Verify physical file exists
        full_path = Path("d:/qrepo/backend") / storage_path
        self.assertTrue(full_path.exists())
        self.assertNotEqual(full_path.name, "test.pdf") # UUID based

        # Student -> 403
        s, _ = http_request("DELETE", f"{BASE_URL}/documents/{doc_id}", token=self.tokens["student"])
        self.assertEqual(s, 403)
        self.assertTrue(full_path.exists()) # Still there
        
        # Faculty B -> 403
        s, _ = http_request("DELETE", f"{BASE_URL}/documents/{doc_id}", token=self.tokens["facultyB"])
        self.assertEqual(s, 403)

        # Faculty A -> 200
        s, _ = http_request("DELETE", f"{BASE_URL}/documents/{doc_id}", token=self.tokens["facultyA"])
        self.assertEqual(s, 200)

        # Verify DB is gone
        s, _ = http_request("GET", f"{BASE_URL}/documents/{doc_id}", token=self.tokens["admin"])
        self.assertEqual(s, 404)

        # Verify Physical file is gone
        self.assertFalse(full_path.exists())

    # -----------------------------
    # 10. FAILURE CLEANUP TEST
    # -----------------------------
    @patch("app.document.service.DocumentService.create_document")
    def test_failure_cleanup(self, mock_create):
        # We mock the service to raise an exception, simulating a DB failure.
        mock_create.side_effect = Exception("Simulated DB Failure")

        client = TestClient(app, raise_server_exceptions=False)
        
        # We use Faculty A's token for local TestClient
        headers = {"Authorization": f"Bearer {self.tokens['facultyA']}"}
        
        # Upload a specific file we can track
        file_content = b"local_test_content"
        files = {"file": ("fail_test.pdf", io.BytesIO(file_content), "application/pdf")}
        
        # Count files in storage before
        files_before = len(list(self.storage_dir.glob("*")))
        
        response = client.post(f"/api/v1/units/{self.facA_unit_id}/documents", files=files, headers=headers)
        
        # Since we raised an arbitrary exception, it should be a 500 error returned by FastAPI
        self.assertEqual(response.status_code, 500)
        
        # Count files in storage after. Should be identical. The file was saved, then cleanup was triggered.
        files_after = len(list(self.storage_dir.glob("*")))
        self.assertEqual(files_before, files_after)

if __name__ == "__main__":
    unittest.main(verbosity=2)
