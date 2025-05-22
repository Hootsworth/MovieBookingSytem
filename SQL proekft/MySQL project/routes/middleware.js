// routes/middleware.js

const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.user_id) {
        return next();
    }
    return res.status(401).json({ message: 'Unauthorized: You must be logged in to access this resource.' });
};

const isAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.user_id && 
        (req.session.user.user_type === 'Admin' || req.session.user.user_type === 'admin')) {
        return next();
    }
    return res.status(403).json({ message: 'Forbidden: Admin access required.' });
};

module.exports = {
    isAuthenticated,
    isAdmin
};
