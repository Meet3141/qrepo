from fastapi import APIRouter, Depends, status
from app.auth.schemas import UserCreate, UserResponse, LoginRequest, TokenResponse
from app.auth.service import AuthService
from app.auth.dependencies import get_auth_service
from app.shared.responses import APIResponse

router = APIRouter()

@router.post(
    "/register",
    response_model=APIResponse[UserResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new student"
)
def register(
    user_in: UserCreate,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Register a new user. The system will automatically assign the default Student role.
    """
    new_user = auth_service.register_user(user_in)
    return APIResponse(
        success=True,
        message="User registered successfully",
        data=new_user
    )


@router.post(
    "/login",
    response_model=APIResponse[TokenResponse],
    status_code=status.HTTP_200_OK,
    summary="Login to get an access token"
)
def login(
    login_in: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Authenticate a user using their email and password, returning a JWT token.
    """
    user = auth_service.authenticate_user(login_in)
    token = auth_service.create_user_token(user)
    
    return APIResponse(
        success=True,
        message="Login successful",
        data=token
    )
