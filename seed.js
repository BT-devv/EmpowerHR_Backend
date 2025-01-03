const { connectDB, seedData } = require("./config/db");
const User = require("./models/User"); // Đường dẫn tới file model User

// Dữ liệu mẫu
const user = new User({
  avatar: "https://example.com/avatar.jpg",
  employeeID: "EMP-2500001",
  firstName: "Admin",
  lastName: "Nguyen",
  dateOfBirth: "1990-01-01",
  gender: "Male",
  idCardNumber: "12345678910",
  phoneNumber: "(+84) 000 111 2222",
  email: "example@gmail.com",
  password: "StrongPass123",
  bankAccountNumber: "1234567890",
  department: "Engineering",
  startDate: "2025-01-03T12:08:53.500Z",
  role: "Admin",
  employeeType: "Fulltime",
});

// Hàm chạy seed
const runSeed = async () => {
  try {
    await connectDB(); // Kết nối database
    await user.save(); // Middleware `pre("save")` sẽ chạy tại đây
    await seedData(User, user); // Gọi hàm seedData
    console.log("Seeding completed!");
    process.exit(); // Thoát sau khi hoàn tất
  } catch (err) {
    console.error("Error during seeding:", err.message);
    process.exit(1);
  }
};

runSeed();
