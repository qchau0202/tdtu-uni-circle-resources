# File Management API - Frontend Guide

## Overview
This guide explains how to manage files (images, videos, documents) in resources using a simple, frontend-friendly approach.

---

## 🎯 Core Concept

**Files are stored in arrays by type:**
```javascript
{
  "media": {
    "images": [
      {"url": "...", "publicId": "...", "caption": "...", ...},  // images[0]
      {"url": "...", "publicId": "...", "caption": "...", ...}   // images[1]
    ],
    "videos": [
      {"url": "...", "publicId": "...", "caption": "...", ...}   // videos[0]
    ],
    "documents": [
      {"url": "...", "publicId": "...", "caption": "...", ...},  // documents[0]
      {"url": "...", "publicId": "...", "caption": "...", ...}   // documents[1]
    ],
    "urls": []
  }
}
```

**Index-based identification:**
- `images[0]` = first image
- `images[1]` = second image
- `documents[0]` = first document

---

## 📚 API Endpoints

### 1. Create Resource (POST)
**Endpoint:** `POST /api/resources`

**Request (form-data):**
```
Headers:
  Authorization: Bearer <JWT_TOKEN>

Body (form-data):
  title: "Resource Title"
  description: "Description text"
  course_code: "SOA501"
  resource_type: "DOCUMENT"
  hashtags: ["tutorial", "guide"]
  files: [file1.jpg]      // Attach files here
  files: [file2.pdf]      // Use same key "files" for multiple files
  files: [file3.mp4]
```

**Response:**
```json
{
  "success": true,
  "message": "Resource created successfully",
  "resource": {
    "id": "abc-123-def-456",
    "title": "Resource Title",
    "media": {
      "images": [
        {
          "url": "https://res.cloudinary.com/.../file1.jpg",
          "publicId": "resources/file1",
          "format": "jpg",
          "size": 245680,
          "originalName": "file1.jpg",
          "uploadedAt": "2025-12-05T10:30:00.000Z",
          "caption": null
        }
      ],
      "documents": [
        {
          "url": "https://res.cloudinary.com/.../file2.pdf",
          "publicId": "resources/file2",
          "format": "pdf",
          "size": 512000,
          "originalName": "file2.pdf",
          "uploadedAt": "2025-12-05T10:30:00.000Z",
          "caption": null
        }
      ],
      "videos": [
        {
          "url": "https://res.cloudinary.com/.../file3.mp4",
          "publicId": "resources/file3",
          "format": "mp4",
          "size": 1024000,
          "originalName": "file3.mp4",
          "uploadedAt": "2025-12-05T10:30:00.000Z",
          "caption": null
        }
      ]
    }
  }
}
```

**Note:** Files are automatically categorized by type:
- Images → `media.images[]`
- Videos → `media.videos[]`
- Documents (PDFs, DOCX, etc.) → `media.documents[]`

---

### 2. Update Resource (PUT)
**Endpoint:** `PUT /api/resources/:id`

This is the **main endpoint** for all file operations. There are 3 approaches:

---

#### **Approach A: Just Add New Files**

**Use Case:** Add more files to existing resource without modifying current files.

**Request (form-data):**
```
Headers:
  Authorization: Bearer <JWT_TOKEN>

Body (form-data):
  title: "Updated Title"              // Optional: update text fields
  description: "Updated description"  // Optional
  files: [new_file1.jpg]              // Attach new files
  files: [new_file2.pdf]
```

**What Happens:**
- Text fields updated (if provided)
- New files uploaded and added to appropriate arrays
- Existing files remain unchanged

---

#### **Approach B: Update File Captions/Metadata**

**Use Case:** Change caption or metadata without uploading new files.

**Step 1:** GET the resource first
```javascript
const response = await fetch('/api/resources/abc-123', {
  headers: { 'Authorization': 'Bearer <token>' }
});
const resource = await response.json();
```

**Step 2:** Modify the media object in frontend
```javascript
// Update caption for images[0]
resource.media.images[0].caption = "Updated caption";

// Update caption for documents[1]
resource.media.documents[1].caption = "Important document";
```

**Step 3:** Send back the modified media
```
Headers:
  Authorization: Bearer <JWT_TOKEN>

Body (form-data):
  media: JSON.stringify(resource.media)  // Send entire media object back
```

