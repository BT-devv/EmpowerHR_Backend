const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const login = async (req, res) => {
    const { userName, userPassword } = req.body;

    try {
        const user = await User.findOne({ userName });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Tài khoản không tồn tại. Vui lòng kiểm tra lại.',
            });
        }

        const isPasswordValid = await bcrypt.compare(userPassword, user.userPassword);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Mật khẩu không đúng. Vui lòng thử lại.',
            });
        }

        const token = jwt.sign(
            { userId: user._id, userName: user.userName },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } 
        );

        return res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công!',
            token,
        });
    } catch (error) {
        // Xử lý lỗi nếu có
        console.error('Lỗi đăng nhập:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra. Vui lòng thử lại sau.',
        });
    }
};

module.exports = { login };
