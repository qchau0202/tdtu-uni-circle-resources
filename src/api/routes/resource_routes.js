const express = require('express');
const multer = require('multer');
const router = express.Router();
const resourceController = require('../controllers/resource_controller');

// Configure multer for file uploads (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *               description: Error code identifier
 *               example: "VALIDATION_ERROR"
 *             message:
 *               type: string
 *               description: Human-readable error message
 *               example: "Validation failed"
 *             details:
 *               type: string
 *               description: Additional error details
 *             status:
 *               type: integer
 *               description: HTTP status code
 *               example: 400
 *     
 *     Resource:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         owner_id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *           maxLength: 255
 *         description:
 *           type: string
 *         course_code:
 *           type: string
 *           maxLength: 20
 *         resource_type:
 *           type: string
 *           enum: [URL, DOCUMENT]
 *         file_url:
 *           type: string
 *           format: uri
 *         hashtags:
 *           type: array
 *           items:
 *             type: string
 *         upvote_count:
 *           type: integer
 *           default: 0
 *         created_at:
 *           type: string
 *           format: date-time
 *         owner:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             student_code:
 *               type: string
 *             email:
 *               type: string
 *     
 *     CreateResourceRequest:
 *       type: object
 *       required:
 *         - title
 *         - resource_type
 *         - file_url
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 255
 *         description:
 *           type: string
 *           maxLength: 5000
 *         course_code:
 *           type: string
 *           maxLength: 20
 *           example: "503045"
 *         resource_type:
 *           type: string
 *           enum: [URL, DOCUMENT]
 *         file_url:
 *           type: string
 *           format: uri
 *         hashtags:
 *           type: array
 *           items:
 *             type: string
 *             maxLength: 50
 *           example: ["midterm", "final", "cheat-sheet"]
 */

/**
 * @swagger
 * /:
 *   get:
 *     summary: Get all resources with filters
 *     tags: [Resources]
 *     parameters:
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, my, following]
 *         description: Filter by scope (all=global, my=user's resources, following=from followed users)
 *       - in: query
 *         name: course_code
 *         schema:
 *           type: string
 *         description: Filter by course code
 *       - in: query
 *         name: hashtag
 *         schema:
 *           type: string
 *         description: Filter by hashtag
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *     responses:
 *       200:
 *         description: List of resources
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 filter:
 *                   type: string
 *                 resources:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Resource'
 */
router.get('/', resourceController.getAllResources);

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Upload a file to Cloudinary
 *     tags: [Resources]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload (max 10MB)
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 file:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     publicId:
 *                       type: string
 *                     resourceType:
 *                       type: string
 *                     format:
 *                       type: string
 *                     size:
 *                       type: integer
 *       400:
 *         description: No file uploaded
 *       401:
 *         description: Authentication required
 */
router.post('/upload', upload.single('file'), resourceController.uploadFile);

/**
 * @swagger
 * /{id}:
 *   get:
 *     summary: Get resource by ID
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Resource found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 resource:
 *                   $ref: '#/components/schemas/Resource'
 *       400:
 *         description: Invalid UUID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "INVALID_UUID"
 *                 message: "Invalid resource ID format"
 *                 status: 400
 *       404:
 *         description: Resource not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "RESOURCE_NOT_FOUND"
 *                 message: "Resource not found"
 *                 status: 404
 */
router.get('/:id', resourceController.getResourceById);

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Upload a file only (get file URL)
 *     tags: [Resources]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload (max 10MB)
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: No file uploaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "NO_FILE_PROVIDED"
 *                 message: "No file uploaded"
 *                 status: 400
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "AUTHENTICATION_REQUIRED"
 *                 message: "Authentication required to upload file"
 *                 status: 401
 *       500:
 *         description: File upload failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "FILE_UPLOAD_FAILED"
 *                 message: "Failed to upload file"
 *                 details: "Cloudinary error message"
 *                 status: 500
 */
router.post('/upload', upload.single('file'), resourceController.uploadFile);