---

#### **Approach C: Remove Files**

**Use Case:** Delete specific files from resource.

**Step 1:** GET the resource
```javascript
const response = await fetch('/api/resources/abc-123', {
  headers: { 'Authorization': 'Bearer <token>' }
});
const resource = await response.json();
```

**Step 2:** Remove items from arrays
```javascript
// Remove images[1] (second image)
resource.media.images.splice(1, 1);

// Remove documents[0] (first document)
resource.media.documents.splice(0, 1);

// Remove all videos
resource.media.videos = [];
```

**Step 3:** Send back modified media
```
Headers:
  Authorization: Bearer <JWT_TOKEN>

Body (form-data):
  media: JSON.stringify(resource.media)
```

**Important:** 
- Files removed from the array are deleted from the database
- Files remain in Cloudinary storage (soft delete)
- Old URLs still work

---

#### **Approach D: Remove + Add (Replace)**

**Use Case:** Remove old files and add new ones in one request.

**Step 1:** Prepare modified media (remove unwanted files)
```javascript
const resource = await getResource(id);
resource.media.images.splice(0, 1);  // Remove first image
```

**Step 2:** Send modified media + new files
```
Headers:
  Authorization: Bearer <JWT_TOKEN>

Body (form-data):
  media: JSON.stringify(resource.media)  // With removed items
  files: [replacement_image.jpg]         // New file to add
  files: [another_doc.pdf]
```

**What Happens:**
1. Updates media structure (removes specified files)
2. Uploads new files
3. Adds new files to appropriate arrays

---

### 3. Delete Specific File (DELETE)
**Endpoint:** `DELETE /api/resources/:resourceId/:type/:index`

**Use Case:** Delete a single file by type and index.

**Examples:**
```bash
# Delete images[0]
DELETE /api/resources/abc-123/images/0

# Delete documents[2]
DELETE /api/resources/abc-123/documents/2

# Delete videos[1]
DELETE /api/resources/abc-123/videos/1
```

**Request:**
```
Headers:
  Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "message": "File images[0] deleted successfully",
  "resource": {
    // Updated resource with file removed
  }
}
```

**Valid types:** `images`, `videos`, `documents`, `files`, `urls`

---

### 4. Update File Metadata (PATCH)
**Endpoint:** `PATCH /api/resources/:resourceId/:type/:index`

**Use Case:** Update caption or metadata for a specific file.

**Examples:**
```bash
# Update caption for images[0]
PATCH /api/resources/abc-123/images/0

# Update caption for documents[1]
PATCH /api/resources/abc-123/documents/1
```

**Request:**
```json
{
  "caption": "New caption text"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File images[0] updated successfully",
  "resource": {
    // Updated resource
  }
}
```

**Allowed fields:** `caption`, `originalName`

---

## 🔄 Common Workflows

### Workflow 1: Create Resource with Files
```javascript
const formData = new FormData();
formData.append('title', 'My Resource');
formData.append('description', 'Description');
formData.append('course_code', 'SOA501');
formData.append('hashtags', JSON.stringify(['tutorial', 'guide']));

// Attach files (use same key 'files' for all)
formData.append('files', file1); // From <input type="file" multiple>
formData.append('files', file2);
formData.append('files', file3);

const response = await fetch('/api/resources', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

---

### Workflow 2: Display Files in UI
```javascript
const resource = await getResource(id);

// Display images
resource.media.images.forEach((img, index) => {
  console.log(`Image ${index}: ${img.url}`);
  console.log(`Caption: ${img.caption}`);
  // Show in UI with index for delete/edit buttons
});

