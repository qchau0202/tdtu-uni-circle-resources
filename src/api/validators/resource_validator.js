const validateCreateResource = (data) => {
    const errors = [];

    // Required fields
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
        errors.push('title is required and must be a non-empty string');
    } else if (data.title.length > 255) {
        errors.push('title must not exceed 255 characters');
    }

    if (!data.resource_type || typeof data.resource_type !== 'string') {
        errors.push('resource_type is required');
    } else if (!['URL', 'DOCUMENT'].includes(data.resource_type.toUpperCase())) {
        errors.push('resource_type must be either URL or DOCUMENT');
    }

    // Validate media (JSONB field that can contain files, images, videos, urls)
    if (!data.media) {
        errors.push('media is required');
    } else if (typeof data.media !== 'object' || Array.isArray(data.media)) {
        errors.push('media must be an object');
    } else {
        // Validate media structure
        const { files, images, videos, urls } = data.media;

        // At least one media type should have data
        if (!files?.length && !images?.length && !videos?.length && !urls?.length) {
            errors.push('media must contain at least one file, image, video, or url');
        }

        // Validate files array
        if (files && !Array.isArray(files)) {
            errors.push('media.files must be an array');
        }

        // Validate images array
        if (images && !Array.isArray(images)) {
            errors.push('media.images must be an array');
        } else if (images) {
            images.forEach((img, idx) => {
                if (!img.url || typeof img.url !== 'string') {
                    errors.push(`media.images[${idx}].url is required and must be a string`);
                }
                // ID is optional but should be a string if provided
                if (img.id !== undefined && typeof img.id !== 'string') {
                    errors.push(`media.images[${idx}].id must be a string`);
                }
            });
        }

        // Validate videos array
        if (videos && !Array.isArray(videos)) {
            errors.push('media.videos must be an array');
        } else if (videos) {
            videos.forEach((vid, idx) => {
                if (!vid.url || typeof vid.url !== 'string') {
                    errors.push(`media.videos[${idx}].url is required and must be a string`);
                }
                // ID is optional but should be a string if provided
                if (vid.id !== undefined && typeof vid.id !== 'string') {
                    errors.push(`media.videos[${idx}].id must be a string`);
                }
            });
        }


        // Validate urls array
        if (urls && !Array.isArray(urls)) {
            errors.push('media.urls must be an array');
        } else if (urls) {
            urls.forEach((urlItem, idx) => {
                if (!urlItem.url || typeof urlItem.url !== 'string') {
                    errors.push(`media.urls[${idx}].url is required and must be a string`);
                }
                // ID is optional but should be a string if provided
                if (urlItem.id !== undefined && typeof urlItem.id !== 'string') {
                    errors.push(`media.urls[${idx}].id must be a string`);
                }
            });
        }
    }

    // Optional: description
    if (data.description !== undefined && data.description !== null) {
        if (typeof data.description !== 'string') {
            errors.push('description must be a string');
        } else if (data.description.length > 5000) {
            errors.push('description must not exceed 5000 characters');
        }
    }

    // Optional: course_code
    if (data.course_code !== undefined && data.course_code !== null) {
        if (typeof data.course_code !== 'string') {
            errors.push('course_code must be a string');
        } else if (data.course_code.length > 20) {
            errors.push('course_code must not exceed 20 characters');
        }
    }

    // Optional: hashtags (must be array of strings)
    if (data.hashtags !== undefined && data.hashtags !== null) {
        if (!Array.isArray(data.hashtags)) {
            errors.push('hashtags must be an array');
        } else {
            for (const tag of data.hashtags) {
                if (typeof tag !== 'string') {
                    errors.push('all hashtags must be strings');
                    break;
                }
                if (tag.length > 50) {
                    errors.push('each hashtag must not exceed 50 characters');
                    break;
                }
            }
        }
    }

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    return true;
};

const validateUpdateResource = (data) => {
    const errors = [];

    // Check for disallowed fields
    const allowedFields = [
        'title',
        'description',
        'course_code',
        'resource_type',
        'media',
        'hashtags'
    ];

    const disallowedFields = ['id', 'owner_id', 'created_at', 'upvote_count'];

    // Check if trying to update disallowed fields
    for (const field of disallowedFields) {
        if (data.hasOwnProperty(field)) {
            errors.push(`Cannot update field: ${field}`);
        }
    }

    // Validate title if provided
    if (data.title !== undefined) {
        if (typeof data.title !== 'string' || data.title.trim().length === 0) {
            errors.push('title must be a non-empty string');
        } else if (data.title.length > 255) {
            errors.push('title must not exceed 255 characters');
        }
    }

    // Validate resource_type if provided
    if (data.resource_type !== undefined) {
        if (!['URL', 'DOCUMENT'].includes(data.resource_type.toUpperCase())) {
            errors.push('resource_type must be either URL or DOCUMENT');
        }
    }

    // Validate file_url if provided
    if (data.file_url !== undefined) {
        try {
            new URL(data.file_url);
        } catch {
            errors.push('file_url must be a valid URL');
        }
    }

    // Validate description if provided
    if (data.description !== undefined && data.description !== null) {
        if (typeof data.description !== 'string') {
            errors.push('description must be a string');
        } else if (data.description.length > 5000) {
            errors.push('description must not exceed 5000 characters');
        }
    }

    // Validate course_code if provided
    if (data.course_code !== undefined && data.course_code !== null) {
        if (typeof data.course_code !== 'string') {
            errors.push('course_code must be a string');
        } else if (data.course_code.length > 20) {
            errors.push('course_code must not exceed 20 characters');
        }
    }

    // Validate hashtags if provided
    if (data.hashtags !== undefined && data.hashtags !== null) {
        if (!Array.isArray(data.hashtags)) {
            errors.push('hashtags must be an array');
        } else {
            for (const tag of data.hashtags) {
                if (typeof tag !== 'string') {
                    errors.push('all hashtags must be strings');
                    break;
                }
                if (tag.length > 50) {
                    errors.push('each hashtag must not exceed 50 characters');
                    break;
                }
            }
        }
    }

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    return true;
};

module.exports = {
    validateCreateResource,
    validateUpdateResource
};
