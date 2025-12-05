const cloudinary = require('cloudinary').v2;
const config = require('../../config');

// Configure Cloudinary
cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret
});

/**
 * Upload file to Cloudinary
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} folder - Cloudinary folder (default: 'resources')
 * @returns {Promise<{url: string, publicId: string, resourceType: string}>}
 */
const uploadToCloudinary = (fileBuffer, fileName, folder = 'resources') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: 'auto', // Automatically detect file type
                public_id: `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9]/g, '-')}`,
                use_filename: true,
                unique_filename: true
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                    resourceType: result.resource_type,
                    format: result.format,
                    size: result.bytes
                });
            }
        );

        uploadStream.end(fileBuffer);
    });
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (image, video, raw)
 * @returns {Promise<any>}
 */
const deleteFromCloudinary = (publicId, resourceType = 'raw') => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error, result) => {
            if (error) {
                return reject(error);
            }
            resolve(result);
        });
    });
};

module.exports = {
    uploadToCloudinary,
    deleteFromCloudinary,
    cloudinary
};
