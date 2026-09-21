import sys
import os
import subprocess
import time
import urllib.request
import urllib.error
import json
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.db.session import SessionLocal
from app.auth.models import User, Role
from app.subject.models import Subject, Unit
from app.document.models import Document
from app.auth.repository import UserRepository
from app.auth.constants import ROLE_ADMIN, ROLE_FACULTY, ROLE_STUDENT
from app.core.security import get_password_hash

BASE_URL = "http://127.0.0.1:8022/api/v1"

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

def create_multipart_payload(filename, file_content):
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body = (
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\n"
        f"Content-Type: application/pdf\r\n\r\n"
    ).encode('utf-8') + file_content + f"\r\n--{boundary}--\r\n".encode('utf-8')
    return boundary, body

def run_tests():
    db = SessionLocal()
    repo = UserRepository(db)
    
    r_admin = db.query(Role).filter(Role.name == ROLE_ADMIN).first()
    r_faculty = db.query(Role).filter(Role.name == ROLE_FACULTY).first()
    r_student = db.query(Role).filter(Role.name == ROLE_STUDENT).first()
    
    # Cleanup first
    for email in ["docadmin@test.com", "docfac@test.com", "docstud@test.com"]:
        u = repo.get_user_by_email(email)
        if u: db.delete(u)
    db.commit()

    repo.create_user(email="docadmin@test.com", hashed_password=get_password_hash("Pass123!"), role_id=r_admin.id)
    fac = repo.create_user(email="docfac@test.com", hashed_password=get_password_hash("Pass123!"), role_id=r_faculty.id)
    repo.create_user(email="docstud@test.com", hashed_password=get_password_hash("Pass123!"), role_id=r_student.id)
    
    print("Starting uvicorn...")
    server = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "tests.test_app:app", "--port", "8022"],
        cwd="d:/qrepo/backend"
    )
    time.sleep(3)
    
    try:
        tokens = {}
        for role, email in [("admin", "docadmin@test.com"), ("faculty", "docfac@test.com"), ("student", "docstud@test.com")]:
            status, data = http_request("POST", f"{BASE_URL}/auth/login", {"email": email, "password": "Pass123!"})
            tokens[role] = data["data"]["access_token"]
            
        # Create subject and unit
        status, data = http_request("POST", f"{BASE_URL}/subjects", {"name": "Doc Subj", "code": f"DOC_{os.urandom(4).hex()}", "faculty_id": str(fac.id)}, tokens["admin"])
        subject_id = data["data"]["id"]
        
        status, data = http_request("POST", f"{BASE_URL}/subjects/{subject_id}/units", {"unit_number": 1, "title": "Doc Unit"}, tokens["admin"])
        unit_id = data["data"]["id"]
        
        boundary, payload = create_multipart_payload("test.pdf", b"fake pdf")
        
        # Test Student Upload -> 403
        status, res = http_request("POST", f"{BASE_URL}/units/{unit_id}/documents", is_multipart=True, boundary=boundary, payload=payload, token=tokens["student"])
        assert status == 403, f"Expected 403, got {status}: {res}"
        print("Student Upload Rejected: PASS")
        
        # Test Faculty Upload -> 201
        status, res = http_request("POST", f"{BASE_URL}/units/{unit_id}/documents", is_multipart=True, boundary=boundary, payload=payload, token=tokens["faculty"])
        assert status == 201, f"Expected 201, got {status}: {res}"
        doc_id = res["data"]["id"]
        print("Faculty Upload: PASS")
        
        # Test List Documents (Student)
        status, res = http_request("GET", f"{BASE_URL}/units/{unit_id}/documents", token=tokens["student"])
        assert status == 200
        assert len(res["data"]) == 1
        print("Student List: PASS")
        
        # Test Update Document (Faculty)
        status, res = http_request("PUT", f"{BASE_URL}/documents/{doc_id}", {"file_name": "updated.pdf"}, tokens["faculty"])
        assert status == 200
        assert res["data"]["file_name"] == "updated.pdf"
        print("Faculty Update: PASS")
        
        # Test Delete Document (Faculty)
        status, res = http_request("DELETE", f"{BASE_URL}/documents/{doc_id}", token=tokens["faculty"])
        assert status == 200
        print("Faculty Delete: PASS")
        
    finally:
        server.terminate()
        server.wait()
        
        for email in ["docadmin@test.com", "docfac@test.com", "docstud@test.com"]:
            u = repo.get_user_by_email(email)
            if u: db.delete(u)
        db.commit()
        db.close()

if __name__ == "__main__":
    run_tests()
