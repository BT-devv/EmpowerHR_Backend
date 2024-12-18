const mongoose = require('mongoose');

// Định nghĩa Schema
const userSchema = new mongoose.Schema({
    userID: {
        type: String, // Loại dữ liệu: String
        required: true, // Bắt buộc phải có
        unique: true, // Đảm bảo UID là duy nhất
    },
    userName: {
        type: String,
        required: true,
    },
    userPassword: {
        type: String,
        required: true,
    },
    hoTen: {
        type: String,
        required: true,
    },
});

// Tạo Model
const User = mongoose.model('User', userSchema);

module.exports = User;