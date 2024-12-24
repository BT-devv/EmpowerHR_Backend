const express = require('express');
const router = express.Router();
const { login,getAllUsers, forgotPassword, resetPassword  } = require('../controllers/userController');
const User = require('../models/User');
const authMiddleware = require('../middlewares/authMiddleware');

// Định nghĩa các route
router.post('/login', login);
router.get('/users', authMiddleware, getAllUsers); // Yêu cầu token hợp lệ để truy cập
router.post('/forgot-password', forgotPassword); // Route yêu cầu đặt lại mật khẩu
router.post('/reset-password/:token', resetPassword); // Route đặt lại mật khẩu

module.exports = router;
