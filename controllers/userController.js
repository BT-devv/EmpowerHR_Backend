const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
         // Kiểm tra định dạng email
         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Định dạng email chuẩn
         if (!emailRegex.test(email)) {
             return res.status(400).json({
                 success: false,
                 message: 'Invalid email format',
             });
         }
         // Mật khẩu phải từ 8-64 ký tự
         if (password.length < 8 || password.length > 64) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format',
            });
        }
        // Tài khoản không tồn tại
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Account does not exist',
            });
        }

        // Mật khẩu không chính xác
        if (password !== user.password) {
        //   console.log("Email nè :"+email);
        //   console.log("pass nè :"+password);
        //   console.log("pass mẫu nè :"+user.password);
            return res.status(401).json({
                success: false,
                message: 'Incorrect Password',
            });
        }

        

        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } 
        );

        return res.status(200).json({
            success: true,
            message: 'Login success!',
            token,
        });
    } catch (error) {
        // Xử lý lỗi nếu có
        console.error('Error Login:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Error let re-try.',
        });
    }
};

// Xử lý yêu cầu quên mật khẩu
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        // Kiểm tra email có tồn tại trong cơ sở dữ liệu không
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Email does not exist',
            });
        }

        // Tạo mã thông báo đặt lại mật khẩu
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Mã hóa token và lưu vào cơ sở dữ liệu
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordToken = resetTokenHash;
        user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // Token hết hạn sau 15 phút
        await user.save();

        // Tạo URL đặt lại mật khẩu
        const resetURL = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;

        // Gửi email cho người dùng
        const transporter = nodemailer.createTransport({
            service: 'Gmail', // Hoặc dùng dịch vụ email khác (như SendGrid, Mailgun)
            auth: {
                user: process.env.EMAIL_USERNAME, // Email của bạn
                pass: process.env.EMAIL_PASSWORD, // Mật khẩu ứng dụng email của bạn
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USERNAME,
            to: user.email,
            subject: 'Password Reset Request',
            text: `You requested a password reset. Please use the following link to reset your password: \n\n ${resetURL} \n\n If you did not request this, please ignore this email.`,
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({
            success: true,
            message: 'Reset password email sent successfully.',
        });
    } catch (error) {
        console.error('Error in Forgot Password:', error.message);
        return res.status(500).json({
            success: false,
            message: 'An error occurred. Please try again later.',
        });
    }
};

// Xử lý đặt lại mật khẩu
const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    try {
        // Mã hóa token để kiểm tra
        const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Tìm user theo token và kiểm tra hạn
        const user = await User.findOne({
            resetPasswordToken: resetTokenHash,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token.',
            });
        }

        // Cập nhật mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Password reset successfully.',
        });
    } catch (error) {
        console.error('Error in Reset Password:', error.message);
        return res.status(500).json({
            success: false,
            message: 'An error occurred. Please try again later.',
        });
    }
}

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find(); // Lấy toàn bộ dữ liệu trong bảng users
        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'Does not exist data users' });
        }
        res.status(200).json(users); // Trả về dữ liệu dạng JSON
    } catch (error) {
        res.status(500).json({ message: 'Error server', error: error.message });
    }
}

module.exports = { login, getAllUsers, forgotPassword, resetPassword};
