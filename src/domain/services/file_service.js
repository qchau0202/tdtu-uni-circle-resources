const { uploadToCloudinary, deleteFromCloudinary } = require('../../infrastructure/cloudinary/cloudinary');

class FileService {
    constructor() { }

    async uploadFile(fileBuffer, fileName) {
        try {
            const result = await uploadToCloudinary(fileBuffer, fileName);
            return {
                url: result.url,
                publicId: result.publicId,
                resourceType: result.resourceType,
                format: result.format,
                size: result.size
            };
        } catch (error) {
            throw new Error(`Failed to upload file: ${error.message}`);
        }
    }

    async deleteFile(publicId) {
        try {
            await deleteFromCloudinary(publicId);
            return true;
        } catch (error) {
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }
}

module.exports = new FileService();
