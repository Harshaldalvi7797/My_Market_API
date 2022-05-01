let express = require("express");
let { body, query } = require("express-validator");
const tokenVerify = require("../../middlewares/tokenVerify");
const isCustomer = require("../../middlewares/isCustomer");
let router = express.Router();
let { customerAccount, signup, login,
    verifyOtp, resendOtp, accountDeactive, googleSignup, googleLogin,
    sendForverify, verifyLogin
} = require("../../controllers/customer/auth");

router.post('/app/customer/verify/otp', sendForverify)

router.put("/app/customer/account/verify", [
    body("otp").notEmpty().isEmail().withMessage("Please enter a valid otp."),
], verifyLogin)
router.post("/app/customer/socialmedia/login", [
    body("emailAddress").notEmpty().isEmail().withMessage("Please enter a valid email address.")
], googleLogin)

router.post("/app/customer/socialmedia/signup",
    [
        body("emailAddress").notEmpty().isEmail().withMessage("Please enter a valid email address."),
        body("mobilePhone").notEmpty().isNumeric().withMessage("Please enter a valid mobile number."),
        body("firstName").notEmpty().withMessage("Please enter valid first name."),
        body("lastName").notEmpty().withMessage("Please enter valid last name."),
    ],
    googleSignup)
//user register 
router.post("/app/customer/signup", [
    body("emailAddress").notEmpty().isEmail().withMessage("Please enter a valid email address."),
    body("mobilePhone").notEmpty().isNumeric().withMessage("Please enter a valid mobile number."),
    body("mobileCountryCode").notEmpty().isNumeric().withMessage("Please enter a valid mobile country code."),
    body("customerCountry").notEmpty().withMessage("Please enter a customer Country."),
    body("firstName").notEmpty().withMessage("Please enter valid first name."),
    body("lastName").notEmpty().withMessage("Please enter valid last name."),
    //body("gender").notEmpty().isAlpha().withMessage("Please select your gender."),
    body("password").notEmpty().withMessage("Please enter a password."),
], signup);
//user login 

router.post("/app/customer/login", [
    body("user").notEmpty().withMessage("Please enter valid email address or mobile number"),
    body("password").notEmpty().withMessage("Please enter valid Password"),
], login);

//verify otp 
router.post("/app/customer/verifyotp", [
    // body("emailAddress").notEmpty().isEmail().withMessage("Email is required or invalid format"),
    body("otp").notEmpty().isNumeric().withMessage("OTP is required"),
], verifyOtp);

//user profile edit
router.put("/app/customer-account", [
    //body("emailAddress").notEmpty().isEmail().withMessage("Please enter a valid email address."),
    //body("mobilePhone").notEmpty().isNumeric().withMessage("Please enter a valid mobile number."),
    //body("firstName").notEmpty().withMessage("Please enter your name."),
    //body("gender").notEmpty().isAlpha().withMessage("Please select your gender."),
    //body("password").notEmpty().withMessage("Please enter a password."),
], tokenVerify, customerAccount);

//resend otp 
router.post("/app/resend", resendOtp)
router.put('/app/customer/account-deactive',
    [body("active").notEmpty().withMessage("Please enter false"),],
    tokenVerify, isCustomer, accountDeactive)
module.exports = router;
