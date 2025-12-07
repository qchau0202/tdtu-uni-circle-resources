# Feed Service - Reply System & Architecture

## Reply System Flow

### How Replies Work (Matching Blue Screen Reference)

```
┌─────────────────────────────────────────────────────────────┐
│ Thread: "[503001] Database Systems midterm Q&A"            │
│ Author: Hieu Nguyen                                         │
│ Content: "Just finished reviewing Database Systems.        │
│          The concepts are getting clearer now!"            │
│ Tags: Q&A, Database Systems Discussion                     │
│ Status: Open                                                │
└─────────────────────────────────────────────────────────────┘
    │
    ├─ 💬 Comment 1 (id: c1)
    │  ├─ Author: Khanh Le
    │  ├─ Content: "Check out the 3NF rules!"
    │  └─ parent_comment_id: null
    │      │
    │      └─ ↩️ Reply to Comment 1 (id: r1)
    │         ├─ Author: Hieu Nguyen
    │         ├─ Content: "Thanks! Found it helpful"
    │         ├─ parent_comment_id: c1
    │         └─ parent_comment: { id: c1, content: "...", user_id: "..." }
    │
    ├─ 💬 Comment 2 (id: c2)
    │  ├─ Author: Hung Tran
    │  ├─ Content: "Here's a great resource"
    │  └─ parent_comment_id: null
    │      │
    │      └─ ↩️ Reply to Comment 2 (id: r2)
    │         ├─ Author: Khanh Le
    │         ├─ Content: "This helped me too!"
    │         ├─ parent_comment_id: c2
    │         └─ parent_comment: { id: c2, content: "...", user_id: "..." }
    │
    └─ 💬 Comment 3 (id: c3)
       ├─ Author: Student X
       ├─ Content: "Great discussion!"
       └─ parent_comment_id: null
```

## Frontend Display Example (Blue Screen Reference)

```
┌────────────────────────────────────────────────────────────┐
│ 👤 Hieu Nguyen  •  Friend  •  3 weeks ago                 │
│                                                             │
│ [503001] Database Systems midterm Q&A                      │
│                                                             │
│ Just finished reviewing Database Systems.                  │
│ The concepts are getting clearer now!                      │
│                                                             │
│ 🏷️ Q&A thread  📊 Database Systems Discussion             │
│                                                             │
│ ❤️ 4   💬 2                                                │
└────────────────────────────────────────────────────────────┘

┌─ Comments ──────────────────────────────────────────────────┐
│                                                             │
│ 👤 Khanh Le                                  2 weeks ago   │
│ Check out the 3NF rules in lecture notes!                  │
│ ❤️ 3   ↩️ Reply                                            │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐ │
│   │ 👤 Hieu Nguyen               1 week ago             │ │
│   │ ↩️ Replying to Khanh Le                             │ │
│   │ Thanks! Found those notes very helpful.             │ │
│   │ ❤️ 1   ↩️ Reply                                     │ │
│   └─────────────────────────────────────────────────────┘ │
│                                                             │
│ 👤 Hung Tran                                 2 weeks ago   │
│ Here's a great resource for normalization                  │
│ ❤️ 5   ↩️ Reply                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Data Structure in Database

### Threads Table
```sql
threads
├── id (PK)
├── owner_id (FK → students)
├── content
├── tags (array)
├── visibility
├── allowed_viewers (array)
├── likes_count
├── comments_count
├── status
├── attachments (JSONB)
├── is_deleted
├── deleted_at
├── is_edited
├── created_at
└── updated_at
```

### Comments Table (with Self-Reference)
```sql
comments
├── id (PK)
├── thread_id (FK → threads)
├── user_id (FK → students)
├── content
├── parent_comment_id (FK → comments) ← Reply Reference!
├── likes_count
├── is_edited
├── created_at
└── updated_at
```

## API Request/Response Examples

### 1. Get Comments with Reply Structure

**Request:**
```http
GET /api/feed/threads/550e8400-e29b-41d4-a716-446655440000/comments
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 4,
  "comments": [
    {
      "id": "c1",
      "thread_id": "550e8400-...",
      "user_id": "u1",
      "content": "Check out the 3NF rules!",
      "parent_comment_id": null,
      "likes_count": 3,
      "is_edited": false,
      "user": {
        "id": "u1",
        "student_code": "520H0001",
        "email": "khanh@tdtu.edu.vn",
        "full_name": "Khanh Le"
      },
      "parent_comment": null,
      "created_at": "2025-11-20T10:00:00Z",
      "updated_at": "2025-11-20T10:00:00Z"
    },
    {
      "id": "r1",
      "thread_id": "550e8400-...",
      "user_id": "u2",
      "content": "Thanks! Found those notes very helpful.",
      "parent_comment_id": "c1",
      "likes_count": 1,
      "is_edited": false,
      "user": {
        "id": "u2",
        "student_code": "520H0002",
        "email": "hieu@tdtu.edu.vn",
        "full_name": "Hieu Nguyen"
      },
      "parent_comment": {
        "id": "c1",
        "content": "Check out the 3NF rules!",
        "user_id": "u1"
      },
      "created_at": "2025-11-27T15:30:00Z",
      "updated_at": "2025-11-27T15:30:00Z"
    }
  ]
}
```

### 2. Create a Reply

**Request:**
```http
POST /api/feed/threads/550e8400-e29b-41d4-a716-446655440000/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Thanks! Found those notes very helpful.",
  "parent_comment_id": "c1"
}
```

**Response:**
```json
{
  "success": true,
  "comment": {
    "id": "r1",
    "thread_id": "550e8400-...",
    "user_id": "u2",
    "content": "Thanks! Found those notes very helpful.",
    "parent_comment_id": "c1",
    "likes_count": 0,
    "is_edited": false,
    "user": { ... },
    "parent_comment": {
      "id": "c1",
      "content": "Check out the 3NF rules!",
      "user_id": "u1"
    },
    "created_at": "2025-11-27T15:30:00Z",
    "updated_at": "2025-11-27T15:30:00Z"
  }
}
```

## Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                                │
│              (Web App / Mobile App)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP Request
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXPRESS SERVER                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              feed_routes.js                          │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  • Route definitions                          │  │   │
│  │  │  • Swagger documentation                      │  │   │
│  │  │  • Request mapping                            │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           feed_controller.js                         │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  • Request validation                         │  │   │
│  │  │  • Authentication checks                      │  │   │
│  │  │  • Error mapping                              │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           feed_validator.js                          │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  • Input validation                           │  │   │
│  │  │  • Data sanitization                          │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            feed_service.js                           │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  • Business logic                             │  │   │
│  │  │  • Permission checks                          │  │   │
│  │  │  • Supabase integration                       │  │   │
│  │  │  • Comment reply logic                        │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └──────────────────────┬──────────────────────────────┘   │
└─────────────────────────┼────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   SUPABASE / POSTGRESQL                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    TABLES                            │   │
│  │  ┌──────────────┐          ┌──────────────┐        │   │
│  │  │   threads    │          │   comments   │        │   │
│  │  │              │          │              │        │   │
│  │  │ • id         │◄─────────┤ • thread_id  │        │   │
│  │  │ • owner_id   │          │ • user_id    │        │   │
│  │  │ • content    │          │ • content    │        │   │
│  │  │ • tags       │          │ • parent_id  │◄───┐   │   │
│  │  │ • visibility │          │ • is_edited  │    │   │   │
│  │  │ • status     │          │              │    │   │   │
│  │  │ • is_deleted │          └──────────────┘    │   │   │
│  │  │ • is_edited  │                 │            │   │   │
│  │  └──────────────┘                 │            │   │   │
│  │                                   │            │   │   │
│  │                      Self-Reference (Reply)   │   │   │
│  │                                   └────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              ROW LEVEL SECURITY                      │   │
│  │  • Public threads viewable by all                   │   │
│  │  • Private threads viewable by allowed_viewers      │   │
│  │  • Only owners can modify/delete                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Response
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  thread_model.js                             │
│                  comment_model.js                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  • Data transformation                                │  │
│  │  • Object mapping                                     │  │
│  │  • JSON serialization                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Integration Pattern

### React Component Example

```jsx
// Thread Component
function Thread({ thread }) {
  return (
    <div className="thread-card">
      <ThreadHeader 
        owner={thread.owner}
        createdAt={thread.created_at}
        isEdited={thread.is_edited}
      />
      
      <ThreadContent 
        content={thread.content}
        tags={thread.tags}
        attachments={thread.attachments}
      />
      
      <ThreadStats
        likesCount={thread.likes_count}
        commentsCount={thread.comments_count}
        status={thread.status}
      />
      
      <CommentSection threadId={thread.id} />
    </div>
  );
}

