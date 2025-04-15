const secureRouter = require("../utils/secureRouter");
const router = secureRouter();
const {
  requestOvertime,
  updateOvertimeStatus,
  getPendingOvertime,
  getOvertimeHistory,
} = require("../controllers/overtimeController");
const authMiddleware = require("../middlewares/authMiddleware");

router.securePost(
  "/request",
  "overtime.create",
  authMiddleware,
  requestOvertime
);
router.securePut(
  "/update-status",
  "overtime.update",
  authMiddleware,
  updateOvertimeStatus
);
router.secureGet(
  "/pending",
  "overtime.read",
  authMiddleware,
  getPendingOvertime
);
router.secureGet(
  "/history",
  "overtime.read",
  authMiddleware,
  getOvertimeHistory
);
module.exports = router;
