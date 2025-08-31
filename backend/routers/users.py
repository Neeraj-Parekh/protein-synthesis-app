"""
User management API endpoints

This module provides comprehensive user administration capabilities including
user profile management, role assignments, and administrative functions.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models.user import (
    UserDB, UserCreate, UserUpdate, UserResponse, UserRole, UserStatus
)
from services.user_service import UserService
from routers.auth import get_current_user, get_current_admin_user

router = APIRouter(
    prefix="/users",
    tags=["User Management"],
    responses={
        404: {"description": "User not found"},
        403: {"description": "Insufficient permissions"},
        500: {"description": "Internal server error"}
    }
)

@router.get("/", response_model=List[UserResponse], summary="List All Users")
async def list_users(
    skip: int = 0,
    limit: int = 100,
    role: Optional[UserRole] = None,
    status: Optional[UserStatus] = None,
    current_user: UserDB = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve a paginated list of all users (Admin only).

    Returns user information with filtering options by role and status.
    Only accessible by administrators.

    **Parameters:**
    - **skip**: Number of users to skip (for pagination)
    - **limit**: Maximum number of users to return
    - **role**: Filter by user role
    - **status**: Filter by user status

    **Returns:**
    - List of user information
    """
    user_service = UserService(db)
    users = await user_service.list_users(skip, limit, role, status)
    return users

@router.get("/me", response_model=UserResponse, summary="Get Current User")
async def get_current_user_profile(
    current_user: UserDB = Depends(get_current_user)
):
    """
    Get the current authenticated user's profile information.

    Returns complete profile information for the currently logged-in user.

    **Returns:**
    - Current user's profile data
    """
    return current_user

@router.get("/{user_id}", response_model=UserResponse, summary="Get User by ID")
async def get_user(
    user_id: int,
    current_user: UserDB = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific user (Admin only).

    **Parameters:**
    - **user_id**: Unique identifier of the user

    **Returns:**
    - Complete user information

    **Raises:**
    - 404: User not found
    - 403: Insufficient permissions
    """
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.put("/me", response_model=UserResponse, summary="Update Current User Profile")
async def update_current_user(
    user_update: UserUpdate,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the current user's profile information.

    Allows users to update their own profile information including
    name, email, and preferences.

    **Parameters:**
    - **user_update**: Updated user information

    **Returns:**
    - Updated user profile

    **Raises:**
    - 400: Invalid update data
    """
    user_service = UserService(db)
    updated_user = await user_service.update_user(current_user.id, user_update)
    return updated_user

@router.put("/{user_id}", response_model=UserResponse, summary="Update User by ID")
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: UserDB = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update a specific user's information (Admin only).

    **Parameters:**
    - **user_id**: Unique identifier of the user
    - **user_update**: Updated user information

    **Returns:**
    - Updated user information

    **Raises:**
    - 404: User not found
    - 403: Insufficient permissions
    """
    user_service = UserService(db)
    updated_user = await user_service.update_user(user_id, user_update)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return updated_user

@router.put("/{user_id}/role", summary="Update User Role")
async def update_user_role(
    user_id: int,
    new_role: UserRole,
    current_user: UserDB = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update a user's role (Admin only).

    **Parameters:**
    - **user_id**: Unique identifier of the user
    - **new_role**: New role to assign

    **Returns:**
    - Success confirmation

    **Raises:**
    - 404: User not found
    - 403: Insufficient permissions
    """
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.role = new_role.value
    db.commit()
    db.refresh(user)
    
    return {"message": f"User role updated to {new_role.value}"}

@router.put("/{user_id}/status", summary="Update User Status")
async def update_user_status(
    user_id: int,
    new_status: UserStatus,
    current_user: UserDB = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update a user's account status (Admin only).

    **Parameters:**
    - **user_id**: Unique identifier of the user
    - **new_status**: New status to assign

    **Returns:**
    - Success confirmation

    **Raises:**
    - 404: User not found
    - 403: Insufficient permissions
    """
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.status = new_status.value
    db.commit()
    db.refresh(user)
    
    return {"message": f"User status updated to {new_status.value}"}

@router.delete("/{user_id}", summary="Delete User")
async def delete_user(
    user_id: int,
    current_user: UserDB = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Permanently delete a user account (Admin only).

    **Parameters:**
    - **user_id**: Unique identifier of the user to delete

    **Returns:**
    - Success confirmation

    **Raises:**
    - 404: User not found
    - 403: Insufficient permissions
    - 400: Cannot delete own account
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}

@router.get("/stats/overview", summary="Get User Statistics")
async def get_user_statistics(
    current_user: UserDB = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive user statistics (Admin only).

    **Returns:**
    - User count by role and status
    - Registration trends
    - Activity metrics

    **Raises:**
    - 403: Insufficient permissions
    """
    user_service = UserService(db)
    stats = await user_service.get_user_statistics()
    return stats
