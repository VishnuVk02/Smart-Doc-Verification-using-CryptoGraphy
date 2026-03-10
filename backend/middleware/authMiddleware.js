const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No authentication token, access denied' });

        const verified = jwt.verify(token, process.env.JWT_SECRET);
        if (!verified) return res.status(401).json({ message: 'Token verification failed, authorization denied' });

        req.user = verified;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired token', error: err.message });
    }
};

const adminMiddleware = (req, res, next) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied, admin only' });
    next();
};

module.exports = { authMiddleware, adminMiddleware };
