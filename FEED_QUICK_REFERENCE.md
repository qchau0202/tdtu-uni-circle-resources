# Feed Service - Quick Reference

## Base URL
```
http://localhost:3004/api/feed
```

## Authentication
All write operations require JWT token:
```
Authorization: Bearer <token>
```

## Quick API Reference

### 📝 Create a Thread
```bash
POST /api/feed/threads
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": "Just finished reviewing Database Systems!",
  "tags": ["Q&A", "Database Systems"],
  "visibility": "public"
}
```

### 👀 View All Threads
```bash
GET /api/feed/threads?tags=Q&A&search=database
```

### 💬 Add a Comment
```bash
POST /api/feed/threads/{threadId}/comments
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": "Great question! Have you checked the lecture notes?"
}
```

### ↩️ Reply to Comment
```bash
POST /api/feed/threads/{threadId}/comments
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": "Thanks! That helped a lot.",
  "parent_comment_id": "parent-comment-uuid"
}
```

### ✏️ Edit Thread
```bash
PUT /api/feed/threads/{threadId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": "Updated content here..."
}
```

### 🔒 Close Thread
```bash
POST /api/feed/threads/{threadId}/close
Authorization: Bearer <token>
```

### 🗑️ Delete Thread
```bash
DELETE /api/feed/threads/{threadId}
Authorization: Bearer <token>
```

### ♻️ Restore Thread
```bash
POST /api/feed/threads/{threadId}/restore
Authorization: Bearer <token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "thread": { ... },
  "count": 25
}
```

### Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": ["content is required"],
    "status": 400
  }
}
```

## Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Validation Error |
| 401 | Authentication Required |
| 403 | Permission Denied |
| 404 | Not Found |
| 500 | Server Error |

## Thread Object Structure

```json
{
  "id": "uuid",
  "owner_id": "uuid",
  "content": "Thread content...",
  "tags": ["Q&A", "Database"],
  "visibility": "public",
  "allowed_viewers": [],
  "likes_count": 15,
  "comments_count": 8,
  "status": "open",
  "is_edited": false,
  "is_deleted": false,
  "attachments": {
    "images": [{"id": "img1", "url": "..."}],
    "videos": []
  },
  "owner": {
    "id": "uuid",
    "student_code": "520H0001",
    "email": "student@tdtu.edu.vn",
    "full_name": "Student Name"
  },
  "created_at": "2025-12-07T10:00:00Z",
  "updated_at": "2025-12-07T10:00:00Z"
}
```

## Comment Object Structure

```json
{
  "id": "uuid",
  "thread_id": "uuid",
  "user_id": "uuid",
  "content": "Comment content...",
  "parent_comment_id": null,
  "likes_count": 3,
  "is_edited": false,
  "user": {
    "id": "uuid",
    "student_code": "520H0002",
    "email": "student2@tdtu.edu.vn",
    "full_name": "Student Name 2"
  },
  "parent_comment": null,
  "created_at": "2025-12-07T10:05:00Z",
  "updated_at": "2025-12-07T10:05:00Z"
}
```

## Query Parameters

### GET /api/feed/threads

| Parameter | Type | Description |
|-----------|------|-------------|
| tags | string | Comma-separated tags: `tags=Q&A,Database` |
| visibility | string | Filter: `public` or `private` |
| status | string | Filter: `open` or `closed` |
| search | string | Search in content: `search=database` |
| includeDeleted | boolean | Include deleted (owner only): `includeDeleted=true` |

## Private Threads Example

Create a private thread visible only to specific users:

```bash
POST /api/feed/threads
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": "Statistics assignment help needed",
  "tags": ["Help", "Statistics"],
  "visibility": "private",
  "allowed_viewers": [
    "user-uuid-1",
    "user-uuid-2",
    "user-uuid-3"
  ]
}
```

## Validation Rules

### Thread Content
- Required
- Max 10,000 characters
- Non-empty string

### Comment Content
- Required
- Max 5,000 characters
- Non-empty string

### Tags
- Array of strings
- Each tag max 50 characters

### Visibility
- Must be "public" or "private"
- If private, allowed_viewers required

## Important Notes

1. **Edit Indicator**: Frontend should show "Edited" badge when `is_edited: true`
2. **Closed Threads**: Cannot add new comments to closed threads
3. **Deleted Threads**: Can be restored within 30 days only
4. **Reply Structure**: Use `parent_comment_id` to create threaded replies
5. **Permission**: Only owners can edit, close, or delete their threads/comments

## Swagger Documentation

Complete interactive API docs available at:
```
http://localhost:3004/api-docs
```

Look for sections:
- **Feed - Threads**
- **Feed - Comments**

## Testing with cURL

### Create Thread
```bash
curl -X POST http://localhost:3004/api/feed/threads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content": "Test thread",
    "tags": ["Q&A"],
    "visibility": "public"
  }'
```

### Get All Threads
```bash
curl -X GET "http://localhost:3004/api/feed/threads?tags=Q&A"
```

### Add Comment
```bash
curl -X POST http://localhost:3004/api/feed/threads/THREAD_ID/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content": "Test comment"
  }'
```

## Common Use Cases

### 1. Q&A Thread
```json
{
  "content": "[503001] Database Systems - How to normalize to 3NF?",
  "tags": ["Q&A", "Database Systems", "503001"],
  "visibility": "public"
}
```

### 2. Study Group Discussion
```json
{
  "content": "Study group for final exam preparation",
  "tags": ["Study Group", "Final Exam"],
  "visibility": "private",
  "allowed_viewers": ["uuid1", "uuid2", "uuid3"]
}
```

### 3. Resource Sharing Thread
```json
{
  "content": "Found great resources for Statistics!",
  "tags": ["Resources", "Statistics"],
  "visibility": "public",
  "attachments": {
    "images": [
      {"url": "https://example.com/image.jpg"}
    ]
  }
}
```

## Frontend Integration Tips

### Display Thread
```javascript
// Show edited indicator
{thread.is_edited && <span className="badge">Edited</span>}

// Show status badge
{thread.status === 'closed' && <span className="badge">Closed</span>}

// Show visibility icon
{thread.visibility === 'private' && <LockIcon />}
```

### Display Comment with Reply
```javascript
{comment.parent_comment && (
  <div className="reply-indicator">
    Replying to @{comment.parent_comment.user.student_code}
  </div>
)}
```

### Action Buttons (Owner Only)
```javascript
{thread.owner_id === currentUserId && (
  <>
    <button onClick={handleEdit}>Edit</button>
    <button onClick={handleClose}>Close</button>
    <button onClick={handleDelete}>Delete</button>
  </>
)}
```
