// Middleware kiểm tra thông tin đăng nhập
const validateLoginInput = (req, res, next) => {
    const { userName, userPassword } = req.body;

    // Kiểm tra nếu thiếu thông tin
    if (!userName || !userPassword) {
        return res.status(400).json({
            success: false,
            message: 'Thiếu thông tin đăng nhập. Vui lòng cung cấp userName và userPassword.',
        });
    }

    // Nếu thông tin hợp lệ, chuyển sang bước tiếp theo
    next();
};

module.exports = { validateLoginInput };
