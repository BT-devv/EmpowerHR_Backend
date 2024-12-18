const { connectDB, seedData } = require("./config/db");
const User = require("./models/User"); // Đường dẫn tới file model User

// Dữ liệu mẫu
const userData = [
  {
    userID: "U001",
    userName: "john_doe",
    userPassword: "password123", // Trong thực tế, cần hash mật khẩu
    fullName: "John Doe",
    dateOfBirth: "1990-01-01",
  },
  {
    userID: "U002",
    userName: "jane_doe",
    userPassword: "password456",
    fullName: "Jane Doe",
    dateOfBirth: "1995-05-15",
  },
  {
    userID: "U003",
    userName: "mike_smith",
    userPassword: "password789",
    fullName: "Mike Smith",
    dateOfBirth: "1988-10-30",
  },
];

// Hàm chạy seed
const runSeed = async () => {
  try {
    await connectDB(); // Kết nối database
    await seedData(User, userData); // Gọi hàm seedData
    console.log("Seeding completed!");
    process.exit(); // Thoát sau khi hoàn tất
  } catch (err) {
    console.error("Error during seeding:", err.message);
    process.exit(1);
  }
};

runSeed();
