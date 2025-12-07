# Feed Service - API Documentation

This service handles the Feed domain functionality including threads (Q&A posts) and comments with support for replies, privacy settings, soft deletion, and more.

## Features

### Thread Management
- ✅ Create threads with content, tags, and media attachments
- ✅ View threads (public and private with permission control)
- ✅ Update thread content and settings
- ✅ Close threads (make read-only)
- ✅ Reopen closed threads
- ✅ Soft delete threads (recoverable within 30 days)
- ✅ Restore deleted threads
- ✅ Filter threads by tags, visibility, status, and search
- ✅ Track likes and comments count
- ✅ Show "Edited" indicator when modified

### Comment Management
- ✅ Create comments on threads
- ✅ Reply to specific comments (with parent reference)
- ✅ Update comment content
- ✅ Delete comments
- ✅ Track likes count
- ✅ Show "Edited" indicator when modified

### Privacy & Permissions
- ✅ Public threads visible to all users
- ✅ Private threads visible only to owner and allowed viewers
- ✅ Permission checks on all operations
- ✅ Row-Level Security (RLS) in database

## Database Schema

### Threads Table
```sql
- id (UUID, PK)
- owner_id (UUID, FK to students)
- content (TEXT, max 10000 chars)
- tags (TEXT[])
- visibility (enum: 'public', 'private')
- allowed_viewers (UUID[])
- likes_count (INTEGER)
- comments_count (INTEGER)
- status (enum: 'open', 'closed')
- attachments (JSONB - images, videos)
- is_deleted (BOOLEAN)
- deleted_at (TIMESTAMP)
- is_edited (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Comments Table
```sql
- id (UUID, PK)
- thread_id (UUID, FK to threads)
- user_id (UUID, FK to students)
- content (TEXT, max 5000 chars)
- parent_comment_id (UUID, FK to comments - for replies)
- likes_count (INTEGER)
- is_edited (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## API Endpoints

### Thread Endpoints

#### GET `/api/feed/threads`
Get all threads with optional filtering.

**Query Parameters:**
- `tags` - Filter by tags (comma-separated)
- `visibility` - Filter by visibility (public/private)
- `status` - Filter by status (open/closed)
- `search` - Search in thread content
- `includeDeleted` - Include deleted threads (owner only)

**Response:**
```json
{
  "success": true,
  "count": 25,
  "threads": [...]
}
```

#### GET `/api/feed/threads/:id`
Get a specific thread by ID.

**Response:**
```json
{
  "success": true,
  "thread": {
    "id": "uuid",
    "owner_id": "uuid",
    "content": "Thread content...",
    "tags": ["Q&A", "Database Systems"],
    "visibility": "public",
    "likes_count": 15,
    "comments_count": 8,
    "status": "open",
    "is_edited": false,
    "owner": {...},
    "created_at": "2025-12-07T...",
    ...
  }
}
```

#### POST `/api/feed/threads`
Create a new thread. Requires authentication.

**Request Body:**
```json
{
  "content": "Just finished reviewing Database Systems!",
  "tags": ["Q&A", "Database Systems"],
  "visibility": "public",
  "allowed_viewers": [],
  "attachments": {
    "images": [
      {"id": "img1", "url": "https://..."}
    ],
    "videos": []
  }
}
```

#### PUT `/api/feed/threads/:id`
Update a thread. Only owner can update. Sets `is_edited` flag.

**Request Body:** (all fields optional)
```json
{
  "content": "Updated content...",
  "tags": ["Q&A", "Updated Tag"],
  "visibility": "private",
  "allowed_viewers": ["uuid1", "uuid2"]
}
```

#### POST `/api/feed/threads/:id/close`
Close a thread (make read-only). Only owner can close.

#### POST `/api/feed/threads/:id/reopen`
Reopen a closed thread. Only owner can reopen.

#### DELETE `/api/feed/threads/:id`
Soft delete a thread. Can be restored within 30 days. Only owner can delete.

#### POST `/api/feed/threads/:id/restore`
Restore a deleted thread within 30 days. Only owner can restore.

#### GET `/api/feed/threads/deleted`
Get all deleted threads for the current user (restorable within 30 days).

### Comment Endpoints

#### GET `/api/feed/threads/:threadId/comments`
Get all comments for a thread, including reply references.

**Response:**
```json
{
  "success": true,
  "count": 12,
  "comments": [
    {
      "id": "uuid",
      "thread_id": "uuid",
      "user_id": "uuid",
      "content": "Great question!",
      "parent_comment_id": null,
      "is_edited": false,
      "user": {...},
      "created_at": "2025-12-07T...",
      ...
    }
  ]
}
```

#### POST `/api/feed/threads/:threadId/comments`
Create a comment on a thread. Requires authentication.

**Request Body:**
```json
{
  "content": "Great question! Have you checked the lecture notes?",
  "parent_comment_id": "uuid or null"
}
```

**Notes:**
- Set `parent_comment_id` to reply to a specific comment
- Cannot comment on closed or deleted threads
- Private threads require permission to comment

#### PUT `/api/feed/comments/:commentId`
Update a comment. Only author can update. Sets `is_edited` flag.

**Request Body:**
```json
{
  "content": "Updated comment content..."
}
```

#### DELETE `/api/feed/comments/:commentId`
Delete a comment. Only author can delete.

## Usage Examples

### Creating a Public Q&A Thread
```javascript
POST /api/feed/threads
Authorization: Bearer <token>

{
  "content": "[503001] Database Systems midterm Q&A\n\nJust finished reviewing. The concepts are getting clearer now!",
  "tags": ["Q&A", "Database Systems", "503001"],
  "visibility": "public"
}
```

### Creating a Private Study Group Thread
```javascript
POST /api/feed/threads
Authorization: Bearer <token>

{
  "content": "Statistics assignment help needed",
  "tags": ["Help", "Statistics"],
  "visibility": "private",
  "allowed_viewers": ["user-uuid-1", "user-uuid-2", "user-uuid-3"]
}
```

### Replying to a Comment
```javascript
POST /api/feed/threads/:threadId/comments
Authorization: Bearer <token>

{
  "content": "Thanks for the suggestion! I found those notes very helpful.",
  "parent_comment_id": "parent-comment-uuid"
}
```

### Closing a Thread
```javascript
POST /api/feed/threads/:id/close
Authorization: Bearer <token>
```

### Searching Threads
```javascript
GET /api/feed/threads?search=database&tags=Q&A&status=open
```

## Workflow Examples

### Complete Thread Lifecycle
1. **Create** - User creates a thread
2. **Comment** - Other users add comments and replies
3. **Update** - Owner edits content (shows "Edited")
4. **Close** - Owner closes thread (read-only)
5. **Reopen** - Owner reopens if needed
6. **Delete** - Owner soft deletes thread
7. **Restore** - Owner restores within 30 days

### Comment Reply Structure
```
Thread: "How do I normalize a database?"
  ├─ Comment 1: "Check the 3NF rules"
  │   └─ Reply: "Thanks! Found it helpful" (parent_comment_id = Comment 1)
  └─ Comment 2: "Here's a great resource..."
      └─ Reply: "This helped me too!" (parent_comment_id = Comment 2)
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": ["Additional details if validation error"],
    "status": 400
  }
}
```

Common error codes:
- `VALIDATION_ERROR` - Request validation failed
- `AUTHENTICATION_REQUIRED` - Authentication token missing or invalid
- `FORBIDDEN` - Permission denied
- `THREAD_NOT_FOUND` - Thread doesn't exist
- `COMMENT_NOT_FOUND` - Comment doesn't exist
- `INVALID_UUID` - Invalid ID format

## Security Features

1. **Authentication Required** - All write operations require valid JWT token
2. **Authorization Checks** - Only owners can modify/delete their content
3. **Privacy Controls** - Private threads only visible to allowed users
4. **Row-Level Security** - Database-level access control
5. **Soft Deletion** - Threads recoverable within 30 days
6. **Closed Threads** - Read-only mode prevents spam

## Database Setup

Run the SQL script to set up the database:

```bash
psql -U your_user -d your_database -f feed_database_setup.sql
```

Or execute in Supabase SQL Editor:
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `feed_database_setup.sql`
3. Execute the script

## Integration with Other Services

The Feed service is part of the Resource Service and shares:
- Authentication middleware
- Rate limiting
- Error handling
- Supabase connection

## Swagger Documentation

Full API documentation available at:
```
http://localhost:3004/api-docs
```

Look for the "Feed - Threads" and "Feed - Comments" sections.

## Notes for Frontend Integration

1. **Edit Indicator**: Show "Edited" badge when `is_edited: true`
2. **Reply UI**: Use `parent_comment` data to display reply context
3. **Deleted Threads**: Only show restore option within 30 days
4. **Closed Threads**: Disable comment input on closed threads
5. **Private Threads**: Check visibility before rendering
6. **Attachments**: Parse `attachments` JSONB for images/videos

## Performance Considerations

- Indexes on frequently queried fields (owner_id, created_at, tags)
- Full-text search index on content
- Counter columns (likes_count, comments_count) for efficient aggregation
- Pagination recommended for large result sets

## Future Enhancements

- [ ] Likes functionality (currently just counts)
- [ ] Thread pinning
- [ ] Comment sorting options
- [ ] Notification on replies
- [ ] File upload support for attachments
- [ ] Trending threads algorithm
- [ ] Report/moderation system
