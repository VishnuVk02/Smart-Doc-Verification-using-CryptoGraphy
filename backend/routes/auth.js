const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');

// Register
router.post('/register', async (req, res) => {
    console.log('Register request received:', req.body.email);
    try {
        const { name, email, password, role, groupId } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });


        // Default role 'User'. Can optionally pass 'Admin'.
        const newUser = new User({
            name,
            email,
            password,
            role: role || 'User',
            groupId: groupId || null
        });
        await newUser.save();

        // Store the credentials in a text file as requested
        const credentialsPath = path.join(__dirname, '..', 'credentials.txt');
        const logEntry = `Role: ${newUser.role}\nName: ${newUser.name}\nEmail: ${newUser.email}\nPassword: ${password}\nGroup ID: ${newUser.groupId}\n------------------------\n`;
        fs.appendFileSync(credentialsPath, logEntry);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    console.log('Login request received:', req.body.email);
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = password === user.password;
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                groupId: user.groupId
            }
        });
    } catch (error) {
        console.error("Login Crash Error:", error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

module.exports = router;
