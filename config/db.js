const mongoose = require('mongoose');
require('dotenv').config(); // Để sử dụng biến môi trường từ .env

// Kết nối MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Database established successfully');
    } catch (err) {
        console.error('Database error code: ', err.message);
        process.exit(1); // Thoát ứng dụng nếu kết nối thất bại
    }
};

module.exports = connectDB;