// Comment with Reply Support
function Comment({ comment }) {
  return (
    <div className="comment">
      {comment.parent_comment && (
        <ReplyIndicator parentComment={comment.parent_comment} />
      )}
      
      <CommentHeader 
        user={comment.user}
        createdAt={comment.created_at}
        isEdited={comment.is_edited}
      />
      
      <CommentContent content={comment.content} />
      
      <CommentActions
        commentId={comment.id}
        likesCount={comment.likes_count}
        onReply={handleReply}
      />
    </div>
  );
}

// Reply Indicator (Blue Screen Style)
function ReplyIndicator({ parentComment }) {
  return (
    <div className="reply-indicator">
      <ReplyIcon />
      <span>Replying to {parentComment.user.full_name}</span>
      <span className="parent-preview">
        "{truncate(parentComment.content, 50)}"
      </span>
    </div>
  );
}
```

## Key Design Decisions

1. **Self-Referencing Comments**: `parent_comment_id` enables infinite reply depth
2. **Soft Deletion**: Threads marked as deleted, not removed (30-day recovery)
3. **Counter Columns**: Denormalized counts for performance
4. **Edit Tracking**: `is_edited` flag for transparency
5. **Privacy Control**: RLS + application-level checks
6. **Status Management**: Open/closed for thread lifecycle
7. **Tag System**: Array field for flexible categorization
8. **JSONB Attachments**: Flexible media storage

## Performance Optimizations

1. **Indexes**:
   - `threads.owner_id`
   - `threads.created_at DESC`
   - `threads.tags` (GIN index)
   - `comments.thread_id`
   - `comments.parent_comment_id`

2. **Counter Columns**: 
   - Avoid COUNT(*) queries
   - Updated via triggers/functions

3. **RLS Policies**: 
   - Database-level filtering
   - Reduces application load

4. **JSONB Storage**: 
   - Flexible attachment structure
   - No additional tables needed
