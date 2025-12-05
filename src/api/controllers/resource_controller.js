const { validateCreateResource, validateUpdateResource } = require('../validators/resource_validator');
const resourceService = require('../../domain/services/resource_service');
const fileService = require('../../domain/services/file_service');
const crypto = require('crypto');

const getAllResources = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.substring(7);
    const currentUserId = req.user?.id;
    const { course_code, hashtag, filter, search } = req.query;

    const filters = {
      course_code,
      hashtag,
      filter,
      search,
      currentUserId
    };

    const result = await resourceService.getAllResources(token, filters);

    res.status(200).json({
      success: true,
      count: result.count,
      filter: result.filter,
      resources: result.resources
    });
  } catch (error) {
    if (error.message === 'Authentication required to view your resources') {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: error.message,
          status: 401
        }
      });
    }
    next(error);
  }
};

const getResourceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.substring(7);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_UUID',
          message: 'Invalid resource ID format',
          status: 400
        }
      });
    }

    const resource = await resourceService.getResourceById(token, id);

    if (!resource) {
      return res.status(404).json({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Resource not found',
          status: 404
        }
      });
    }

    res.status(200).json({
      success: true,
      resource
    });
  } catch (error) {
    next(error);
  }
};

const createResource = async (req, res, next) => {
  try {
    const currentUserId = req.user?.id;
    const token = req.headers.authorization?.substring(7);

    if (!currentUserId) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to create resource',
          status: 401
        }
      });
    }

    let resourceData;

    // Check if files are uploaded (multipart/form-data)
    if (req.files && req.files.length > 0) {
      // Handle multiple file uploads
      const media = {
        link: [],
        files: [],
        images: [],
        videos: [],
        urls: []
      };

      try {
        // Upload all files to Cloudinary
        let fileIdCounter = 1; // Sequential ID for files array

        for (const file of req.files) {
          const uploadResult = await fileService.uploadFile(file.buffer, file.originalname);

          const fileData = {
            id: fileIdCounter++,
            url: uploadResult.url,
            size: uploadResult.size,
            format: uploadResult.format,
            caption: null,
            publicId: uploadResult.publicId,
            uploadedAt: new Date().toISOString(),
            originalName: file.originalname
          };

          // Add to files array (all files with sequential IDs)
          media.files.push(fileData);

          // Categorize by file extension/format (not just Cloudinary's resourceType)
          // Cloudinary's 'auto' mode may incorrectly categorize PDFs as images
          // Handle URL-encoded filenames (e.g., "file+name.pdf" -> "pdf")
          const decodedName = decodeURIComponent(file.originalname);
          const fileExtension = (decodedName.split('.').pop() || '').toLowerCase().split('?')[0]; // Remove query params if any
          const format = (uploadResult.format || '').toLowerCase();
          
          // Image formats
          const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
          // Video formats
          const videoFormats = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v'];
          
          const isImage = imageFormats.includes(fileExtension) || imageFormats.includes(format);
          const isVideo = videoFormats.includes(fileExtension) || videoFormats.includes(format);
          
          // Categorize by file extension - images and videos go to their respective arrays
          // All files (including PDFs, DOCX, etc.) already go to files array above
          // Only images and videos get additional categorization
          if (isImage) {
            const imageData = { ...fileData, id: media.images.length + 1 };
            media.images.push(imageData);
          } else if (isVideo) {
            const videoData = { ...fileData, id: media.videos.length + 1 };
            media.videos.push(videoData);
          }
          // PDFs, DOCX, TXT, etc. only go to files array (no documents array)
        }
      } catch (uploadError) {
        return res.status(500).json({
          error: {
            code: 'FILE_UPLOAD_FAILED',
            message: 'Failed to upload files',
            details: uploadError.message,
            status: 500
          }
        });
      }

      // Parse and add links if provided
      if (req.body.links) {
        try {
          const links = JSON.parse(req.body.links);
          if (Array.isArray(links)) {
            links.forEach((link, index) => {
              media.link.push({
                id: index + 1,
                url: link.url,
                description: link.description || null
              });
            });
          }
        } catch (e) {
          // Silently ignore invalid JSON
        }
      }

      // Prepare resource data from form fields
      resourceData = {
        title: req.body.title,
        description: req.body.description,
        course_code: req.body.course_code,
        resource_type: 'DOCUMENT',
        media: media,
        hashtags: req.body.hashtags ? JSON.parse(req.body.hashtags) : []
      };
    } else {
      // Handle JSON data (application/json)
      resourceData = req.body;
    }

    // Validate resource data
    try {
      validateCreateResource(resourceData);
    } catch (validationError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: validationError.message,
          status: 400
        }
      });
    }

    const resource = await resourceService.createResource(token, resourceData, currentUserId);

    res.status(201).json({
      success: true,
      message: 'Resource created successfully',
      resource
    });
  } catch (error) {
    next(error);
  }
};

const updateResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const token = req.headers.authorization?.substring(7);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_UUID',
          message: 'Invalid resource ID format',
          status: 400
        }
      });
    }

    if (!currentUserId) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to update resource',
          status: 401
        }
      });
    }

    let resourceData = {};

    // Handle multipart/form-data (file upload)
    if (req.files || req.body.media) {
      // Parse basic fields
      if (req.body.title) resourceData.title = req.body.title;
      if (req.body.description !== undefined) resourceData.description = req.body.description;
      if (req.body.course_code !== undefined) resourceData.course_code = req.body.course_code;
      if (req.body.resource_type) resourceData.resource_type = req.body.resource_type;
      if (req.body.hashtags) {
        try {
          resourceData.hashtags = JSON.parse(req.body.hashtags);
        } catch (e) {
          return res.status(400).json({
            error: {
              code: 'INVALID_HASHTAGS',
              message: 'hashtags must be valid JSON array',
              details: e.message,
              status: 400
            }
          });
        }
      }

      // Parse updated media structure (frontend sends back the modified media object)
      if (req.body.media) {
        try {
          resourceData.media = JSON.parse(req.body.media);
        } catch (e) {
          return res.status(400).json({
            error: {
              code: 'INVALID_MEDIA',
              message: 'media must be valid JSON',
              details: e.message,
              status: 400
            }
          });
        }
      }
    } else {
      // Handle JSON data (application/json)
      resourceData = req.body;
    }

    // Check if request has any updates
    if (Object.keys(resourceData).length === 0 && !req.files) {
      return res.status(400).json({
        error: {
          code: 'EMPTY_REQUEST_BODY',
          message: 'No data provided for update',
          status: 400
        }
      });
    }

    // Validate resource data
    const fieldsToValidate = { ...resourceData };
    delete fieldsToValidate.media; // Skip media validation as it's handled separately

    if (Object.keys(fieldsToValidate).length > 0) {
      try {
        validateUpdateResource(fieldsToValidate);
      } catch (validationError) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: validationError.message,
            status: 400
          }
        });
      }
    }

    const resource = await resourceService.updateResource(
      token,
      id,
      resourceData,
      currentUserId,
      req.files,
      null
    );

    if (!resource) {
      return res.status(404).json({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Resource not found',
          status: 404
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Resource updated successfully',
      resource
    });
  } catch (error) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this resource',
          status: 403
        }
      });
    }
    if (error.message && error.message.includes('FILE_NOT_FOUND')) {
      return res.status(404).json({
        error: {
          code: 'FILE_NOT_FOUND',
          message: error.message,
          status: 404
        }
      });
    }
    next(error);
  }
};

const deleteResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const token = req.headers.authorization?.substring(7);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_UUID',
          message: 'Invalid resource ID format',
          status: 400
        }
      });
    }

    if (!currentUserId) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to delete resource',
          status: 401
        }
      });
    }

    const result = await resourceService.deleteResource(token, id, currentUserId);

    if (!result) {
      return res.status(404).json({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Resource not found',
          status: 404
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Resource deleted successfully'
    });
  } catch (error) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this resource',
          status: 403
        }
      });
    }
    next(error);
  }
};

const uploadFile = async (req, res, next) => {
  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to upload file',
          status: 401
        }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'NO_FILE_PROVIDED',
          message: 'No file uploaded',
          status: 400
        }
      });
    }

    const result = await fileService.uploadFile(req.file.buffer, req.file.originalname);

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      file: result
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: 'FILE_UPLOAD_FAILED',
        message: 'Failed to upload file',
        details: error.message,
        status: 500
      }
    });
  }
};

