const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware } = require('../middleware/authMiddleware');

// @route   PUT /api/user/leave-group
// @desc    User leaves their current group
// @access  Private
router.put('/leave-group', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.groupId = null;
        await user.save();

        res.json({ message: 'Successfully left the group', groupId: null });
    } catch (err) {
        console.error('Leave Group Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
