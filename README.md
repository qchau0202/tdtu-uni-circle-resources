# Resource Service

Resource microservice for TDTU Uni Circle platform. Handles resource sharing with file uploads, filtering, and CRUD operations.

## Features

- **Resource CRUD Operations**: Create, read, update, and delete resources
- **File Upload**: Upload files (images, documents, PDFs) to Cloudinary
- **Resource Filtering**: Filter resources by scope (all/my/following), course code, hashtag
- **Search Functionality**: Search resources by title and description
- **JWT Authentication**: Secure endpoints with JWT tokens from Supabase Auth
- **Ownership Validation**: Ensure users can only modify their own resources
- **Swagger Documentation**: Interactive API documentation at `/api-docs`

## Tech Stack

- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL via Supabase
- **File Storage**: Cloudinary
- **Authentication**: Supabase JWT
- **File Upload**: Multer (memory storage)
- **Documentation**: Swagger/OpenAPI 3.0

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database (via Supabase)
- Cloudinary account for file storage

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Update `.env` with your credentials:
```env
PORT=3004
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
API_KEY=your-api-key-here
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Running the Service

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The service will be available at `http://localhost:3004`

## API Endpoints

### Resources

- **GET** `/api/resources` - Get all resources with filtering
  - Query params: `filter` (all/my/following), `course_code`, `hashtag`, `search`
  - Requires: JWT token + API key

- **GET** `/api/resources/:id` - Get resource by ID
  - Requires: JWT token + API key

- **POST** `/api/resources` - Create new resource
  - Body: `{ title, description, resource_type, file_url, course_code, hashtags }`
  - Requires: JWT token + API key

- **PUT** `/api/resources/:id` - Update resource
  - Body: Any updatable fields
  - Requires: JWT token + API key + ownership

- **DELETE** `/api/resources/:id` - Delete resource
  - Requires: JWT token + API key + ownership

- **POST** `/api/resources/upload` - Upload file to Cloudinary
  - Form data: `file` (multipart/form-data, max 10MB)
  - Returns: `{ file_url, public_id, format, size }`
  - Requires: JWT token + API key

### Health Check

- **GET** `/health` - Service health status

### Documentation

- **GET** `/api-docs` - Swagger UI documentation

## Resource Object Schema

```json
{
  "id": "uuid",
  "owner_id": "uuid",
  "title": "string (max 255 chars)",
  "description": "string (max 5000 chars)",
  "resource_type": "URL | DOCUMENT",
  "file_url": "string (valid URL)",
  "course_code": "string (max 20 chars)",
  "hashtags": ["string (max 50 chars each)"],
  "upvote_count": "integer",
  "created_at": "timestamp",
  "owner": {
    "id": "uuid",
    "student_code": "string",
    "display_name": "string",
    "avatar_url": "string"
  }
}
```

## Authentication

All endpoints (except `/health` and `/api-docs`) require:

1. **API Key**: Include in header `x-api-key: your-api-key`
2. **JWT Token**: Include in header `Authorization: Bearer your-jwt-token`

The JWT token is validated with Supabase Auth and the user ID is extracted for ownership checks.

## File Upload

The `/upload` endpoint accepts multipart form data with a single file:

- **Supported formats**: Images (jpg, png, gif), Documents (pdf, doc, docx), etc.
- **Max file size**: 10MB
- **Storage**: Files are uploaded to Cloudinary with auto resource type detection
- **Returns**: Secure URL, public ID, format, and file size

Example using curl:
```bash
curl -X POST http://localhost:3004/api/resources/upload \
  -H "x-api-key: your-api-key" \
  -H "Authorization: Bearer your-jwt-token" \
  -F "file=@/path/to/file.pdf"
```

## Filtering Resources

### By Scope
- `filter=all` - All public resources (default)
- `filter=my` - Only resources owned by current user
- `filter=following` - Resources from users you follow (requires followers table)

### By Course
- `course_code=CSCI101` - Filter by specific course

### By Hashtag
- `hashtag=algorithms` - Filter by specific hashtag

### Search
- `search=machine learning` - Search in title and description

Example: Get all my resources for CSCI101 course:
```
GET /api/resources?filter=my&course_code=CSCI101
```

## Database Schema

The service uses the following tables:

- **resources**: Stores resource metadata
- **students**: User accounts
- **profiles**: User profile information
- **followers**: User follow relationships (for "following" filter)

See `auth_service/database_setup.sql` for full schema.

## Error Handling

All endpoints return errors in consistent format:
```json
{
  "error": {
    "message": "Error description",
    "status": 400
  }
}
```

Common status codes:
- `400` - Bad request (validation errors)
- `401` - Unauthorized (missing or invalid JWT)
- `403` - Forbidden (not the resource owner)
- `404` - Not found
- `500` - Internal server error

## Development

Project structure:
```
resource_service/
├── src/
│   ├── api/
│   │   ├── controllers/
│   │   │   └── resource_controller.js
│   │   ├── middlewares/
│   │   │   ├── api_key_middleware.js
│   │   │   ├── auth_middleware.js
│   │   │   └── rate_limiter_middleware.js
│   │   ├── routes/
│   │   │   └── resource_routes.js
│   │   └── validators/
│   │       └── resource_validator.js
│   ├── config/
│   │   ├── env.js
│   │   ├── index.js
│   │   └── swagger.js
│   ├── infrastructure/
│   │   ├── database/
│   │   │   └── supabase.js
│   │   └── storage/
│   │       └── cloudinary.js
│   ├── app.js
│   └── server.js
├── .env.example
├── package.json
└── README.md
```

## License

ISC

