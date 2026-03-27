const mongoose = require('mongoose');
const VerificationLog = require('./models/VerificationLog');
require('dotenv').config({ path: './.env' });

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const logs = await VerificationLog.find({}).sort({createdAt: -1});
        console.log("Total logs:", logs.length);
        if (logs.length > 0) {
            console.log("Sample log:", logs[0].createdAt);
        }
        
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
        console.log("Activity:", verificationActivity);
    } catch(err) {
        console.error("Error:", err);
    } finally {
        await mongoose.connection.close();
    }
}
run();
