import sys
import os
import subprocess
import time
import urllib.request
import json
import unittest
from urllib.error import HTTPError

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.db.session import SessionLocal
from app.auth.models import User, Role
from app.auth.repository import UserRepository
from app.subject.repository import SubjectRepository
from app.auth.constants import ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT
from app.core.security import get_password_hash

BASE_URL = "http://127.0.0.1:8021/api/v1"

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

class SubjectApiTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()
        cls.user_repo = UserRepository(cls.db)
        cls.subject_repo = SubjectRepository(cls.db)
        
        cls.emails = [
            "admin2@test.com", "hod2@test.com", "facultyA@test.com", "facultyB@test.com", "student2@test.com"
        ]
        cls.cleanup_users()

        r_admin = cls.db.query(Role).filter(Role.name == ROLE_ADMIN).first()
        r_hod = cls.db.query(Role).filter(Role.name == ROLE_HOD).first()
        r_faculty = cls.db.query(Role).filter(Role.name == ROLE_FACULTY).first()
        r_student = cls.db.query(Role).filter(Role.name == ROLE_STUDENT).first()

        cls.user_repo.create_user(email="admin2@test.com", hashed_password=get_password_hash("Pass123!"), role_id=r_admin.id)
        cls.user_repo.create_user(email="hod2@test.com", hashed_password=get_password_hash("Pass123!"), role_id=r_hod.id)
        cls.facultyA = cls.user_repo.create_user(email="facultyA@test.com", hashed_password=get_password_hash("Pass123!"), role_id=r_faculty.id)
        cls.facultyB = cls.user_repo.create_user(email="facultyB@test.com", hashed_password=get_password_hash("Pass123!"), role_id=r_faculty.id)
        cls.user_repo.create_user(email="student2@test.com", hashed_password=get_password_hash("Pass123!"), role_id=r_student.id)

        print("\nStarting uvicorn server for Subject API tests...")
        cls.server = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "tests.test_app:app", "--port", "8021"],
            cwd="d:/qrepo/backend"
        )
        time.sleep(3) 

        cls.tokens = {}
        for role, email in [("admin", "admin2@test.com"), ("hod", "hod2@test.com"), ("facultyA", "facultyA@test.com"), ("facultyB", "facultyB@test.com"), ("student", "student2@test.com")]:
            status, data = http_request("POST", f"{BASE_URL}/auth/login", {"email": email, "password": "Pass123!"})
            cls.tokens[role] = data["data"]["access_token"]

    @classmethod
    def tearDownClass(cls):
        print("\nShutting down Subject API server...")
        cls.server.terminate()
        cls.server.wait()
        
        # Cleanup Subjects properly
        subjects = cls.subject_repo.get_all()
        for s in subjects:
            if s.code.startswith("TS_"):
                cls.subject_repo.delete(s)
                
        cls.cleanup_users()
        cls.db.close()

    @classmethod
    def cleanup_users(cls):
        for email in cls.emails:
            u = cls.user_repo.get_user_by_email(email)
            if u:
                cls.db.delete(u)
        cls.db.commit()

    def setUp(self):
        # Create a fresh subject before each test
        status, data = http_request("POST", f"{BASE_URL}/subjects", {
            "name": "Test Subject Base",
            "code": f"TS_BASE_{os.urandom(4).hex()}",
            "faculty_id": str(self.facultyA.id)
        }, self.tokens["admin"])
        self.base_subject_id = data["data"]["id"]
        
        status, data = http_request("POST", f"{BASE_URL}/subjects/{self.base_subject_id}/units", {
            "unit_number": 1,
            "title": "Base Unit"
        }, self.tokens["admin"])
        self.base_unit_id = data["data"]["id"]

    # --- SUBJECT API TESTS (RBAC Matrix) ---

    def test_subject_rbac_admin(self):
        # Create
        status, data = http_request("POST", f"{BASE_URL}/subjects", {"name": "Admin Sub", "code": f"TS_A_{os.urandom(4).hex()}"}, self.tokens["admin"])
        self.assertEqual(status, 201)
        sub_id = data["data"]["id"]
        # Read
        status, _ = http_request("GET", f"{BASE_URL}/subjects/{sub_id}", token=self.tokens["admin"])
        self.assertEqual(status, 200)
        # Update
        status, _ = http_request("PUT", f"{BASE_URL}/subjects/{sub_id}", {"description": "Updated"}, self.tokens["admin"])
        self.assertEqual(status, 200)
        # Delete
        status, _ = http_request("DELETE", f"{BASE_URL}/subjects/{sub_id}", token=self.tokens["admin"])
        self.assertEqual(status, 200)

    def test_subject_rbac_hod(self):
        # Create
        status, data = http_request("POST", f"{BASE_URL}/subjects", {"name": "HOD Sub", "code": f"TS_H_{os.urandom(4).hex()}"}, self.tokens["hod"])
        self.assertEqual(status, 201)
        sub_id = data["data"]["id"]
        # Read
        status, _ = http_request("GET", f"{BASE_URL}/subjects/{sub_id}", token=self.tokens["hod"])
        self.assertEqual(status, 200)
        # Update
        status, _ = http_request("PUT", f"{BASE_URL}/subjects/{sub_id}", {"description": "Updated"}, self.tokens["hod"])
        self.assertEqual(status, 200)
        # Delete
        status, _ = http_request("DELETE", f"{BASE_URL}/subjects/{sub_id}", token=self.tokens["hod"])
        self.assertEqual(status, 200)

    def test_subject_rbac_faculty(self):
        # Create -> 403
        status, _ = http_request("POST", f"{BASE_URL}/subjects", {"name": "Fac Sub", "code": f"TS_F_{os.urandom(4).hex()}"}, self.tokens["facultyA"])
        self.assertEqual(status, 403)
        # Read -> 200
        status, _ = http_request("GET", f"{BASE_URL}/subjects/{self.base_subject_id}", token=self.tokens["facultyA"])
        self.assertEqual(status, 200)
        # Update -> 403
        status, _ = http_request("PUT", f"{BASE_URL}/subjects/{self.base_subject_id}", {"description": "Updated"}, self.tokens["facultyA"])
        self.assertEqual(status, 403)
        # Delete -> 403
        status, _ = http_request("DELETE", f"{BASE_URL}/subjects/{self.base_subject_id}", token=self.tokens["facultyA"])
        self.assertEqual(status, 403)

    def test_subject_rbac_student(self):
        # Create -> 403
        status, _ = http_request("POST", f"{BASE_URL}/subjects", {"name": "Stud Sub", "code": f"TS_S_{os.urandom(4).hex()}"}, self.tokens["student"])
        self.assertEqual(status, 403)
        # Read -> 200
        status, _ = http_request("GET", f"{BASE_URL}/subjects/{self.base_subject_id}", token=self.tokens["student"])
        self.assertEqual(status, 200)
        # Update -> 403
        status, _ = http_request("PUT", f"{BASE_URL}/subjects/{self.base_subject_id}", {"description": "Updated"}, self.tokens["student"])
        self.assertEqual(status, 403)
        # Delete -> 403
        status, _ = http_request("DELETE", f"{BASE_URL}/subjects/{self.base_subject_id}", token=self.tokens["student"])
        self.assertEqual(status, 403)

    # --- UNIT API TESTS & FACULTY OWNERSHIP ---

    def test_faculty_ownership_assigned(self):
        """Faculty A owns base_subject, so they can manage its units."""
        # Create
        status, data = http_request("POST", f"{BASE_URL}/subjects/{self.base_subject_id}/units", {"unit_number": 2, "title": "FacA Unit"}, self.tokens["facultyA"])
        self.assertEqual(status, 201)
        unit_id = data["data"]["id"]
        # Update
        status, _ = http_request("PUT", f"{BASE_URL}/units/{unit_id}", {"title": "Updated by FacA"}, self.tokens["facultyA"])
        self.assertEqual(status, 200)
        # Delete
        status, _ = http_request("DELETE", f"{BASE_URL}/units/{unit_id}", token=self.tokens["facultyA"])
        self.assertEqual(status, 200)

    def test_faculty_ownership_unassigned(self):
        """Faculty B does NOT own base_subject, so they cannot manage its units."""
        # Create
        status, _ = http_request("POST", f"{BASE_URL}/subjects/{self.base_subject_id}/units", {"unit_number": 3, "title": "FacB Unit"}, self.tokens["facultyB"])
        self.assertEqual(status, 403)
        # Update
        status, _ = http_request("PUT", f"{BASE_URL}/units/{self.base_unit_id}", {"title": "Updated by FacB"}, self.tokens["facultyB"])
        self.assertEqual(status, 403)
        # Delete
        status, _ = http_request("DELETE", f"{BASE_URL}/units/{self.base_unit_id}", token=self.tokens["facultyB"])
        self.assertEqual(status, 403)

    def test_unit_rbac_student(self):
        # Create -> 403
        status, _ = http_request("POST", f"{BASE_URL}/subjects/{self.base_subject_id}/units", {"unit_number": 4, "title": "Stud Unit"}, self.tokens["student"])
        self.assertEqual(status, 403)
        # Read -> 200
        status, _ = http_request("GET", f"{BASE_URL}/subjects/{self.base_subject_id}/units", token=self.tokens["student"])
        self.assertEqual(status, 200)
        status, _ = http_request("GET", f"{BASE_URL}/units/{self.base_unit_id}", token=self.tokens["student"])
        self.assertEqual(status, 200)
        # Update -> 403
        status, _ = http_request("PUT", f"{BASE_URL}/units/{self.base_unit_id}", {"title": "Updated by Stud"}, self.tokens["student"])
        self.assertEqual(status, 403)
        # Delete -> 403
        status, _ = http_request("DELETE", f"{BASE_URL}/units/{self.base_unit_id}", token=self.tokens["student"])
        self.assertEqual(status, 403)

    # --- AUTHENTICATION & VALIDATION ---

    def test_auth_errors(self):
        status, _ = http_request("GET", f"{BASE_URL}/subjects")
        self.assertEqual(status, 401)
        status, _ = http_request("GET", f"{BASE_URL}/subjects", token="invalid")
        self.assertEqual(status, 401)

    def test_validation_errors(self):
        # Missing required field
        status, data = http_request("POST", f"{BASE_URL}/subjects", {"name": "No Code"}, self.tokens["admin"])
        self.assertEqual(status, 422)
        # Invalid UUID format
        status, _ = http_request("GET", f"{BASE_URL}/subjects/not-a-uuid", token=self.tokens["admin"])
        self.assertEqual(status, 422)

    def test_duplicate_subject_code(self):
        code = f"TS_DUP_{os.urandom(4).hex()}"
        http_request("POST", f"{BASE_URL}/subjects", {"name": "First", "code": code}, self.tokens["admin"])
        status, data = http_request("POST", f"{BASE_URL}/subjects", {"name": "Second", "code": code}, self.tokens["admin"])
        self.assertEqual(status, 400)
        self.assertIn("already exists", data.get("message", ""))

    def test_not_found_errors(self):
        fake_id = "00000000-0000-0000-0000-000000000000"
        status, _ = http_request("GET", f"{BASE_URL}/subjects/{fake_id}", token=self.tokens["admin"])
        self.assertEqual(status, 404)
        status, _ = http_request("PUT", f"{BASE_URL}/units/{fake_id}", {"title": "X"}, self.tokens["admin"])
        self.assertEqual(status, 404)

    def test_cascade_delete(self):
        # Create a new subject
        status, data = http_request("POST", f"{BASE_URL}/subjects", {"name": "Cascade", "code": f"TS_CAS_{os.urandom(4).hex()}"}, self.tokens["admin"])
        sub_id = data["data"]["id"]
        
        # Create a unit
        status, data = http_request("POST", f"{BASE_URL}/subjects/{sub_id}/units", {"unit_number": 1, "title": "U1"}, self.tokens["admin"])
        unit_id = data["data"]["id"]
        
        # Delete subject
        http_request("DELETE", f"{BASE_URL}/subjects/{sub_id}", token=self.tokens["admin"])
        
        # Verify unit is also gone
        status, _ = http_request("GET", f"{BASE_URL}/units/{unit_id}", token=self.tokens["admin"])
        self.assertEqual(status, 404)

if __name__ == "__main__":
    unittest.main(verbosity=2)
