let express = require("express");
let app = express()
let { body, query } = require("express-validator");
let router = express.Router();

let allModels = require("../../../../utilities/allModels");
let { signup, verifyOtp, login, questionnaire, addDocuments,
    resendOtp, login_with_phone, coverImage, editSellerProfile
} = require("../../controllers/seller/auth")
let tokenVerify = require('./../../middlewares/tokenVerify');

// router.put("/seller/bank", tokenVerify, editBankDetails)
// router.get("/seller/information", tokenVerify, sellerAll)
// router.put('/seller/profile/images', tokenVerify, sellerImages)
// router.get('/seller/bussinessbanner/:id', getCoverImage)
router.post("/seller/signup", [
    body("supplierFrom").notEmpty().withMessage("Please enter a valid supplier From."),
    // body("nameOfBussinessEnglish").notEmpty().withMessage("Please enter a valid business name."),
    body("emailAddress").notEmpty().isEmail().withMessage("Please enter a valid email address."),
    body("deliveryMethod").notEmpty().withMessage("Please enter a valid deliveryMethod."),
    /* body("mobilePhone").notEmpty().isNumeric().withMessage("Please enter a valid mobile number."),

    body("countryCode").notEmpty().withMessage("Please enter your country code."), */
    body("password").notEmpty().withMessage("Please enter a password."),

], signup);

router.post("/seller/verifyotp", [
    body("emailAddress").notEmpty().isEmail().withMessage("Email is required or invalid format"),
    body("otp").notEmpty().isNumeric().withMessage("OTP is required"),
], verifyOtp);

router.post("/seller/resendotp", [
    body("emailAddress").notEmpty().isEmail().withMessage("Email is required or invalid format")
], resendOtp)

router.post("/seller/login", [
    body("user").notEmpty().notEmpty().withMessage("User is required or invalid data"),
    body("password").notEmpty().withMessage("Password is required"),
], login);

router.post("/seller/login_phone", [
    body("mobilePhone").notEmpty().withMessage("Mobile is required or invalid format"),
    body("password").notEmpty().withMessage("Password is required"),
], login_with_phone);
router.post("/seller/addquestionnaire", [
    body("emailAddress").notEmpty().isEmail().withMessage("Email is required or invalid format"),
], questionnaire)

//add seller documents
router.post("/seller/addocuments", [
    body("emailAddress").notEmpty().isEmail().withMessage("Email is required or invalid format")

], tokenVerify, addDocuments)

// router.put("/seller/change/password",
//     [body("emailAddress").notEmpty().isEmail().withMessage("Email is required or invalid format"),
//     body("password").notEmpty().withMessage("Please enter a password.")
//     ], tokenVerify,

// changePassword)


router.get("/fetchproduct", async (req, res) => {
    let data = await allModels.seller.find();
    //let data = await Product.find({ category: "req.params.name" });
    return res.send({ d: data });
})

router.put("/seller/edit/profile", tokenVerify, editSellerProfile)
module.exports = router;
