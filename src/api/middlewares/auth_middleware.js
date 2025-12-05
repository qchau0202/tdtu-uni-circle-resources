const { getSupabaseClient } = require('../../infrastructure/database/supabase');

const authenticateJWT = async (req, res, next) => {
    // Skip JWT check for health endpoint and API docs
    const publicPaths = ['/health', '/api-docs'];
    const fullPath = req.baseUrl + req.path;

    if (publicPaths.some(path => fullPath.includes(path))) {
        return next();
    }

    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: {
                    message: 'Authorization token is required',
                    status: 401
                }
            });
        }

        const token = authHeader.substring(7);
        const supabase = getSupabaseClient();

        // Verify JWT token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                error: {
                    message: 'Invalid or expired token',
                    status: 401
                }
            });
        }

        // Attach user to request object
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            error: {
                message: 'Authentication failed',
                status: 401
            }
        });
    }
};

module.exports = { authenticateJWT };
