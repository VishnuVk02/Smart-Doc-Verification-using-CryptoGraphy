const mongoose = require('mongoose');

const verificationLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Null if anonymous user
    documentName: { type: String, required: true },
    generatedHash: { type: String, required: true },
    verificationResult: {
        type: String,
        enum: ['Verified', 'Invalid', 'Expired'],
        required: true
    },
    documentId: { type: String, default: null }, // Null if invalid
    ipAddress: { type: String, default: 'Unknown' },
}, {
    timestamps: true
});

module.exports = mongoose.model('VerificationLog', verificationLogSchema);
