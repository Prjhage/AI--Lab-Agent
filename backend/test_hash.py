from app.utils.auth_helpers import hash_password, verify_password

test_pass = "TestPass123!"
hashed = hash_password(test_pass)
print(f"Hashed: {hashed}")

is_valid = verify_password(test_pass, hashed)
print(f"Is valid? {is_valid}")

try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")
    print("Passlib loaded fine.")
except Exception as e:
    print(f"Passlib error: {e}")
