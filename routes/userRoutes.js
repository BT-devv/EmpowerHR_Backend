const express = require('express');
const router = express.Router();
const { login,getAllUsers } = require('../controllers/userController');
const User = require('../models/User');
const { validateLoginInput, } = require('../middlewares/authMiddleware');

// Định nghĩa route login với middleware validateLoginInput
router.post('/login', login);
router.get('/getallusers', getAllUsers);
module.exports = router;
