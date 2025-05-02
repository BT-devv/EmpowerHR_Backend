const secureRouter = require("../utils/secureRouter");
const router = secureRouter();
const {
  checkIn,
  checkOut,
  getAttendanceSummary,
  getListAttendances,
} = require("../controllers/attendanceController");
const authMiddleware = require("../middlewares/authMiddleware");
router.post("/check-in", checkIn); // Endpoint check-in
router.post("/check-out", checkOut); // Endpoint check-out
router.secureGet("/", "attendance.read", authMiddleware, getListAttendances);
/* 
GET http://localhost:5000/api/attendance(full danh sách)
GET http://localhost:5000/api/attendance/?employeeID=EMP-2500001 (lọc theo EmployeeID)
GET http://localhost:5000/api/attendance/?date=2025-03-11 (lọc theo date)
*/
router.get("/summary", getAttendanceSummary);
module.exports = router;
