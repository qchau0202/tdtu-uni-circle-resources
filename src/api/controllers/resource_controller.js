const { validateCreateResource, validateUpdateResource } = require('../validators/resource_validator');
const resourceService = require('../../domain/services/resource_service');
const fileService = require('../../domain/services/file_service');

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
        files: [],
        images: [],
        videos: [],
        documents: []
      };

      try {
        // Upload all files to Cloudinary
        for (const file of req.files) {
          const uploadResult = await fileService.uploadFile(file.buffer, file.originalname);

          const fileData = {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            format: uploadResult.format,
            size: uploadResult.size,
            caption: null
          };

          // Categorize by file type
          if (uploadResult.resourceType === 'image') {
            media.images.push(fileData);
          } else if (uploadResult.resourceType === 'video') {
            media.videos.push(fileData);
          } else {
            media.documents.push(fileData);
          }

          media.files.push(fileData);
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
    const resourceData = req.body;
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

    // Check if request body is empty
    if (!resourceData || Object.keys(resourceData).length === 0) {
      return res.status(400).json({
        error: {
          code: 'EMPTY_REQUEST_BODY',
          message: 'No data provided for update',
          status: 400
        }
      });
    }

    // Validate resource data
    try {
      validateUpdateResource(resourceData);
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

    const resource = await resourceService.updateResource(token, id, resourceData, currentUserId);

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

module.exports = {
  getAllResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  uploadFile
};
