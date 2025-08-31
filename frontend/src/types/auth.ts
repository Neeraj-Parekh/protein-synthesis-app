/**
 * Authentication and user management types
 */

export enum UserRole {
  ADMIN = 'admin',
  RESEARCHER = 'researcher',
  STUDENT = 'student',
  GUEST = 'guest'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

export interface User {
  id: number
  email: string
  username: string
  full_name?: string
  role: UserRole
  status: UserStatus
  is_verified: boolean
  last_login?: string
  created_at: string
  updated_at: string
  preferences?: Record<string, any>
}

export interface LoginRequest {
  username_or_email: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
  full_name?: string
  role?: UserRole
  preferences?: Record<string, any>
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirm {
  token: string
  new_password: string
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

export interface UpdateProfileRequest {
  email?: string
  username?: string
  full_name?: string
  preferences?: Record<string, any>
}
