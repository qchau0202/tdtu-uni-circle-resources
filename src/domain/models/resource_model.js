class Resource {
    constructor(data) {
        this.id = data.id;
        this.owner_id = data.owner_id;
        this.title = data.title;
        this.description = data.description;
        this.resource_type = data.resource_type;
        this.media = data.media;
        this.course_code = data.course_code;
        this.hashtags = data.hashtags || [];
        this.upvote_count = data.upvote_count || 0;
        this.created_at = data.created_at;
        this.owner = data.owner;
    }

    static fromDatabase(data) {
        return new Resource(data);
    }

    toJSON() {
        return {
            id: this.id,
            owner_id: this.owner_id,
            title: this.title,
            description: this.description,
            resource_type: this.resource_type,
            media: this.media,
            course_code: this.course_code,
            hashtags: this.hashtags,
            upvote_count: this.upvote_count,
            created_at: this.created_at,
            owner: this.owner
        };
    }
}

module.exports = Resource;
