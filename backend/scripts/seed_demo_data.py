import sys
import os
import uuid
from datetime import datetime
from pathlib import Path

# Ensure backend directory is in the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.db.session import SessionLocal
from app.core.security import get_password_hash
from app.core.config import settings
from app.auth.models import Role, User
from app.auth.constants import ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT
from app.department.models import Department
from app.subject.models import Subject, Unit, UnitTopic
from app.document.models import Document
from app.ai.models import PooledQuestion

def seed_demo_data():
    db = SessionLocal()
    
    print("--- Seeding Demo Data ---")
    password = "QRepo@Demo2026!"
    hashed_pwd = get_password_hash(password)

    # 1. ROLES
    print("Seeding Roles...")
    roles = {
        ROLE_ADMIN: "System Administrator",
        ROLE_HOD: "Head of Department",
        ROLE_FACULTY: "Faculty Member",
        ROLE_STUDENT: "Student"
    }
    role_objs = {}
    for r_name, r_desc in roles.items():
        r = db.query(Role).filter(Role.name == r_name).first()
        if not r:
            r = Role(name=r_name, description=r_desc)
            db.add(r)
            db.commit()
            db.refresh(r)
        role_objs[r_name] = r

    # 2. DEPARTMENTS
    print("Seeding Departments...")
    depts_data = [
        {"name": "Computer Science and Engineering", "code": "CSE"},
        {"name": "Artificial Intelligence and Machine Learning", "code": "AIML"},
    ]
    dept_objs = {}
    for d_data in depts_data:
        d = db.query(Department).filter(Department.code == d_data["code"]).first()
        if not d:
            d = Department(name=d_data["name"], code=d_data["code"])
            db.add(d)
            db.commit()
            db.refresh(d)
        dept_objs[d_data["code"]] = d

    # USERS HELPERS
    def get_or_create_user(email, full_name, role_name, dept_code=None):
        u = db.query(User).filter(User.email == email).first()
        if not u:
            dept_id = dept_objs[dept_code].id if dept_code else None
            u = User(
                email=email,
                hashed_password=hashed_pwd,
                is_active=True,
                full_name=full_name,
                role_id=role_objs[role_name].id,
                department_id=dept_id
            )
            db.add(u)
            db.commit()
            db.refresh(u)
        return u

    # 3 & 4 & 5 & 6. USERS (Admin, HOD, Faculty, Student)
    print("Seeding Users...")
    admin = get_or_create_user("admin@qrepo.edu", "System Administrator", ROLE_ADMIN)
    
    hod_cse = get_or_create_user("hod.cse@qrepo.edu", "Dr. Rajesh Mehta", ROLE_HOD, "CSE")
    dept_objs["CSE"].hod_id = hod_cse.id
    
    hod_aiml = get_or_create_user("hod.aiml@qrepo.edu", "Dr. Neha Shah", ROLE_HOD, "AIML")
    dept_objs["AIML"].hod_id = hod_aiml.id
    db.commit()

    faculty_cse1 = get_or_create_user("faculty.cse1@qrepo.edu", "Prof. Amit Patel", ROLE_FACULTY, "CSE")
    faculty_cse2 = get_or_create_user("faculty.cse2@qrepo.edu", "Dr. Priya Desai", ROLE_FACULTY, "CSE")
    faculty_aiml1 = get_or_create_user("faculty.aiml1@qrepo.edu", "Prof. Kunal Shah", ROLE_FACULTY, "AIML")
    faculty_aiml2 = get_or_create_user("faculty.aiml2@qrepo.edu", "Dr. Riya Mehta", ROLE_FACULTY, "AIML")
    
    student1 = get_or_create_user("student1@qrepo.edu", "Aarav Patel", ROLE_STUDENT)
    student2 = get_or_create_user("student2@qrepo.edu", "Ananya Shah", ROLE_STUDENT)

    # 7 & 8. SUBJECTS AND ASSIGNMENTS
    print("Seeding Subjects...")
    subjects_data = [
        {"code": "CS301", "name": "Database Management Systems", "faculty": faculty_cse1},
        {"code": "CS302", "name": "Operating Systems", "faculty": faculty_cse2},
        {"code": "CS303", "name": "Software Engineering", "faculty": faculty_cse1},
        {"code": "AI401", "name": "Artificial Intelligence", "faculty": faculty_aiml1},
        {"code": "AI402", "name": "Machine Learning", "faculty": faculty_aiml2},
    ]
    subject_objs = {}
    for s_data in subjects_data:
        s = db.query(Subject).filter(Subject.code == s_data["code"]).first()
        if not s:
            s = Subject(name=s_data["name"], code=s_data["code"], faculty_id=s_data["faculty"].id)
            db.add(s)
            db.commit()
            db.refresh(s)
        elif s.faculty_id != s_data["faculty"].id:
            s.faculty_id = s_data["faculty"].id
            db.commit()
        subject_objs[s_data["code"]] = s

    # 9. UNITS
    print("Seeding Units...")
    units_data = {
        "CS301": [
            "Introduction to Database Systems",
            "Relational Model and SQL",
            "Database Normalization",
            "Transactions and Concurrency Control",
            "Indexing and Query Processing"
        ],
        "CS302": [
            "Introduction to Operating Systems",
            "Process Management",
            "Memory Management",
            "File Systems",
            "Deadlocks"
        ],
        "CS303": [
            "Software Engineering Fundamentals",
            "Software Development Life Cycle",
            "Requirements Engineering",
            "Software Design",
            "Software Testing"
        ],
        "AI401": [
            "Introduction to Artificial Intelligence",
            "Intelligent Agents",
            "Search Techniques",
            "Knowledge Representation",
            "Machine Learning Fundamentals"
        ],
        "AI402": [
            "Introduction to Machine Learning",
            "Data Preprocessing",
            "Supervised Learning",
            "Unsupervised Learning",
            "Model Evaluation"
        ]
    }
    
    unit_objs = {}
    for sub_code, unit_titles in units_data.items():
        s_id = subject_objs[sub_code].id
        unit_objs[sub_code] = []
        for i, title in enumerate(unit_titles, start=1):
            u = db.query(Unit).filter(Unit.subject_id == s_id, Unit.unit_number == i).first()
            if not u:
                u = Unit(subject_id=s_id, unit_number=i, title=title)
                db.add(u)
                db.commit()
                db.refresh(u)
            unit_objs[sub_code].append(u)

    # 10. UNIT TOPICS
    print("Seeding Topics...")
    topics_data = {
        "CS301": [
            "Database Architecture", "ER Model", "Relational Algebra", "SQL Queries",
            "Functional Dependencies", "Normal Forms", "Transactions", "ACID Properties",
            "Concurrency Control", "B-Trees and Indexing"
        ],
        "CS302": [
            "Process States", "CPU Scheduling", "Threads", "Paging", "Virtual Memory",
            "File Allocation", "Directory Structures", "Deadlock Detection", "Deadlock Prevention"
        ],
        "AI401": [
            "AI Foundations", "Rational Agents", "Breadth First Search", "Depth First Search",
            "A* Search", "Knowledge Representation", "Expert Systems", "Introduction to Machine Learning"
        ],
        "AI402": [
            "Data Cleaning", "Feature Engineering", "Linear Regression", "Logistic Regression",
            "Decision Trees", "K-Means", "Cross Validation", "Confusion Matrix"
        ]
    }
    
    for sub_code, topics in topics_data.items():
        if sub_code not in unit_objs:
            continue
        first_unit = unit_objs[sub_code][0]
        for i, t_title in enumerate(topics):
            t = db.query(UnitTopic).filter(UnitTopic.unit_id == first_unit.id, UnitTopic.title == t_title).first()
            if not t:
                t = UnitTopic(unit_id=first_unit.id, title=t_title, order_index=i)
                db.add(t)
        db.commit()

    # 11. DOCUMENTS
    print("Seeding Documents...")
    media_dir = Path(settings.DOCUMENT_STORAGE_DIR)
    media_dir.mkdir(parents=True, exist_ok=True)
    
    docs_data = {
        "CS301": ["DBMS Fundamentals and Relational Model.pdf", "SQL and Database Normalization.pdf", "Transactions and Concurrency Control.pdf"],
        "CS302": ["Process Management and CPU Scheduling.pdf", "Memory Management.pdf"],
        "AI401": ["Introduction to Artificial Intelligence.pdf", "Search Techniques and Intelligent Agents.pdf"],
        "AI402": ["Machine Learning Fundamentals.pdf", "Supervised Learning.pdf"]
    }
    
    for sub_code, files in docs_data.items():
        if sub_code not in unit_objs:
            continue
        first_unit = unit_objs[sub_code][0]
        uploader_id = subject_objs[sub_code].faculty_id
        
        for file_name in files:
            d = db.query(Document).filter(Document.unit_id == first_unit.id, Document.file_name == file_name).first()
            if not d:
                # Create fake file
                file_path = media_dir / file_name
                file_path.write_text(f"This is demo content for {file_name}.")
                
                d = Document(
                    unit_id=first_unit.id,
                    file_name=file_name,
                    file_type="application/pdf",
                    file_size=file_path.stat().st_size,
                    storage_path=str(file_path),
                    processing_status="COMPLETED",
                    extracted_text=f"Demo extracted text for {file_name}.",
                    processed_at=datetime.utcnow(),
                    uploaded_by=uploader_id
                )
                db.add(d)
        db.commit()

    # 12. QUESTION BANK
    print("Seeding Question Bank...")
    qb_data = [
        {
            "subject_code": "CS301",
            "question_text": "Explain the ACID properties of a database transaction and describe why each property is important.",
            "question_type": "LONG_ANSWER",
            "difficulty": "MEDIUM",
            "bloom_level": "UNDERSTAND",
            "marks": 5.0,
            "topic": "ACID Properties",
            "expected_answer": "Atomicity, Consistency, Isolation, and Durability.",
            "faculty": faculty_cse1
        },
        {
            "subject_code": "CS301",
            "question_text": "Which normal form eliminates partial dependency in a relational database?",
            "question_type": "MCQ",
            "difficulty": "EASY",
            "bloom_level": "UNDERSTAND",
            "marks": 2.0,
            "topic": "Normal Forms",
            "options": ["First Normal Form", "Second Normal Form", "Third Normal Form", "BCNF"],
            "correct_option_index": 1,
            "faculty": faculty_cse1
        }
    ]
    
    for q_data in qb_data:
        sub = subject_objs[q_data["subject_code"]]
        q = db.query(PooledQuestion).filter(
            PooledQuestion.subject_id == sub.id, 
            PooledQuestion.question_text == q_data["question_text"]
        ).first()
        
        if not q:
            q = PooledQuestion(
                subject_id=sub.id,
                added_by=q_data["faculty"].id,
                question_text=q_data["question_text"],
                question_type=q_data["question_type"],
                topic=q_data["topic"],
                difficulty=q_data["difficulty"],
                bloom_level=q_data["bloom_level"],
                marks=q_data["marks"],
                options=q_data.get("options"),
                correct_option_index=q_data.get("correct_option_index"),
                expected_answer=q_data.get("expected_answer"),
                quality_score=0.95
            )
            db.add(q)
    db.commit()

    # 13. ANALYTICS & RECENT AI GENERATIONS DATA
    print("Seeding Analytics Data...")
    from app.ai.models import AIGeneration, QuestionDraft
    from app.papers.models import Paper
    from datetime import timedelta, timezone
    
    now = datetime.now(timezone.utc)
    
    for i in range(12):
        # Scatter generations over the last 8 weeks
        gen_date = now - timedelta(days=i * 4 + 2)
        
        gen = AIGeneration(
            requested_by=faculty_cse1.id,
            subject_id=subject_objs["CS301"].id,
            unit_id=unit_objs["CS301"][0].id,
            parameters_json={"topic": "Demo Topic", "mark_distribution": {"2": 5}},
            prompt_version="v1",
            provider="gemini",
            model_name="gemini-1.5-pro",
            status="SUCCESS",
            validation_status="PASS",
            question_count=5,
            questions_returned=5,
            quality_score=0.85 + (i % 5 * 0.02),
            generation_attempts=1,
            provider_calls=1,
            latency_ms=1500,
            context_available=False,
            created_at=gen_date
        )
        db.add(gen)
        db.commit()
        db.refresh(gen)
        
        # Latest 3 generations are awaiting review (DRAFT)
        if i < 3:
            for j in range(5):
                draft = QuestionDraft(
                    generation_id=gen.id,
                    subject_id=subject_objs["CS301"].id,
                    unit_id=unit_objs["CS301"][0].id,
                    position=j,
                    question_text=f"Awaiting review question {j} for {gen_date.strftime('%Y-%m-%d')}",
                    question_type="MCQ",
                    topic="Demo Topic",
                    difficulty="MEDIUM",
                    bloom_level="APPLY",
                    marks=2.0,
                    options=["A", "B", "C", "D"],
                    correct_option_index=0,
                    validation_status="PASS",
                    faculty_review_status="DRAFT",
                    ai_original={"question_text": "Original text"},
                    created_at=gen_date
                )
                db.add(draft)
        else:
            # Older ones are ACCEPTED, some REJECTED
            bloom_levels = ["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"]
            for j in range(5):
                status = "ACCEPTED" if j < 4 else "REJECTED"
                bloom = bloom_levels[j % len(bloom_levels)]
                draft = QuestionDraft(
                    generation_id=gen.id,
                    subject_id=subject_objs["CS301"].id,
                    unit_id=unit_objs["CS301"][0].id,
                    position=j,
                    question_text=f"{status.capitalize()} question {j} for {gen_date.strftime('%Y-%m-%d')}",
                    question_type="MCQ",
                    topic="Demo Topic",
                    difficulty="MEDIUM",
                    bloom_level=bloom,
                    marks=2.0,
                    options=["A", "B", "C", "D"],
                    correct_option_index=0,
                    validation_status="PASS",
                    faculty_review_status=status,
                    ai_original={"question_text": "Original text"},
                    created_at=gen_date,
                    reviewed_at=gen_date + timedelta(days=1),
                    reviewed_by=faculty_cse1.id
                )
                db.add(draft)
    
    db.commit()

    # 14. PAPERS
    print("Seeding Papers...")
    for i in range(3):
        status = "APPROVED" if i == 0 else "SUBMITTED" if i == 1 else "DRAFT"
        paper = Paper(
            title=f"Midterm Exam {i+1} (Demo)",
            subject_id=subject_objs["CS301"].id,
            created_by=faculty_cse1.id,
            exam_type="Midterm",
            duration_minutes=90,
            blueprint={"units": [], "marks": 50},
            status=status,
            version=1
        )
        db.add(paper)
    db.commit()

    db.close()
    print("--- Seed Complete ---")

if __name__ == "__main__":
    seed_demo_data()
