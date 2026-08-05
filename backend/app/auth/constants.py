# Token settings
TOKEN_TYPE = "Bearer"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Password validation
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128

# Requires at least one letter, one number, and one special character
PASSWORD_REGEX = (
    r"^(?=.*[A-Za-z])"
    r"(?=.*\d)"
    r"(?=.*[@$!%*#?&])"
    r"[A-Za-z\d@$!%*#?&]{8,128}$"
)

# Role defaults and constants
DEFAULT_ROLE = "Student"

ROLE_ADMIN = "Admin"
ROLE_HOD = "HOD"
ROLE_FACULTY = "Faculty"
ROLE_STUDENT = "Student"
