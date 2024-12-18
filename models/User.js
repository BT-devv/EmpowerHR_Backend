const mongoose = require('mongoose');

// Định nghĩa Schema
const userSchema = new mongoose.Schema({
    userID: {
        type: String, // Loại dữ liệu: String
        required: true, // Bắt buộc phải có
        unique: true, // Đảm bảo UID là duy nhất
        immutable : true //không cho phép thay đổi trường này
    },
    userName: {
        type: String,
        required: true,
        unique : true, 
    },
    userPassword: {
        type: String,
        required: true,
    },
    fullName : {
        type : String, 
        required : true, 

    }, 
    dateOfBirth :{ 
        type : Date, 
    }
});

// Tạo Model
const User = mongoose.model('users', userSchema);

module.exports = User;