//  kiểm tra thông tin đăng nhập
const validateLoginInput = (req, res, next) => {
    const { userName, userPassword } = req.body;

    next();
};

module.exports = { validateLoginInput };
