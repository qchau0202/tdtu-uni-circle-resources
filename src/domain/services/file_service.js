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

    /**
     * Find a file by ID in the media object
     * @param {Object} media - The media object containing files, images, videos, documents, urls
     * @param {String} fileId - The unique file ID to search for
     * @returns {Object|null} - The file object if found, null otherwise
     */
    findFileById(media, fileId) {
        if (!media || !fileId) return null;

        // Search in all media arrays
        const arrays = ['files', 'images', 'videos', 'urls'];

        for (const arrayName of arrays) {
            if (media[arrayName] && Array.isArray(media[arrayName])) {
                const file = media[arrayName].find(f => f.id === fileId);
                if (file) {
                    return { ...file, type: arrayName };
                }
            }
        }

        return null;
    }

    /**
     * Remove a file by ID from the media object
     * @param {Object} media - The media object
     * @param {String} fileId - The file ID to remove
     * @returns {Object} - Updated media object and the removed file info
     */
    removeFileById(media, fileId) {
        if (!media || !fileId) return { media, removedFile: null };

        const arrays = ['files', 'images', 'videos', 'urls'];
        let removedFile = null;

        for (const arrayName of arrays) {
            if (media[arrayName] && Array.isArray(media[arrayName])) {
                const index = media[arrayName].findIndex(f => f.id === fileId);
                if (index !== -1) {
                    removedFile = media[arrayName][index];
                    media[arrayName].splice(index, 1);
                    break;
                }
            }
        }

        return { media, removedFile };
    }

    /**
     * Update a file's metadata by ID
     * @param {Object} media - The media object
     * @param {String} fileId - The file ID to update
     * @param {Object} updates - Properties to update (e.g., { caption: 'New caption' })
     * @returns {Object} - Updated media object
     */
    updateFileById(media, fileId, updates) {
        if (!media || !fileId || !updates) return media;

        const arrays = ['files', 'images', 'videos', 'urls'];

        for (const arrayName of arrays) {
            if (media[arrayName] && Array.isArray(media[arrayName])) {
                const file = media[arrayName].find(f => f.id === fileId);
                if (file) {
                    // Update allowed properties (don't update id, url, publicId)
                    const allowedUpdates = ['caption', 'originalName'];
                    for (const key of allowedUpdates) {
                        if (updates[key] !== undefined) {
                            file[key] = updates[key];
                        }
                    }
                    break;
                }
            }
        }

        return media;
    }
}

module.exports = new FileService();
