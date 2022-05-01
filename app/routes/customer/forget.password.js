let express = require("express");
let router = express.Router();
let { body, query } = require("express-validator");
const tokenVerify = require("../../middlewares/tokenVerify");
let { ChangePassword, passwordVerifyOtp, updatePassword, sendForPassword, setNewpassword } = require("../../controllers/customer/forget.password")
let bcrypt = require("bcrypt");
//api route for forgot  password



router.post("/app/customer/password/otp", sendForPassword)
router.put("/app/customer/updatepassword", [
    body("password").notEmpty().withMessage("Please enter a password."),
], tokenVerify, updatePassword)

router.post("/app/customer/sendotp", [
    body("email").notEmpty().withMessage("Please enter valid email.")
], ChangePassword);

router.post("/app/customer/matchotp", [
    body("otp").notEmpty().isNumeric().withMessage("Please enter valid otp.")
    // body("email").notEmpty().withMessage("Please enter valid email.")

], passwordVerifyOtp)

router.post("/app/customer/setpassword", tokenVerify, setNewpassword)


module.exports = router;
