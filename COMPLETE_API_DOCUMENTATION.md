# Protein Synthesis Web Application - Complete API Documentation

## Overview

The Protein Synthesis Web Application provides a comprehensive platform for protein analysis, visualization, and AI-powered design. This API documentation covers all available endpoints and their functionality.

## Base URL
- **Development**: `http://localhost:8000`
- **Production**: `https://your-domain.com`

## Authentication

All protected endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Authentication Flow

1. **Register**: `POST /auth/register`
2. **Login**: `POST /auth/login`
3. **Use returned token** for subsequent requests

## API Endpoints

### Authentication (`/auth`)

#### Register New User
- **POST** `/auth/register`
- **Body**: `UserCreate`
- **Response**: `TokenResponse`

#### User Login
- **POST** `/auth/login`
- **Body**: `LoginRequest`
- **Response**: `TokenResponse`

#### Refresh Token
- **POST** `/auth/refresh`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `TokenResponse`

#### Logout
- **POST** `/auth/logout`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{"message": "Logged out successfully"}`

#### Password Reset Request
- **POST** `/auth/password-reset`
- **Body**: `PasswordResetRequest`
- **Response**: `{"message": "Reset email sent"}`

#### Password Reset Confirm
- **POST** `/auth/password-reset/confirm`
- **Body**: `PasswordResetConfirm`
- **Response**: `{"message": "Password reset successful"}`

#### Email Verification
- **POST** `/auth/verify-email/{token}`
- **Response**: `{"message": "Email verified successfully"}`

### Protein Management (`/proteins`)

#### Upload Protein Structure
- **POST** `/proteins/upload`
- **Body**: `multipart/form-data` with PDB file
- **Response**: `ProteinResponse`

#### List Proteins
- **GET** `/proteins/`
- **Query Params**: `skip`, `limit`
- **Response**: `List[ProteinResponse]`

#### Get Protein Details
- **GET** `/proteins/{protein_id}`
- **Response**: `ProteinResponse`

#### Get Protein Structure
- **GET** `/proteins/{protein_id}/structure`
- **Response**: `ProteinStructure`

#### Delete Protein
- **DELETE** `/proteins/{protein_id}`
- **Response**: `{"message": "Protein deleted successfully"}`

### AI Models (`/ai`)

#### Generate Protein Sequence
- **POST** `/ai/generate`
- **Body**: `GenerationConstraints`
- **Response**: Generated protein data

#### Optimize Protein Sequence
- **POST** `/ai/optimize`
- **Body**: `OptimizationRequest`
- **Response**: Optimized protein data

#### Predict 3D Structure
- **POST** `/ai/predict-structure`
- **Body**: `{"sequence": "MKLLVT..."}`
- **Response**: Predicted structure data

#### Validate Protein Sequence
- **POST** `/ai/validate`
- **Body**: `{"sequence": "MKLLVT..."}`
- **Response**: Validation results

#### Analyze Protein Properties
- **POST** `/ai/analyze-properties`
- **Body**: `{"sequence": "MKLLVT..."}`
- **Response**: Property analysis

#### Predict Protein Function
- **POST** `/ai/predict-function`
- **Body**: `{"sequence": "MKLLVT..."}`
- **Response**: Function predictions

#### Analyze Stability
- **POST** `/ai/analyze-stability`
- **Body**: `{"sequence": "MKLLVT...", "temperature": 37.0, "ph": 7.0}`
- **Response**: Stability analysis

#### Design Protein
- **POST** `/ai/design-protein`
- **Body**: `DesignRequirements`
- **Response**: Designed protein data

#### Get Model Status
- **GET** `/ai/models/status`
- **Response**: AI model status information

### Analysis (`/analysis`)

#### Analyze Protein Sequence
- **GET** `/analysis/{protein_id}/sequence`
- **Response**: `SequenceAnalysis`

#### Get Chemical Properties
- **GET** `/analysis/{protein_id}/properties`
- **Response**: `ChemicalProperties`

#### Get Secondary Structure
- **GET** `/analysis/{protein_id}/secondary-structure`
- **Response**: Secondary structure data

#### Compare Proteins
- **POST** `/analysis/compare`
- **Body**: `{"protein_ids": ["id1", "id2"], "comparison_type": "sequence"}`
- **Response**: Comparison results

### Export (`/export`)

#### Export Protein Data
- **POST** `/export/proteins`
- **Body**: `ExportRequest`
- **Response**: File or data in requested format

#### Export Analysis Results
- **POST** `/export/analysis`
- **Body**: `{"protein_id": "id", "analysis_type": "sequence", "format": "json"}`
- **Response**: Analysis data export

#### Export Visualization
- **POST** `/export/visualization`
- **Body**: Visualization settings
- **Response**: Image file

#### Export Session
- **GET** `/export/session/{session_id}`
- **Response**: Complete session archive

### User Management (`/users`)

#### List All Users (Admin)
- **GET** `/users/`
- **Query Params**: `skip`, `limit`, `role`, `status`
- **Response**: `List[UserResponse]`

#### Get Current User Profile
- **GET** `/users/me`
- **Response**: `UserResponse`

#### Get User by ID (Admin)
- **GET** `/users/{user_id}`
- **Response**: `UserResponse`

#### Update Current User Profile
- **PUT** `/users/me`
- **Body**: `UserUpdate`
- **Response**: `UserResponse`

#### Update User by ID (Admin)
- **PUT** `/users/{user_id}`
- **Body**: `UserUpdate`
- **Response**: `UserResponse`

#### Update User Role (Admin)
- **PUT** `/users/{user_id}/role`
- **Body**: `{"new_role": "admin"}`
- **Response**: Success message

#### Update User Status (Admin)
- **PUT** `/users/{user_id}/status`
- **Body**: `{"new_status": "active"}`
- **Response**: Success message

#### Delete User (Admin)
- **DELETE** `/users/{user_id}`
- **Response**: Success message

#### Get User Statistics (Admin)
- **GET** `/users/stats/overview`
- **Response**: User statistics

## Data Models

### Core Models

#### UserCreate
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "securepassword",
  "full_name": "John Doe",
  "role": "researcher"
}
```

