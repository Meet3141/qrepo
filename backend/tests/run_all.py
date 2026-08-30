import sys
import os
import subprocess
import time
import urllib.request
import json
import unittest
from datetime import timedelta
from urllib.error import HTTPError

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.db.session import SessionLocal
from app.auth.models import User, Role
from app.auth.repository import UserRepository
from app.auth.constants import ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT
from app.core.security import get_password_hash, create_access_token

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

class AuthTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()
        cls.repo = UserRepository(cls.db)
        
        cls.emails = [
            "valid_reg@test.com", "dup@test.com", "login_test@test.com",
            "admin@test.com", "hod@test.com", "faculty@test.com", "student@test.com"
        ]
        cls.cleanup_users()

        r_admin = cls.db.query(Role).filter(Role.name == ROLE_ADMIN).first()
        r_hod = cls.db.query(Role).filter(Role.name == ROLE_HOD).first()
        r_faculty = cls.db.query(Role).filter(Role.name == ROLE_FACULTY).first()
        r_student = cls.db.query(Role).filter(Role.name == ROLE_STUDENT).first()

        cls.user_student = cls.repo.create_user(email="login_test@test.com", hashed_password=get_password_hash("Pass123!"), role_id=r_student.id)
        cls.repo.create_user(email="admin@test.com", hashed_password=get_password_hash("Pass123!"), role_id=r_admin.id)
        cls.repo.create_user(email="hod@test.com", hashed_password=get_password_hash("Pass123!"), role_id=r_hod.id)
        cls.repo.create_user(email="faculty@test.com", hashed_password=get_password_hash("Pass123!"), role_id=r_faculty.id)
        cls.repo.create_user(email="student@test.com", hashed_password=get_password_hash("Pass123!"), role_id=r_student.id)

        print("\nStarting uvicorn server for tests...")
        cls.server = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "tests.test_app:app", "--port", "8020"],
            cwd="d:/qrepo/backend"
        )
        time.sleep(3) 

        cls.tokens = {}
        for role in ["admin", "hod", "faculty", "student"]:
            email = f"{role}@test.com"
            status, data = http_request("POST", f"{BASE_URL}/auth/login", {"email": email, "password": "Pass123!"})
            cls.tokens[role] = data["data"]["access_token"]

        status, data = http_request("POST", f"{BASE_URL}/auth/login", {"email": "login_test@test.com", "password": "Pass123!"})
        cls.valid_token = data["data"]["access_token"]

    @classmethod
    def tearDownClass(cls):
        print("\nShutting down server...")
        cls.server.terminate()
        cls.server.wait()
        cls.cleanup_users()
        cls.db.close()

    @classmethod
    def cleanup_users(cls):
        for email in cls.emails:
            u = cls.repo.get_user_by_email(email)
            if u:
                cls.db.delete(u)
        cls.db.commit()

    # --- REGISTRATION TESTS ---

    def test_registration_valid(self):
        status, data = http_request("POST", f"{BASE_URL}/auth/register", {"email": "valid_reg@test.com", "password": "StrongPassword1!"})
        self.assertEqual(status, 201)
        self.assertTrue(data["success"])
        self.assertEqual(data["data"]["email"], "valid_reg@test.com")
        self.assertEqual(data["data"]["role"]["name"], ROLE_STUDENT)

    def test_registration_invalid_email(self):
        status, data = http_request("POST", f"{BASE_URL}/auth/register", {"email": "not-an-email", "password": "StrongPassword1!"})
        self.assertEqual(status, 422)

    def test_registration_weak_password(self):
        status, data = http_request("POST", f"{BASE_URL}/auth/register", {"email": "weak@test.com", "password": "password"})
        self.assertEqual(status, 422)

    def test_registration_duplicate_email(self):
        http_request("POST", f"{BASE_URL}/auth/register", {"email": "dup@test.com", "password": "StrongPassword1!"})
        status, data = http_request("POST", f"{BASE_URL}/auth/register", {"email": "dup@test.com", "password": "StrongPassword1!"})
        self.assertEqual(status, 400)
        self.assertIn("Email already registered", str(data))

    # --- LOGIN TESTS ---

    def test_login_valid(self):
        status, data = http_request("POST", f"{BASE_URL}/auth/login", {"email": "login_test@test.com", "password": "Pass123!"})
        self.assertEqual(status, 200)
        self.assertIn("access_token", data["data"])
        self.assertEqual(data["data"]["token_type"].lower(), "bearer")

    def test_login_wrong_password(self):
        status, data = http_request("POST", f"{BASE_URL}/auth/login", {"email": "login_test@test.com", "password": "WrongPassword1!"})
        self.assertEqual(status, 401)
        self.assertEqual(data.get("message"), "Invalid credentials")

    def test_login_unknown_user(self):
        status, data = http_request("POST", f"{BASE_URL}/auth/login", {"email": "nobody@test.com", "password": "StrongPassword1!"})
        self.assertEqual(status, 401)
        self.assertEqual(data.get("message"), "Invalid credentials")

    # --- JWT TESTS ---

    def test_jwt_missing_token(self):
        status, data = http_request("GET", f"{BASE_URL}/test_rbac/student")
        self.assertEqual(status, 401)
        self.assertEqual(data.get("detail"), "Not authenticated")

    def test_jwt_invalid_token(self):
        status, data = http_request("GET", f"{BASE_URL}/test_rbac/student", token="garbage.token.here")
        self.assertEqual(status, 401)
        self.assertEqual(data.get("message"), "Could not validate credentials")

    def test_jwt_expired_token(self):
        expired_token = create_access_token(subject=str(self.user_student.id), expires_delta=timedelta(seconds=-1))
        status, data = http_request("GET", f"{BASE_URL}/test_rbac/student", token=expired_token)
        self.assertEqual(status, 401)
        self.assertEqual(data.get("message"), "Could not validate credentials")

    def test_jwt_valid_token(self):
        status, data = http_request("GET", f"{BASE_URL}/test_rbac/student", token=self.valid_token)
        self.assertEqual(status, 200)

    # --- RBAC TESTS ---
    
    def test_rbac_admin_endpoint(self):
        self.assertEqual(http_request("GET", f"{BASE_URL}/test_rbac/admin", token=self.tokens["admin"])[0], 200)
        self.assertEqual(http_request("GET", f"{BASE_URL}/test_rbac/admin", token=self.tokens["hod"])[0], 403)
        self.assertEqual(http_request("GET", f"{BASE_URL}/test_rbac/admin", token=self.tokens["faculty"])[0], 403)
        self.assertEqual(http_request("GET", f"{BASE_URL}/test_rbac/admin", token=self.tokens["student"])[0], 403)

    def test_rbac_hod_endpoint(self):
        self.assertEqual(http_request("GET", f"{BASE_URL}/test_rbac/hod", token=self.tokens["hod"])[0], 200)
        self.assertEqual(http_request("GET", f"{BASE_URL}/test_rbac/hod", token=self.tokens["admin"])[0], 403)

    def test_rbac_faculty_endpoint(self):
        self.assertEqual(http_request("GET", f"{BASE_URL}/test_rbac/faculty", token=self.tokens["faculty"])[0], 200)
        self.assertEqual(http_request("GET", f"{BASE_URL}/test_rbac/faculty", token=self.tokens["student"])[0], 403)

if __name__ == "__main__":
    unittest.main(verbosity=2)