// Display documents
resource.media.documents.forEach((doc, index) => {
  console.log(`Document ${index}: ${doc.originalName}`);
  // <button onClick={() => deleteFile('documents', index)}>Delete</button>
});
```

---

### Workflow 3: Delete a File
```javascript
async function deleteFile(type, index) {
  const response = await fetch(
    `/api/resources/${resourceId}/${type}/${index}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const result = await response.json();
  // Refresh UI with updated resource
  updateUI(result.resource);
}
```

---

### Workflow 4: Update Caption
```javascript
async function updateCaption(type, index, newCaption) {
  const response = await fetch(
    `/api/resources/${resourceId}/${type}/${index}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ caption: newCaption })
    }
  );
  
  const result = await response.json();
  updateUI(result.resource);
}
```

---

### Workflow 5: Reorder Files (Drag & Drop)
```javascript
// After user reorders files in UI
async function saveReorderedFiles(reorderedMedia) {
  const formData = new FormData();
  formData.append('media', JSON.stringify(reorderedMedia));
  
  const response = await fetch(`/api/resources/${resourceId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  
  const result = await response.json();
  // UI already shows reordered files, just confirm success
}
```

---

## 📋 File Object Structure

Each file object contains:

```typescript
{
  url: string;           // Cloudinary URL (use this to display)
  publicId: string;      // Cloudinary identifier (for backend use)
  format: string;        // File extension (jpg, pdf, mp4, etc.)
  size: number;          // File size in bytes
  originalName: string;  // Original filename
  uploadedAt: string;    // ISO timestamp
  caption: string | null // User-defined caption
}
```

---

## ⚠️ Important Notes

### 1. **Index-Based Identification**
Files are identified by `type + index`:
```javascript
images[0]      // First image
images[1]      // Second image
documents[0]   // First document
```

After deletion, indices shift:
```javascript
// Before: images = [img0, img1, img2]
deleteFile('images', 0);
// After: images = [img1, img2]  (img1 is now at index 0)
```

### 2. **Soft Delete**
- Files deleted from database
- Files **remain in Cloudinary** (URLs still work)
- Old URLs in external references still valid

### 3. **Automatic File Categorization**
Backend automatically categorizes uploads:
- `.jpg`, `.png`, `.gif`, `.webp` → `images[]`
- `.mp4`, `.avi`, `.mov` → `videos[]`
- `.pdf`, `.doc`, `.docx`, `.txt` → `documents[]`

### 4. **Form-Data vs JSON**
- **With files:** Use `multipart/form-data`
- **Without files:** Can use `application/json`

### 5. **Media Object Structure**
Always include all arrays in media object:
```javascript
{
  "images": [],
  "videos": [],
  "documents": [],
  "urls": []
}
```

---

## 🚀 Quick Reference

| Action | Method | Endpoint | Body |
|--------|--------|----------|------|
| Create with files | POST | `/api/resources` | form-data with `files` |
| Add more files | PUT | `/api/resources/:id` | form-data with `files` |
| Remove files | PUT | `/api/resources/:id` | form-data with modified `media` |
| Update captions | PUT | `/api/resources/:id` | form-data with modified `media` |
| Delete single file | DELETE | `/api/resources/:id/:type/:index` | - |
| Update single caption | PATCH | `/api/resources/:id/:type/:index` | JSON `{caption: "..."}` |

---

## 💡 Best Practices

1. **Always GET before PUT** - Fetch current media state before modifications
2. **Use indices consistently** - Track file positions in your UI state
3. **Handle index shifts** - After deletion, indices change
4. **Send complete media** - When using PUT with `media`, send entire object
5. **Validate on frontend** - Check file types, sizes before upload
6. **Show loading states** - File uploads can take time
7. **Error handling** - Check response status and show user-friendly errors

---

## 🐛 Common Errors

### 400 - INVALID_TYPE
```json
{"error": {"code": "INVALID_TYPE", "message": "Invalid media type. Must be one of: images, videos, documents, files, urls"}}
```
**Fix:** Use valid type names (plural: `images`, not `image`)

### 400 - INVALID_INDEX
```json
{"error": {"code": "INVALID_INDEX", "message": "Index must be a non-negative integer"}}
```
**Fix:** Ensure index is a number ≥ 0

### 404 - INDEX_OUT_OF_RANGE
```json
{"error": {"code": "INDEX_OUT_OF_RANGE", "message": "Index 5 out of range for images"}}
```
**Fix:** Fetch current resource to get correct array lengths

### 401 - AUTHENTICATION_REQUIRED
```json
{"error": {"code": "AUTHENTICATION_REQUIRED", "message": "Authentication required"}}
```
**Fix:** Include `Authorization: Bearer <token>` header

---

## 📞 Need Help?

Contact backend team for:
- API issues or errors
- New file type support
- Custom file operations
- Performance optimization

---

**Last Updated:** December 5, 2025
