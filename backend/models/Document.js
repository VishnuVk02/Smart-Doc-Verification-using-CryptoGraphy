const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    documentId: { type: String, required: true, unique: true },
    documentName: { type: String, required: true },
    hashValue: { type: String, required: true, unique: true, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    metadata: { type: Object, default: {} },
    validUntil: { type: Date, default: null } // Optional validity for Case 3
}, {
    timestamps: { createdAt: 'uploadDate', updatedAt: true }
});

module.exports = mongoose.model('Document', documentSchema);
