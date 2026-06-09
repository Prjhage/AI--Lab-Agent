from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text("SELECT email, password_hash FROM users"))
    users = res.fetchall()
    print("Users in DB:")
    for u in users:
        print(f"- {u[0]} (hash: {u[1][:10]}...)")
    
    if not users:
        print("NO USERS FOUND IN DATABASE")
