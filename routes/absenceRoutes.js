const secureRouter = require("../utils/secureRouter");
const router = secureRouter();
const {
  approveAbsence,
  requestAbsence,
  getAbsencesHistory,
  getPendingAbsences,
} = require("../controllers/absenceController");
const authenticateUser = require("../middlewares/authMiddleware");

router.securePost(
  "/request",
  "absence.create",
  authenticateUser,
  requestAbsence
);
router.securePut(
  "/approve",
  "absence.update",
  authenticateUser,
  approveAbsence
);

router.secureGet(
  "/pending",
  "absence.read",
  authenticateUser,
  getPendingAbsences
);
router.secureGet(
  "/history",
  "absence.read",
  authenticateUser,
  getAbsencesHistory
);

module.exports = router;
