let express = require("express");
let router = express.Router();
let { forgetPassword , ChangePassword,passwordVerifyOtp} = require("../../controllers/customer/forget.password")
let bcrypt = require("bcrypt");
//api route for forgot  password
router.post("/customer/forgotpassword-reset/:token", forgetPassword)
router.post("/customer/changePassword",ChangePassword);
router.post("/customer/otpwithpassword",passwordVerifyOtp)

module.exports = router;