/**
 * Delete a specific file from a resource
 */
const deleteFileFromResource = async (req, res, next) => {
  try {
    const { resourceId, type, index } = req.params;
    const currentUserId = req.user?.id;
    const token = req.headers.authorization?.substring(7);

    // Validate UUID format for resourceId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(resourceId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_RESOURCE_ID',
          message: 'Invalid resource ID format',
          status: 400
        }
      });
    }

    // Validate type
    const validTypes = ['images', 'videos', 'files', 'urls'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TYPE',
          message: `Invalid media type. Must be one of: ${validTypes.join(', ')}`,
          status: 400
        }
      });
    }

    // Validate index
    const fileIndex = parseInt(index, 10);
    if (isNaN(fileIndex) || fileIndex < 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INDEX',
          message: 'Index must be a non-negative integer',
          status: 400
        }
      });
    }

    if (!currentUserId) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to delete file',
          status: 401
        }
      });
    }

    const resource = await resourceService.deleteFileFromResource(token, resourceId, type, fileIndex, currentUserId);

    if (!resource) {
      return res.status(404).json({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Resource not found',
          status: 404
        }
      });
    }

    res.status(200).json({
      success: true,
      message: `File ${type}[${fileIndex}] deleted successfully`,
      resource
    });
  } catch (error) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this file',
          status: 403
        }
      });
    }
    if (error.message && error.message.includes('out of range')) {
      return res.status(404).json({
        error: {
          code: 'INDEX_OUT_OF_RANGE',
          message: error.message,
          status: 404
        }
      });
    }
    if (error.message && error.message.includes('Invalid media type')) {
      return res.status(400).json({
        error: {
          code: 'INVALID_MEDIA_TYPE',
          message: error.message,
          status: 400
        }
      });
    }
    next(error);
  }
};

/**
 * Update file metadata in a resource by type and index
 */
const updateFileInResource = async (req, res, next) => {
  try {
    const { resourceId, type, index } = req.params;
    const currentUserId = req.user?.id;
    const token = req.headers.authorization?.substring(7);
    const updates = req.body;

    // Validate UUID format for resourceId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(resourceId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_RESOURCE_ID',
          message: 'Invalid resource ID format',
          status: 400
        }
      });
    }

    // Validate type
    const validTypes = ['images', 'videos', 'files', 'urls'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TYPE',
          message: `Invalid media type. Must be one of: ${validTypes.join(', ')}`,
          status: 400
        }
      });
    }

    // Validate index
    const fileIndex = parseInt(index, 10);
    if (isNaN(fileIndex) || fileIndex < 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INDEX',
          message: 'Index must be a non-negative integer',
          status: 400
        }
      });
    }

    if (!currentUserId) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to update file',
          status: 400
        }
      });
    }

    // Validate updates
    const allowedFields = ['caption', 'originalName'];
    const hasValidFields = Object.keys(updates).some(key => allowedFields.includes(key));

    if (!hasValidFields) {
      return res.status(400).json({
        error: {
          code: 'INVALID_UPDATES',
          message: 'No valid fields to update. Allowed fields: caption, originalName',
          status: 400
        }
      });
    }

    const resource = await resourceService.updateFileInResource(token, resourceId, type, fileIndex, updates, currentUserId);

    if (!resource) {
      return res.status(404).json({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Resource not found',
          status: 404
        }
      });
    }

    res.status(200).json({
      success: true,
      message: `File ${type}[${fileIndex}] updated successfully`,
      resource
    });
  } catch (error) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this file',
          status: 403
        }
      });
    }
    if (error.message && error.message.includes('out of range')) {
      return res.status(404).json({
        error: {
          code: 'INDEX_OUT_OF_RANGE',
          message: error.message,
          status: 404
        }
      });
    }
    if (error.message && error.message.includes('Invalid media type')) {
      return res.status(400).json({
        error: {
          code: 'INVALID_MEDIA_TYPE',
          message: error.message,
          status: 400
        }
      });
    }
    next(error);
  }
}; module.exports = {
  getAllResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  uploadFile,
  deleteFileFromResource,
  updateFileInResource
};
