import sys
import os
import urllib.request
import json
from urllib.error import HTTPError
import subprocess
import time
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.db.session import SessionLocal
from app.auth.repository import UserRepository
from app.subject.repository import SubjectRepository

BASE_URL = "http://127.0.0.1:8020/api/v1"

def http_request(method, url, data=None, token=None):
    headers = {}
    if data is not None:
        headers['Content-Type'] = 'application/json'
        data = json.dumps(data).encode('utf-8')
    if token:
        headers['Authorization'] = f'Bearer {token}'
        
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        return resp.status, json.loads(resp.read().decode('utf-8'))
    except HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(body)
        except json.JSONDecodeError:
            return e.code, body

def verify_step6():
    db = SessionLocal()
    user_repo = UserRepository(db)
    subject_repo = SubjectRepository(db)

    print("--- Starting Step 6 API & RBAC Verification ---")

    print("\nStarting uvicorn server for tests...")
    server = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", "8020"],
        cwd="d:/qrepo/backend"
    )
    time.sleep(3) 

    try:
        # Clean up any leftover test subject
        existing_sub = subject_repo.get_by_code("API101")
        if existing_sub:
            subject_repo.delete(existing_sub)

        # 1. Login to get tokens
        users = {
            "admin": "admin@test.com",
            "hod": "hod@test.com",
            "faculty": "faculty@test.com",
            "student": "student@test.com"
        }
        
        tokens = {}
        for role, email in users.items():
            status, data = http_request("POST", f"{BASE_URL}/auth/login", {"email": email, "password": "Pass123!"})
            if status == 200:
                tokens[role] = data["data"]["access_token"]
            else:
                print(f"Failed to login {role} with Pass123! Status: {status}")
                return

        faculty_user = user_repo.get_user_by_email(users["faculty"])

        # 2. Test Subject Endpoints
        # Admin create
        status, data = http_request("POST", f"{BASE_URL}/subjects", {"name": "API Test", "code": "API101", "faculty_id": str(faculty_user.id)}, tokens["admin"])
        if status == 201:
            print("[OK] Admin created Subject.")
            subject_id = data["data"]["id"]
        else:
            print(f"[FAIL] Admin failed to create subject: {data}")
            return

        # Student create (should fail 403)
        status, data = http_request("POST", f"{BASE_URL}/subjects", {"name": "Fail", "code": "FAIL"}, tokens["student"])
        if status == 403:
            print("[OK] Student blocked from creating Subject (403).")
        else:
            print(f"[FAIL] Student got {status} on create Subject!")

        # Faculty create (should fail 403)
        status, data = http_request("POST", f"{BASE_URL}/subjects", {"name": "Fail", "code": "FAIL"}, tokens["faculty"])
        if status == 403:
            print("[OK] Faculty blocked from creating Subject (403).")
        else:
            print(f"[FAIL] Faculty got {status} on create Subject!")

        # All read
        status, data = http_request("GET", f"{BASE_URL}/subjects", token=tokens["student"])
        if status == 200:
            print("[OK] Student can read Subjects.")
        else:
            print(f"[FAIL] Student read Subjects failed: {status}")

        # HOD update
        status, data = http_request("PUT", f"{BASE_URL}/subjects/{subject_id}", {"description": "HOD Updated"}, tokens["hod"])
        if status == 200:
            print("[OK] HOD updated Subject.")
        else:
            print(f"[FAIL] HOD failed to update subject: {data}")

        # 3. Test Unit Endpoints
        # Admin create unit
        status, data = http_request("POST", f"{BASE_URL}/subjects/{subject_id}/units", {"unit_number": 1, "title": "Unit 1"}, tokens["admin"])
        if status == 201:
            print("[OK] Admin created Unit.")
            unit_id = data["data"]["id"]
        else:
            print(f"[FAIL] Admin failed to create unit: {data}")
            
        # Assigned Faculty create unit
        status, data = http_request("POST", f"{BASE_URL}/subjects/{subject_id}/units", {"unit_number": 2, "title": "Unit 2"}, tokens["faculty"])
        if status == 201:
            print("[OK] Assigned Faculty created Unit.")
        else:
            print(f"[FAIL] Assigned Faculty failed to create unit: {data}")

        # Student update unit (should fail 403)
        status, data = http_request("PUT", f"{BASE_URL}/units/{unit_id}", {"title": "Hacked"}, tokens["student"])
        if status == 403:
            print("[OK] Student blocked from updating Unit (403).")
        else:
            print(f"[FAIL] Student got {status} on update Unit!")

        # Unassigned Faculty
        # Let's remove faculty_id from subject
        http_request("PUT", f"{BASE_URL}/subjects/{subject_id}", {"faculty_id": None}, tokens["admin"])
        status, data = http_request("PUT", f"{BASE_URL}/units/{unit_id}", {"title": "Hacked"}, tokens["faculty"])
        if status == 403:
            print("[OK] Unassigned Faculty blocked from updating Unit via Service ownership check (403).")
        else:
            print(f"[FAIL] Unassigned Faculty got {status} on update Unit! Expected 403. Response: {data}")

        # HOD delete unit
        status, data = http_request("DELETE", f"{BASE_URL}/units/{unit_id}", token=tokens["hod"])
        if status == 200:
            print("[OK] HOD deleted Unit.")
        else:
            print(f"[FAIL] HOD failed to delete unit: {data}")

        # Admin delete subject
        status, data = http_request("DELETE", f"{BASE_URL}/subjects/{subject_id}", token=tokens["admin"])
        if status == 200:
            print("[OK] Admin deleted Subject.")
        else:
            print(f"[FAIL] Admin failed to delete subject: {data}")

        # 4. Auth edge cases
        status, data = http_request("GET", f"{BASE_URL}/subjects")
        if status == 401:
            print("[OK] Missing JWT rejected (401).")
        
        status, data = http_request("GET", f"{BASE_URL}/subjects", token="BADTOKEN")
        if status == 401:
            print("[OK] Invalid JWT rejected (401).")

        print("--- Verification Complete ---")

    finally:
        print("\nShutting down server...")
        server.terminate()
        server.wait()

if __name__ == "__main__":
    verify_step6()
