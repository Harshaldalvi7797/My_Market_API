let express = require("express");
let router = express.Router();
let { body, query } = require("express-validator");
let { signup, login, editProfile, getprofile, changepassword, adminVerifyOtp, adminResendOtp } = require("../../controllers/admin/auth")
const verifyAdmin = require("../../middlewares/verifyAdmin");

router.post("/admin/resend/otp", adminResendOtp)

router.post("/admin/verifyotp", [
    body("emailAddress").notEmpty().isEmail().withMessage("Email is required or invalid format"),
    body("otp").notEmpty().isNumeric().withMessage("OTP is required"),
], adminVerifyOtp);

router.put("/admin/change/password", [
    body("oldPassword").notEmpty().withMessage("Please enter old password."),
    body("newPassword").notEmpty().withMessage("Please enter new password.")
], verifyAdmin, changepassword)

router.get("/admin/profile", verifyAdmin, getprofile)
router.post("/admin/signup", [
    body("emailAddress").notEmpty().isEmail().withMessage("Please enter a valid email address."),
    body("password").notEmpty().withMessage("Please enter a password.")], signup);

router.post("/admin/login", [
    body("emailAddress").notEmpty().isEmail().withMessage("Please enter a valid email address."),
    body("password").notEmpty().withMessage("Please enter a password.")], login);


router.put("/admin/edit/profile", verifyAdmin, editProfile)

module.exports = router;