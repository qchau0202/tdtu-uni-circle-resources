const { createClient } = require('@supabase/supabase-js');
const config = require('../../config');
const Resource = require('../models/resource_model');
const fileService = require('./file_service');
const crypto = require('crypto');

class ResourceService {
    constructor() { }

    createSupabaseClient(token) {
        return createClient(
            config.supabase.url,
            config.supabase.anonKey,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            }
        );
    }

    async getAllResources(token, filters = {}) {
        const supabase = this.createSupabaseClient(token);
        const { course_code, hashtag, filter, search, currentUserId } = filters;

        let query = supabase
            .from('resources')
            .select(`
        *,
        owner:students!resources_owner_id_fkey(id, student_code, email)
      `);

        // Filter by scope (All, Following, My Resources)
        if (filter) {
            if (filter === 'my') {
                if (!currentUserId) {
                    throw new Error('Authentication required to view your resources');
                }
                query = query.eq('owner_id', currentUserId);
            } else if (filter === 'following') {
                const { data: following } = await supabase
                    .from('followers')
                    .select('following_id')
                    .eq('follower_id', currentUserId);

                if (following && following.length > 0) {
                    const followingIds = following.map(f => f.following_id);
                    query = query.in('owner_id', followingIds);
                } else {
                    return { resources: [], count: 0, filter: filter || 'all' };
                }
            }
        }

        // Filter by course_code
        if (course_code) {
            query = query.eq('course_code', course_code);
        }

        // Filter by hashtag
        if (hashtag) {
            query = query.contains('hashtags', [hashtag]);
        }

        // Search in title and description
        if (search) {
            query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
        }

        // Order by created_at descending
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch resources: ${error.message}`);
        }

        const resources = data.map(r => Resource.fromDatabase(r));
        return {
            resources,
            count: resources.length,
            filter: filter || 'all'
        };
    }

    async getResourceById(token, id) {
        const supabase = this.createSupabaseClient(token);

        const { data, error } = await supabase
            .from('resources')
            .select(`
        *,
        owner:students!resources_owner_id_fkey(id, student_code, email)
      `)
            .eq('id', id)
            .maybeSingle();

        if (error) {
            throw new Error(`Failed to fetch resource: ${error.message}`);
        }

        if (!data) {
            return null;
        }

        return Resource.fromDatabase(data);
    }

    async createResource(token, resourceData, currentUserId) {
        const supabase = this.createSupabaseClient(token);

        const insertData = {
            owner_id: currentUserId,
            title: resourceData.title.trim(),
            description: resourceData.description?.trim() || null,
            course_code: resourceData.course_code?.trim() || null,
            resource_type: resourceData.resource_type.toUpperCase(),
            media: resourceData.media,
            hashtags: resourceData.hashtags || [],
            upvote_count: 0
        };

        const { data, error } = await supabase
            .from('resources')
            .insert([insertData])
            .select(`
        *,
        owner:students!resources_owner_id_fkey(id, student_code, email)
      `)
            .single();

        if (error) {
            throw new Error(`Failed to create resource: ${error.message}`);
        }

        return Resource.fromDatabase(data);
    }

    async updateResource(token, id, resourceData, currentUserId, newFiles = null, fileOperations = null) {
        const supabase = this.createSupabaseClient(token);

        // Check if resource exists and user is the owner
        const { data: existingResource, error: fetchError } = await supabase
            .from('resources')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (fetchError) {
            throw new Error(`Failed to check resource existence: ${fetchError.message}`);
        }

        if (!existingResource) {
            return null;
        }

        // Check ownership
        if (existingResource.owner_id !== currentUserId) {
            throw new Error('FORBIDDEN');
        }

        // Prepare update data
        const updateData = {};
        if (resourceData.title) updateData.title = resourceData.title.trim();
        if (resourceData.description !== undefined) updateData.description = resourceData.description?.trim() || null;
        if (resourceData.course_code !== undefined) updateData.course_code = resourceData.course_code?.trim() || null;
        if (resourceData.resource_type) updateData.resource_type = resourceData.resource_type.toUpperCase();
        if (resourceData.hashtags !== undefined) updateData.hashtags = resourceData.hashtags;

        // Simple approach: if media is provided, use it; otherwise keep existing
        let media = existingResource.media || { link: [], files: [], images: [], videos: [], documents: [] };

        // If new files are uploaded, add them to the media
        if (newFiles && newFiles.length > 0) {
            // Get next IDs for each category
            const nextFileId = (media.files && media.files.length > 0)
                ? Math.max(...media.files.map(f => f.id || 0)) + 1
                : 1;
            const nextImageId = (media.images && media.images.length > 0)
                ? Math.max(...media.images.map(f => f.id || 0)) + 1
                : 1;
            const nextVideoId = (media.videos && media.videos.length > 0)
                ? Math.max(...media.videos.map(f => f.id || 0)) + 1
                : 1;
            const nextDocId = (media.documents && media.documents.length > 0)
                ? Math.max(...media.documents.map(f => f.id || 0)) + 1
                : 1;

            let fileIdCounter = nextFileId;
            let imageIdCounter = nextImageId;
            let videoIdCounter = nextVideoId;
            let docIdCounter = nextDocId;

            for (const file of newFiles) {
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

                // Add to files array
                media.files = media.files || [];
                media.files.push(fileData);

                // Categorize by file type with separate IDs
                if (uploadResult.resourceType === 'image') {
                    media.images = media.images || [];
                    media.images.push({ ...fileData, id: imageIdCounter++ });
                } else if (uploadResult.resourceType === 'video') {
                    media.videos = media.videos || [];
                    media.videos.push({ ...fileData, id: videoIdCounter++ });
                } else {
                    media.documents = media.documents || [];
                    media.documents.push({ ...fileData, id: docIdCounter++ });
                }
            }
        }

        // Handle links from form data
        if (resourceData.links) {
            const nextLinkId = (media.link && media.link.length > 0)
                ? Math.max(...media.link.map(l => l.id || 0)) + 1
                : 1;

            let linkIdCounter = nextLinkId;
            media.link = media.link || [];

            resourceData.links.forEach(link => {
                media.link.push({
                    id: linkIdCounter++,
                    url: link.url,
                    description: link.description || null
                });
            });
        }

        // If frontend sends updated media structure (with removed items), use it
        if (resourceData.media) {
            media = resourceData.media;
        }

        updateData.media = media;

        const { data, error } = await supabase
            .from('resources')
            .update(updateData)
            .eq('id', id)
            .select(`
        *,
        owner:students!resources_owner_id_fkey(id, student_code, email)
      `)
            .single();

        if (error) {
            throw new Error(`Failed to update resource: ${error.message}`);
        }

        return Resource.fromDatabase(data);
    }

    async deleteResource(token, id, currentUserId) {
        const supabase = this.createSupabaseClient(token);

        // Check if resource exists and user is the owner
        const { data: existingResource, error: fetchError } = await supabase
            .from('resources')
            .select('owner_id')
            .eq('id', id)
            .maybeSingle();

        if (fetchError) {
            throw new Error(`Failed to check resource existence: ${fetchError.message}`);
        }

        if (!existingResource) {
            return null;
        }

        // Check ownership
        if (existingResource.owner_id !== currentUserId) {
            throw new Error('FORBIDDEN');
        }

        const { error } = await supabase
            .from('resources')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to delete resource: ${error.message}`);
        }

        return true;
    }

    /**
     * Delete a specific file from a resource by type and index
     * @param {String} token - Auth token
     * @param {Number} resourceId - Resource ID
     * @param {String} type - File type (images, videos, documents)
     * @param {Number} index - File index in the array
     * @param {Number} currentUserId - Current user ID
     * @returns {Object} - Updated resource
     */
    async deleteFileFromResource(token, resourceId, type, index, currentUserId) {
        const supabase = this.createSupabaseClient(token);

        // Get the resource
        const { data: resource, error: fetchError } = await supabase
            .from('resources')
            .select('*')
            .eq('id', resourceId)
            .maybeSingle();

        if (fetchError) {
            throw new Error(`Failed to fetch resource: ${fetchError.message}`);
        }

        if (!resource) {
            return null;
        }

        // Check ownership
        if (resource.owner_id !== currentUserId) {
            throw new Error('FORBIDDEN');
        }

        const media = resource.media || {};

        if (!media[type] || !Array.isArray(media[type])) {
            throw new Error(`Invalid media type: ${type}`);
        }

        if (index < 0 || index >= media[type].length) {
            throw new Error(`Index ${index} out of range for ${type}`);
        }

        const removedFile = media[type][index];
        console.log(`Soft deleted ${type}[${index}]: ${removedFile.publicId} (kept in Cloudinary)`);

        // Remove from array
        media[type].splice(index, 1);

        // Update the resource
        const { data: updatedResource, error: updateError } = await supabase
            .from('resources')
            .update({ media, updated_at: new Date().toISOString() })
            .eq('id', resourceId)
            .select()
            .single();

        if (updateError) {
            throw new Error(`Failed to update resource: ${updateError.message}`);
        }

        return updatedResource;
    }

    /**
     * Update file metadata in a resource by type and index
     * @param {String} token - Auth token
     * @param {Number} resourceId - Resource ID
     * @param {String} type - File type (images, videos, documents)
     * @param {Number} index - File index in the array
     * @param {Object} updates - Properties to update (e.g., { caption: 'New caption' })
     * @param {Number} currentUserId - Current user ID
     * @returns {Object} - Updated resource
     */
    async updateFileInResource(token, resourceId, type, index, updates, currentUserId) {
        const supabase = this.createSupabaseClient(token);

        // Get the resource
        const { data: resource, error: fetchError } = await supabase
            .from('resources')
            .select('*')
            .eq('id', resourceId)
            .maybeSingle();

        if (fetchError) {
            throw new Error(`Failed to fetch resource: ${fetchError.message}`);
        }

        if (!resource) {
            return null;
        }

        // Check ownership
        if (resource.owner_id !== currentUserId) {
            throw new Error('FORBIDDEN');
        }

        const media = resource.media || {};

        if (!media[type] || !Array.isArray(media[type])) {
            throw new Error(`Invalid media type: ${type}`);
        }

        if (index < 0 || index >= media[type].length) {
            throw new Error(`Index ${index} out of range for ${type}`);
        }

        // Update allowed properties
        const allowedUpdates = ['caption', 'originalName'];
        for (const key of allowedUpdates) {
            if (updates[key] !== undefined) {
                media[type][index][key] = updates[key];
            }
        }

        // Update the resource
        const { data: updatedResource, error: updateError } = await supabase
            .from('resources')
            .update({ media, updated_at: new Date().toISOString() })
            .eq('id', resourceId)
            .select()
            .single();

        if (updateError) {
            throw new Error(`Failed to update resource: ${updateError.message}`);
        }

        return updatedResource;
    }
}

module.exports = new ResourceService();
