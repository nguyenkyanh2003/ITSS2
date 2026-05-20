const mongoose = require('mongoose');

const connectDb = async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/itss2';

    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB successfully');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message || error);
    }
};

module.exports = connectDb;