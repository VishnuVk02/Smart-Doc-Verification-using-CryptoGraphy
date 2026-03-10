const mongoose = require('mongoose');

const fs = require('fs');
require('dotenv').config();
const User = require('./models/User');

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartdoc');
        console.log('MongoDB connected for seeding...');

        // Clear existing users for a fresh start (optional, but good for testing)
        await User.deleteMany({});

        const users = [
            {
                name: 'System Admin',
                email: 'admin@sdv.com',
                password: 'admin123',
                role: 'Admin'
            },
            {
                name: 'Regular User',
                email: 'user@sdv.com',
                password: 'user123',
                role: 'User'
            }
        ];

        let credentialsText = '--- SmartDoc Credentials ---\n\n';

        for (const userData of users) {
            const existingUser = await User.findOne({ email: userData.email });
            if (!existingUser) {
                const newUser = new User({ ...userData });
                await newUser.save();
                console.log(`Created ${userData.role} account with email: ${userData.email}`);
            } else {
                console.log(`${userData.role} account already exists for email: ${userData.email}`);
            }
            credentialsText += `Role: ${userData.role}\nEmail: ${userData.email}\nPassword: ${userData.password}\n\n`;
        }

        const count = await User.countDocuments();
        console.log(`Total users in database: ${count}`);

        // Write to a text file
        fs.writeFileSync('credentials.txt', credentialsText);
        console.log('Credentials saved to credentials.txt');

        mongoose.connection.close();
    } catch (error) {
        console.error('Seeding error:', error);
        mongoose.connection.close();
    }
};

seedUsers();
