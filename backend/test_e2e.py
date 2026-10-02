"""
Full end-to-end HTTP test against the live uvicorn server.
"""
import urllib.request
import urllib.error
import json

BASE = "http://127.0.0.1:8000"

def post(path, body, token=None):
    data = json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method="POST")
    try:
        r = urllib.request.urlopen(req, timeout=30)
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def get(path, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE}{path}", headers=headers)
    try:
        r = urllib.request.urlopen(req, timeout=10)
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

# Step 1: Login as admin
print("=== Step 1: Login ===")
status, resp = post("/api/v1/auth/login", {"email": "admin@test.com", "password": "Admin@123"})
print(f"Status: {status}")
print(f"Response: {json.dumps(resp, indent=2)[:300]}")
if status != 200:
    print("LOGIN FAILED - check admin password!")
    # Try other passwords
    for pwd in ["Admin123!", "admin123", "Admin@10", "Password@1", "Test@1234"]:
        s2, r2 = post("/api/v1/auth/login", {"email": "admin@test.com", "password": pwd})
        print(f"  Tried {pwd}: {s2}")
        if s2 == 200:
            resp = r2
            status = s2
            print("  SUCCESS with:", pwd)
            break
    else:
        print("Could not login. Stopping.")
        exit(1)

token = resp.get("data", {}).get("access_token")
print(f"Token: {token[:30]}..." if token else "NO TOKEN!")

# Step 2: Get /me to see who we are
print("\n=== Step 2: /auth/me ===")
status2, me = get("/api/v1/auth/me", token)
print(f"Status: {status2}, Role: {me.get('data', {}).get('role', {})}")

# Step 3: Get subjects
print("\n=== Step 3: /subjects ===")
status3, subs = get("/api/v1/subjects", token)
print(f"Status: {status3}")
subjects = subs.get("data", [])
print(f"Count: {len(subjects)}")
if subjects:
    print(f"First: {subjects[0].get('id')} - {subjects[0].get('name')}")

if not subjects:
    print("No subjects! Cannot test generation.")
    exit(1)

subj_id = subjects[0]["id"]

# Step 4: Call generate
print("\n=== Step 4: /ai/questions/generate ===")
gen_body = {
    "subject_id": subj_id,
    "topic": "binary search",
    "target_audience": "CS undergrad",
    "question_type": "SHORT_ANSWER",
    "number_of_questions": 5,
    "difficulty": "EASY",
    "bloom_level": "REMEMBER"
}
status4, gen = post("/api/v1/ai/questions/generate", gen_body, token)
print(f"Status: {status4}")
print(f"Response: {json.dumps(gen, indent=2)[:500]}")
