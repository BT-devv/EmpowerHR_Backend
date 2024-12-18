// Import các thư viện
const express = require('express');


const connectDB = require('./config/db.js')
require('dotenv').config(); // Để sử dụng biến môi trường từ .env

// Tạo ứng dụng Express
const app = express();

connectDB();


// Cấu hình Middleware
app.use(express.json()); // Để parse JSON từ body của request

// Route cơ bản
app.get('/', (req, res) => {
  res.send('🚀 Server đang chạy!');
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server đang chạy trên cổng: ${PORT}`);
});