/**
 * @swagger
 * /:
 *   post:
 *     summary: Create a new resource (supports JSON and multiple file uploads)
 *     tags: [Resources]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - resource_type
 *               - media
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 maxLength: 5000
 *               course_code:
 *                 type: string
 *                 maxLength: 20
 *               resource_type:
 *                 type: string
 *                 enum: [URL, DOCUMENT]
 *               media:
 *                 type: object
 *                 properties:
 *                   files:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           description: Unique identifier for the file
 *                         url:
 *                           type: string
 *                         publicId:
 *                           type: string
 *                           description: Cloudinary public ID
 *                         format:
 *                           type: string
 *                           description: File format/extension
 *                         size:
 *                           type: integer
 *                           description: File size in bytes
 *                         originalName:
 *                           type: string
 *                           description: Original filename
 *                         uploadedAt:
 *                           type: string
 *                           format: date-time
 *                         caption:
 *                           type: string
 *                   images:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           description: Unique identifier for the image
 *                         url:
 *                           type: string
 *                         publicId:
 *                           type: string
 *                         format:
 *                           type: string
 *                         size:
 *                           type: integer
 *                         originalName:
 *                           type: string
 *                         uploadedAt:
 *                           type: string
 *                           format: date-time
 *                         caption:
 *                           type: string
 *                   videos:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           description: Unique identifier for the video
 *                         url:
 *                           type: string
 *                         publicId:
 *                           type: string
 *                         format:
 *                           type: string
 *                         size:
 *                           type: integer
 *                         originalName:
 *                           type: string
 *                         uploadedAt:
 *                           type: string
 *                           format: date-time
 *                         caption:
 *                           type: string
 *                   documents:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           description: Unique identifier for the document
 *                         url:
 *                           type: string
 *                         publicId:
 *                           type: string
 *                         format:
 *                           type: string
 *                         size:
 *                           type: integer
 *                         originalName:
 *                           type: string
 *                         uploadedAt:
 *                           type: string
 *                           format: date-time
 *                         caption:
 *                           type: string
 *                   urls:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           description: Unique identifier for the URL reference
 *                         url:
 *                           type: string
 *                         caption:
 *                           type: string
 *               hashtags:
 *                 type: array
 *                 items:
 *                   type: string
 *           example:
 *             title: "Data Structures Study Materials"
 *             description: "Comprehensive study materials"
 *             course_code: "503045"
 *             resource_type: "DOCUMENT"
 *             media:
 *               images: 
 *                 - id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                   url: "https://res.cloudinary.com/image1.jpg"
 *                   publicId: "resources/image1"
 *                   format: "jpg"
 *                   size: 245680
 *                   originalName: "diagram.jpg"
 *                   uploadedAt: "2025-12-05T10:30:00Z"
 *                   caption: "Diagram 1"
 *               documents:
 *                 - id: "b2c3d4e5-f6a7-8901-bcde-f12345678901"
 *                   url: "https://res.cloudinary.com/doc1.pdf"
 *                   publicId: "resources/doc1"
 *                   format: "pdf"
 *                   size: 1024000
 *                   originalName: "chapter1.pdf"
 *                   uploadedAt: "2025-12-05T10:30:00Z"
 *                   caption: "Chapter 1"
 *             hashtags: ["midterm", "data-structures"]
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - files
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 maxLength: 5000
 *               course_code:
 *                 type: string
 *                 maxLength: 20
 *               hashtags:
 *                 type: string
 *                 description: JSON array string
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Multiple files to upload (max 10MB each)
 *     responses:
 *       201:
 *         description: Resource created successfully
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "VALIDATION_ERROR"
 *                 message: "Validation failed"
 *                 details: "title is required"
 *                 status: 400
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "AUTHENTICATION_REQUIRED"
 *                 message: "Authentication required to create resource"
 *                 status: 401
 *       500:
 *         description: File upload failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "FILE_UPLOAD_FAILED"
 *                 message: "Failed to upload files"
 *                 details: "Network error"
 *                 status: 500
 */
router.post('/', upload.array('files', 10), resourceController.createResource);

