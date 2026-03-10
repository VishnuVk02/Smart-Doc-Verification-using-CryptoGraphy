const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const Document = require('../models/Document');
const User = require('../models/User');
const VerificationLog = require('../models/VerificationLog');
const HashingService = require('../services/HashingService');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Setup multer for memory storage to hash files
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1 * 1024 * 1024 } // 1MB limit
});

// Helper function to generate SHA-256 hash
const generateHash = (buffer) => {
    return crypto.createHash('sha256').update(buffer).digest('hex');
};

// @route   POST /api/documents/upload
// @desc    Admin uploads a new document
// @access  Admin
router.post('/upload', authMiddleware, adminMiddleware, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No document uploaded' });
        }

        // Step 2 – Content-based Hash Generation (Letters and Logos)
        const hashValue = await HashingService.generateContentHash(req.file.buffer, req.file.mimetype);

        // Step 3 – Duplicate Detection
        const existingDoc = await Document.findOne({ hashValue });
        if (existingDoc) {
            return res.status(400).json({ message: 'Document already exists' });
        }

        // Parse additional generic metadata if provided
        let metadata = {};
        if (req.body.metadata) {
            try {
                metadata = JSON.parse(req.body.metadata);
            } catch (e) {
                // do nothing
            }
        }

        // Determine validity date if provided
        let validUntil = null;
        if (req.body.validityDays) {
            const days = parseInt(req.body.validityDays);
            validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + days);
        }

        // Step 1 – Generate Document Identifier
        const documentId = `DOC-${uuidv4().substring(0, 8).toUpperCase()}`;

        const newDocument = new Document({
            documentId,
            documentName: req.file.originalname,
            hashValue,
            uploadedBy: req.user.id,
            metadata,
            validUntil
        });

        await newDocument.save();

        // Step 4 – Notification (Simulated Email)
        console.log(`[Email System] Notification to admin: Document ${documentId} registered successfully.`);

        res.status(201).json({
            message: 'Document registered successfully',
            document: newDocument
        });

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
});

// @route   POST /api/documents/verify
// @desc    User verifies a document
// @access  Public (or authenticated user)
router.post('/verify', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No document uploaded to verify' });
        }

        const generatedHash = await HashingService.generateContentHash(req.file.buffer, req.file.mimetype);
        const document = await Document.findOne({ hashValue: generatedHash });

        const userId = req.body.userId || null;
        const ipAddress = req.ip || req.connection.remoteAddress;

        let resultStatus = '';
        let resultMessage = '';
        let displayMessage = '';

        if (!document) {
            // Case 2 – Hash Mismatch
            resultStatus = 'Invalid';
            resultMessage = 'Document may be tampered';
            displayMessage = 'Tampered / Unknown Document';
        } else {
            // Case 3 – Expired Document
            if (document.validUntil && new Date() > document.validUntil) {
                resultStatus = 'Expired';
                resultMessage = 'Document validity expired';
                displayMessage = 'Invalid – Document Expired';
            } else {
                // Case 1 – Hash Match
                resultStatus = 'Verified';
                resultMessage = 'Original Document';
                displayMessage = 'Verified Authentic Document';
            }
        }

        // Logging verification activity
        const log = new VerificationLog({
            userId,
            documentName: req.file.originalname,
            generatedHash,
            verificationResult: resultStatus,
            documentId: document ? document.documentId : null,
            ipAddress
        });

        await log.save();

        res.status(200).json({
            status: resultStatus,
            message: resultMessage,
            displayMessage,
            documentDetails: document ? {
                documentId: document.documentId,
                documentName: document.documentName,
                uploadDate: document.uploadDate,
                validUntil: document.validUntil,
                hashValue: generatedHash
            } : null,
            verificationTimestamp: log.createdAt
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/documents/stats
// @desc    Get Admin Dashboard Stats
// @access  Admin
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const totalDocuments = await Document.countDocuments();
        const totalVerifications = await VerificationLog.countDocuments();

        const validVerifications = await VerificationLog.countDocuments({ verificationResult: 'Verified' });
        const invalidVerifications = await VerificationLog.countDocuments({ verificationResult: { $in: ['Invalid', 'Expired'] } });

        res.status(200).json({
            totalDocuments,
            totalVerifications,
            validVerifications,
            invalidVerifications
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/documents/logs
// @desc    Get user verification activity
// @access  Authenticated User or Admin
router.get('/logs', authMiddleware, async (req, res) => {
    try {
        let query = {};

        // If not admin, restrict to their own logs
        if (req.user.role !== 'Admin') {
            query.userId = req.user.id;
        }

        const logs = await VerificationLog.find(query).sort({ createdAt: -1 }).populate('userId', 'name email');
        res.status(200).json(logs);
    } catch (error) {
        console.error('Logs Error:', error);
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
});

// @route   GET /api/documents/all
// @desc    Get all documents for admin
// @access  Admin
router.get('/all', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const documents = await Document.find().sort({ uploadDate: -1 }).populate('uploadedBy', 'name email');
        res.status(200).json(documents);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   DELETE /api/documents/:id
// @desc    Admin deletes a document permanently
// @access  Admin
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const document = await Document.findByIdAndDelete(req.params.id);
        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }
        res.status(200).json({ message: 'Document deleted permanently' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/documents/admin-stats
// @desc    Get detailed stats for charts
// @access  Admin
router.get('/admin-stats', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        // User registrations over time (last 30 days)
        const userStats = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Document uploads over time (last 30 days)
        const docStats = await Document.aggregate([
            {
                $match: {
                    uploadDate: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$uploadDate" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Verification activity over the last 7 days (Line Chart)
        const verificationActivity = await VerificationLog.aggregate([
            {
                $match: {
                    createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json({
            userStats,
            docStats,
            verificationActivity
        });
    } catch (error) {
        console.error('Admin Stats Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Middleware to handle multer errors
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size too large (Max 1MB)' });
        }
        return res.status(400).json({ message: error.message });
    }
    next(error);
});

module.exports = router;
