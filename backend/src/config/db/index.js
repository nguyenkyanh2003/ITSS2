const mongoose = require('mongoose');

const connectDb = async () => {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error('MONGODB_URI is not set in .env');
    }

    await mongoose.connect(uri);
    console.log('Connected to MongoDB successfully');
};

module.exports = connectDb;