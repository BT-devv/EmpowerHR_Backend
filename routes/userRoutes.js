const express = require('express');
const router = express.Router();
const { login } = require('../controllers/userController');
const { validateLoginInput } = require('../middlewares/authMiddleware');
const User = require('../models/User');

// Định nghĩa route login với middleware validateLoginInput
router.post('/login', login);
router.get('/users', async (req, res) => {
    try {
        const users = await User.find(); // Lấy toàn bộ dữ liệu trong bảng users
        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'Không có dữ liệu người dùng' });
        }
        res.status(200).json(users); // Trả về dữ liệu dạng JSON
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});
module.exports = router;
