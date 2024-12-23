const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Tài khoản không tồn tại. Vui lòng kiểm tra lại.',
            });
        }

        
        if (password !== user.password) {
          console.log("Email nè :"+email);
          console.log("pass nè :"+password);
          console.log("pass mẫu nè :"+user.password);
            return res.status(401).json({
                success: false,
                message: 'Mật khẩu không đúng. Vui lòng thử lại.',
            });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email },
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
