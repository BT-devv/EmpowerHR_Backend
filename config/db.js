const mongoose = require('mongoose');
require('dotenv').config(); // Để sử dụng biến môi trường từ .env

// Kết nối MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Kết nối MongoDB thành công!');
    } catch (err) {
        console.error('❌ Lỗi khi kết nối MongoDB:', err.message);
        process.exit(1); // Thoát ứng dụng nếu kết nối thất bại
    }
};

module.exports = connectDB;
