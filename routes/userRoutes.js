const express = require('express');
const router = express.Router();
const { login } = require('../controllers/userController');
const { validateLoginInput } = require('../middlewares/authMiddleware');
const User = require('../models/User');

// Định nghĩa route login với middleware validateLoginInput
router.post('/login', login);
router.get('/allusers', async (req, res) => {
    try {
        const users = await User.find(); // Lấy tất cả dữ liệu từ bảng User
        res.status(200).json(users); // Trả về kết quả dưới dạng JSON
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server: Không thể lấy dữ liệu người dùng', error: error.message });
    }
});
module.exports = router;