#### LoginRequest
```json
{
  "username_or_email": "user@example.com",
  "password": "securepassword"
}
```

#### TokenResponse
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "username",
    "full_name": "John Doe",
    "role": "researcher",
    "status": "active",
    "is_verified": true,
    "created_at": "2025-08-30T10:00:00Z"
  }
}
```

#### ProteinResponse
```json
{
  "id": "protein_123",
  "name": "Sample Protein",
  "sequence": "MKLLVTFV...",
  "molecular_weight": 12345.67,
  "length": 150,
  "created_at": "2025-08-30T10:00:00Z",
  "protein_metadata": {
    "source": "PDB",
    "organism": "E. coli"
  }
}
```

#### GenerationConstraints
```json
{
  "length": [100, 200],
  "composition": {
    "A": 0.08,
    "L": 0.10
  },
  "properties": {
    "hydrophobicity": 0.5,
    "charge": 0.0
  },
  "template": "MKLLVT...",
  "model": "protflash"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "detail": "Invalid input data"
}
```

#### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

#### 403 Forbidden
```json
{
  "detail": "Insufficient permissions"
}
```

#### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

#### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

#### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

## User Roles and Permissions

### Role Hierarchy
1. **Admin**: Full system access
2. **Researcher**: Full protein analysis features
3. **Student**: Limited analysis features
4. **Guest**: Read-only access

### Permission Matrix

| Endpoint | Admin | Researcher | Student | Guest |
|----------|-------|------------|---------|-------|
| Upload Proteins | ✅ | ✅ | ✅ | ❌ |
| AI Generation | ✅ | ✅ | ✅ | ❌ |
| Advanced Analysis | ✅ | ✅ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ | ❌ |

## Rate Limiting

- **Authentication**: 5 requests per minute
- **AI Endpoints**: 10 requests per minute
- **General API**: 100 requests per minute
- **File Upload**: 5 requests per minute

## Best Practices

1. **Always use HTTPS** in production
2. **Store JWT tokens securely** (httpOnly cookies recommended)
3. **Implement proper error handling** for all API calls
4. **Use appropriate timeouts** for long-running operations
5. **Validate file uploads** before sending to server
6. **Implement retry logic** for transient failures

## SDKs and Libraries

### Python Client Example
```python
import requests

class ProteinAPI:
    def __init__(self, base_url, token=None):
        self.base_url = base_url
        self.token = token
    
    def login(self, username, password):
        response = requests.post(
            f"{self.base_url}/auth/login",
            json={"username_or_email": username, "password": password}
        )
        data = response.json()
        self.token = data["access_token"]
        return data
    
    def upload_protein(self, file_path, name):
        headers = {"Authorization": f"Bearer {self.token}"}
        with open(file_path, 'rb') as f:
            files = {"file": f}
            data = {"name": name}
            response = requests.post(
                f"{self.base_url}/proteins/upload",
                files=files,
                data=data,
                headers=headers
            )
        return response.json()
```

### JavaScript Client Example
```javascript
class ProteinAPI {
    constructor(baseUrl, token = null) {
        this.baseUrl = baseUrl;
        this.token = token;
    }

    async login(username, password) {
        const response = await fetch(`${this.baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username_or_email: username,
                password: password
            })
        });
        const data = await response.json();
        this.token = data.access_token;
        return data;
    }

    async generateProtein(constraints) {
        const response = await fetch(`${this.baseUrl}/ai/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify(constraints)
        });
        return response.json();
    }
}
```

## Changelog

### Version 1.0.0 (2025-08-30)
- Initial API release
- Complete authentication system
- Protein upload and management
- AI-powered protein generation
- Comprehensive analysis tools
- Export functionality
- User management system

### Planned Features
- Real-time collaboration
- Advanced visualization options
- Integration with external databases
- Machine learning model updates
- Mobile application support

## Support

For API support and questions:
- **Documentation**: [API Docs](http://localhost:8000/docs)
- **OpenAPI Spec**: [Swagger UI](http://localhost:8000/redoc)
- **Issues**: GitHub Issues
- **Contact**: support@protein-synthesis.com
