import unittest
import uuid
import os
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.auth.models import User, Role
from app.auth.constants import ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT
from app.subject.models import Subject, Unit
from app.document.models import Document
from app.core.security import create_access_token
from app.core.config import settings

class IngestionTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        # Users
        roles = cls.db.query(Role).all()
        role_map = {r.name: r for r in roles}
        
        cls.admin = cls.db.query(User).filter_by(email="admin_ingest@test.com").first()
        if not cls.admin:
            cls.admin = User(email="admin_ingest@test.com", hashed_password="x", role_id=role_map[ROLE_ADMIN].id)
            cls.db.add(cls.admin)
            
        cls.faculty = cls.db.query(User).filter_by(email="faculty_ingest@test.com").first()
        if not cls.faculty:
            cls.faculty = User(email="faculty_ingest@test.com", hashed_password="x", role_id=role_map[ROLE_FACULTY].id)
            cls.db.add(cls.faculty)
            
        cls.faculty2 = cls.db.query(User).filter_by(email="faculty2_ingest@test.com").first()
        if not cls.faculty2:
            cls.faculty2 = User(email="faculty2_ingest@test.com", hashed_password="x", role_id=role_map[ROLE_FACULTY].id)
            cls.db.add(cls.faculty2)
            
        cls.student = cls.db.query(User).filter_by(email="student_ingest@test.com").first()
        if not cls.student:
            cls.student = User(email="student_ingest@test.com", hashed_password="x", role_id=role_map[ROLE_STUDENT].id)
            cls.db.add(cls.student)
        
        cls.db.commit()

        # Subject & Unit
        cls.subject = Subject(name="Ingest Sub", code=f"ING-{uuid.uuid4().hex[:6]}", faculty_id=cls.faculty.id)
        cls.db.add(cls.subject)
        cls.db.commit()
        
        cls.unit = Unit(unit_number=1, title="Ingest Unit 1", subject_id=cls.subject.id)
        cls.db.add(cls.unit)
        cls.db.commit()

        cls.admin_token = create_access_token(subject=str(cls.admin.id))
        cls.faculty_token = create_access_token(subject=str(cls.faculty.id))
        cls.faculty2_token = create_access_token(subject=str(cls.faculty2.id))
        cls.student_token = create_access_token(subject=str(cls.student.id))
        
        # Test Files creation
        os.makedirs(settings.DOCUMENT_STORAGE_DIR, exist_ok=True)
        
        cls.txt_path = os.path.join(settings.DOCUMENT_STORAGE_DIR, "test_ingest.txt")
        with open(cls.txt_path, "w", encoding="utf-8") as f:
            f.write("Hello TXT Extraction")

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(cls.txt_path):
            os.remove(cls.txt_path)
            
        cls.db.query(Document).filter(Document.unit_id == cls.unit.id).delete()
        cls.db.query(Unit).filter(Unit.id == cls.unit.id).delete()
        cls.db.query(Subject).filter(Subject.id == cls.subject.id).delete()
        cls.db.query(Subject).filter(Subject.code == "ING101").delete()
        cls.db.query(Subject).filter(Subject.code.like("ING-%")).delete(synchronize_session=False)
        cls.db.query(User).filter(User.email.like("%_ingest@test.com")).delete(synchronize_session=False)
        cls.db.commit()
        cls.db.close()

    def setUp(self):
        # Create a fresh document for each test
        self.document = Document(
            unit_id=self.unit.id,
            file_name="test_ingest.txt",
            file_type="text/plain",
            file_size=100,
            storage_path=self.txt_path.replace("\\", "/"), # Normalized
            uploaded_by=self.faculty.id,
            processing_status="PENDING"
        )
        self.db.add(self.document)
        self.db.commit()

    def tearDown(self):
        self.db.delete(self.document)
        self.db.commit()

    def test_ingestion_success(self):
        res = self.client.post(
            f"/api/v1/documents/{self.document.id}/process",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]
        self.assertEqual(data["processing_status"], "COMPLETED")
        
        self.db.refresh(self.document)
        self.assertEqual(self.document.processing_status, "COMPLETED")
        self.assertEqual(self.document.extracted_text, "Hello TXT Extraction")
        self.assertIsNotNone(self.document.processed_at)

    def test_ingestion_file_not_found(self):
        self.document.storage_path = "non_existent.txt"
        self.db.commit()
        
        res = self.client.post(
            f"/api/v1/documents/{self.document.id}/process",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(res.status_code, 500)
        
        self.db.refresh(self.document)
        self.assertEqual(self.document.processing_status, "FAILED")

    def test_ingestion_rbac_faculty_allowed(self):
        res = self.client.post(
            f"/api/v1/documents/{self.document.id}/process",
            headers={"Authorization": f"Bearer {self.faculty_token}"}
        )
        self.assertEqual(res.status_code, 200)

    def test_ingestion_rbac_faculty_denied(self):
        res = self.client.post(
            f"/api/v1/documents/{self.document.id}/process",
            headers={"Authorization": f"Bearer {self.faculty2_token}"}
        )
        self.assertEqual(res.status_code, 403)

    def test_ingestion_rbac_student_denied(self):
        res = self.client.post(
            f"/api/v1/documents/{self.document.id}/process",
            headers={"Authorization": f"Bearer {self.student_token}"}
        )
        self.assertEqual(res.status_code, 403)
        
    def test_ingestion_already_completed(self):
        self.document.processing_status = "COMPLETED"
        self.db.commit()
        
        res = self.client.post(
            f"/api/v1/documents/{self.document.id}/process",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(res.status_code, 200)

if __name__ == "__main__":
    unittest.main()