/**
 * @swagger
 * /{id}:
 *   put:
 *     summary: Update resource by ID
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               course_code:
 *                 type: string
 *               resource_type:
 *                 type: string
 *                 enum: [URL, DOCUMENT]
 *               file_url:
 *                 type: string
 *               hashtags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Resource updated successfully
 *       400:
 *         description: Validation error or invalid UUID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidUUID:
 *                 summary: Invalid UUID
 *                 value:
 *                   error:
 *                     code: "INVALID_UUID"
 *                     message: "Invalid resource ID format"
 *                     status: 400
 *               emptyBody:
 *                 summary: Empty request body
 *                 value:
 *                   error:
 *                     code: "EMPTY_REQUEST_BODY"
 *                     message: "No data provided for update"
 *                     status: 400
 *               validation:
 *                 summary: Validation failed
 *                 value:
 *                   error:
 *                     code: "VALIDATION_ERROR"
 *                     message: "Validation failed"
 *                     details: "Invalid field values"
 *                     status: 400
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "AUTHENTICATION_REQUIRED"
 *                 message: "Authentication required to update resource"
 *                 status: 401
 *       403:
 *         description: Not resource owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "FORBIDDEN"
 *                 message: "You do not have permission to update this resource"
 *                 status: 403
 *       404:
 *         description: Resource not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "RESOURCE_NOT_FOUND"
 *                 message: "Resource not found"
 *                 status: 404
 */
router.put('/:id', resourceController.updateResource);

/**
 * @swagger
 * /{id}:
 *   delete:
 *     summary: Delete resource by ID
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Resource deleted successfully
 *       400:
 *         description: Invalid UUID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "INVALID_UUID"
 *                 message: "Invalid resource ID format"
 *                 status: 400
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "AUTHENTICATION_REQUIRED"
 *                 message: "Authentication required to delete resource"
 *                 status: 401
 *       403:
 *         description: Not resource owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "FORBIDDEN"
 *                 message: "You do not have permission to delete this resource"
 *                 status: 403
 *       404:
 *         description: Resource not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "RESOURCE_NOT_FOUND"
 *                 message: "Resource not found"
 *                 status: 404
 */
router.delete('/:id', resourceController.deleteResource);

/**
 * @swagger
 * /api/resources/{resourceId}/files/{fileId}:
 *   delete:
 *     summary: Delete a specific file from a resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Resource ID
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File ID to delete
 *     responses:
 *       200:
 *         description: File deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "File deleted successfully"
 *                 resource:
 *                   $ref: '#/components/schemas/Resource'
 *       400:
 *         description: Invalid resource ID or file ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "INVALID_FILE_ID"
 *                 message: "Invalid file ID format"
 *                 status: 400
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "AUTHENTICATION_REQUIRED"
 *                 message: "Authentication required to delete file"
 *                 status: 401
 *       403:
 *         description: Permission denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "FORBIDDEN"
 *                 message: "You do not have permission to delete this file"
 *                 status: 403
 *       404:
 *         description: Resource or file not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "FILE_NOT_FOUND"
 *                 message: "File not found in resource"
 *                 status: 404
 */
router.delete('/:resourceId/:type/:index', resourceController.deleteFileFromResource);

/**
 * @swagger
 * /api/resources/{resourceId}/files/{fileId}:
 *   patch:
 *     summary: Update file metadata in a resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Resource ID
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               caption:
 *                 type: string
 *                 description: File caption
 *                 example: "Updated diagram caption"
 *               originalName:
 *                 type: string
 *                 description: Original file name
 *                 example: "new_name.jpg"
 *           examples:
 *             updateCaption:
 *               summary: Update caption only
 *               value:
 *                 caption: "New caption for the file"
 *             updateBoth:
 *               summary: Update caption and name
 *               value:
 *                 caption: "Updated caption"
 *                 originalName: "updated_file.jpg"
 *     responses:
 *       200:
 *         description: File updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "File updated successfully"
 *                 resource:
 *                   $ref: '#/components/schemas/Resource'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidId:
 *                 summary: Invalid ID format
 *                 value:
 *                   error:
 *                     code: "INVALID_FILE_ID"
 *                     message: "Invalid file ID format"
 *                     status: 400
 *               invalidUpdates:
 *                 summary: No valid fields
 *                 value:
 *                   error:
 *                     code: "INVALID_UPDATES"
 *                     message: "No valid fields to update. Allowed fields: caption, originalName"
 *                     status: 400
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "AUTHENTICATION_REQUIRED"
 *                 message: "Authentication required to update file"
 *                 status: 401
 *       403:
 *         description: Permission denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "FORBIDDEN"
 *                 message: "You do not have permission to update this file"
 *                 status: 403
 *       404:
 *         description: Resource not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: "RESOURCE_NOT_FOUND"
 *                 message: "Resource not found"
 *                 status: 404
 */
router.patch('/:resourceId/:type/:index', resourceController.updateFileInResource);

module.exports = router;
