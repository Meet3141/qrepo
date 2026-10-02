import sys, os
sys.path.insert(0, os.path.abspath('.'))

from sqlalchemy import text
from app.db.session import engine

print("=== Checking DB users & roles ===")
with engine.connect() as conn:
    rows = conn.execute(text(
        "SELECT u.email, r.name FROM users u LEFT JOIN roles r ON u.role_id=r.id"
    )).fetchall()
    for row in rows:
        print(f"  {row[0]} -> {row[1]}")

print()
print("=== Checking provider from fresh import ===")
# Clear any cached state
from app.ai import get_provider
get_provider.cache_clear()
p = get_provider()
print("Provider:", p)
print("Model:", p.model)
h = p.health_check()
print("Health available:", h.available)
print("Health error:", h.error_category)
