const { createClient } = require('@supabase/supabase-js');
const config = require('../../config');
const Resource = require('../models/resource_model');

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

    async updateResource(token, id, resourceData, currentUserId) {
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

        // Prepare update data
        const updateData = {};
        if (resourceData.title) updateData.title = resourceData.title.trim();
        if (resourceData.description !== undefined) updateData.description = resourceData.description?.trim() || null;
        if (resourceData.course_code !== undefined) updateData.course_code = resourceData.course_code?.trim() || null;
        if (resourceData.resource_type) updateData.resource_type = resourceData.resource_type.toUpperCase();
        if (resourceData.media) updateData.media = resourceData.media;
        if (resourceData.hashtags !== undefined) updateData.hashtags = resourceData.hashtags;

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
}

module.exports = new ResourceService();
