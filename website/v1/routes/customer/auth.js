let express = require("express");
let { body, query } = require("express-validator");
const tokenVerify = require("../../middlewares/tokenVerify");
const isCustomer = require("../../middlewares/isCustomer");

let router = express.Router();
let {
    customerAccount,
    signup, login, googleSignup, facebookSignup, googleLogin, facebookLogin,
    verifyOtp, resendOtp,
    guest_signup, validateEmailAddress, validateMobileNumber, verifyMobile, accountDeactive, getprofile, languageUpdate,
    mobileOtp
} = require("../../controllers/customer/auth");

router.post('/website/customer/mobile/otp', mobileOtp)

router.get("/customer/profile", tokenVerify, isCustomer, getprofile)
//user register
router.post("/customer/signup", [
    body("emailAddress").notEmpty().isEmail().withMessage("Please enter a valid email address."),
    body("mobilePhone").notEmpty().isNumeric().withMessage("Please enter a valid mobile number."),
    body("firstName").notEmpty().withMessage("Please enter your name."),
    //body("gender").notEmpty().isAlpha().withMessage("Please select your gender."),
    body("password").notEmpty().withMessage("Please enter a password."),
], signup);

router.post("/customer/socialmedia/signup", [
    body("emailAddress").notEmpty().isEmail().withMessage("Please enter a valid email address."),
    body("mobilePhone").notEmpty().isNumeric().withMessage("Please enter a valid mobile number."),
    body("mobileCountryCode").notEmpty().isNumeric().withMessage("Please enter a valid mobile country code."),
    body("firstName").notEmpty().withMessage("Please enter valid first name."),
    body("lastName").notEmpty().withMessage("Please enter valid last name."),
    body("googleLoginId").notEmpty().withMessage("Please enter a valid googleLoginId.")
], googleSignup)

router.post("/customer/socialmedia/facebooksignup", [
    body("emailAddress").notEmpty().isEmail().withMessage("Please enter a valid email address."),
    body("mobilePhone").notEmpty().isNumeric().withMessage("Please enter a valid mobile number."),
    body("mobileCountryCode").notEmpty().isNumeric().withMessage("Please enter a valid mobile country code."),
    body("firstName").notEmpty().withMessage("Please enter valid first name."),
    body("lastName").notEmpty().withMessage("Please enter valid last name."),
    body("facebookLoginId").notEmpty().withMessage("Please enter a valid facebookLoginId.")
], facebookSignup)


//user login
router.post("/customer/login", [
    body("user").notEmpty().withMessage("Please enter valid email address or mobile number"),
    body("password").notEmpty().withMessage("Please enter valid Password"),
], login);

router.post("/customer/socialmedia/login", [
    body("emailAddress").notEmpty().isEmail().withMessage("Please enter a valid email address."),
    body("googleLoginId").notEmpty().withMessage("Please enter a valid googleLoginId.")
], googleLogin)

router.post("/customer/socialmedia/facebooklogin", [
    body("emailAddress").notEmpty().isEmail().withMessage("Please enter a valid email address."),
    body("facebookLoginId").notEmpty().withMessage("Please enter a valid facebookLoginId.")
], facebookLogin)

//verify otp
router.post("/customer/verifyotp", [
    body("emailAddress").notEmpty().isEmail().withMessage("Email is required or invalid format"),
    body("otp").notEmpty().isNumeric().withMessage("OTP is required"),
], tokenVerify, isCustomer, verifyOtp);

//verify mobile
router.put("/customer/verifyMobile", [
    body("mobile").notEmpty().isNumeric().withMessage("Mobile number is required or invalid format"),
    body("otp").notEmpty().isNumeric().withMessage("OTP is required"),
], tokenVerify, isCustomer, verifyMobile);

//user profile edit
router.put("/customer-account", [
    //body("emailAddress").notEmpty().isEmail().withMessage("Please enter a valid email address."),
    //body("mobilePhone").notEmpty().isNumeric().withMessage("Please enter a valid mobile number."),
    //body("firstName").notEmpty().withMessage("Please enter your name."),
    //body("gender").notEmpty().isAlpha().withMessage("Please select your gender."),
    //body("password").notEmpty().withMessage("Please enter a password."),
], tokenVerify, isCustomer, customerAccount);

router.post("/customer/resend", resendOtp)


//guest user route
router.post('/guest/signup', [
    body("emailAddress").notEmpty().isEmail().withMessage("Please enter a valid email address."),
    body("mobilePhone").notEmpty().isNumeric().withMessage("Please enter a valid mobile number."),
    body("mobileCountryCode").notEmpty().isNumeric().withMessage("Please enter a valid mobile country code."),
    body("firstName").notEmpty().withMessage("Please enter valid first name."),
    body("lastName").notEmpty().withMessage("Please enter valid last name."),
    body("addressType").notEmpty().withMessage("Please enter valid address type."),
    body("addressLine1").notEmpty().withMessage("Please enter valid address line1."),
    body("city").notEmpty().withMessage("Please enter valid city."),
    body("state").notEmpty().withMessage("Please enter valid state."),
    body("country").notEmpty().withMessage("Please enter valid country."),
    body("pincode").notEmpty().withMessage("Please enter valid pincode."),
], guest_signup);

router.post('/customer/check-email', [
    body("emailAddress").notEmpty().isEmail().withMessage("Please enter a valid email address."),
], validateEmailAddress);

router.post('/customer/check-mobile', [
    body("mobilePhone").notEmpty().isNumeric().withMessage("Please enter a valid mobile number."),
], validateMobileNumber);

router.put('/customer/account-deactive',
    [body("active").notEmpty().withMessage("Please enter false"),],
    tokenVerify, isCustomer, accountDeactive)

router.put('/customer/language/update', tokenVerify, languageUpdate)

module.exports = router;
