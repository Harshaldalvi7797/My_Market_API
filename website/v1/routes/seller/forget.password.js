let express = require("express");
let router = express.Router();
let { body, query } = require("express-validator");
let { forgetPassword } = require("../../controllers/seller/forget.password")
//api route for forgot  password
router.post("/seller/forgetpassword-reset/:token", [
    body("password").notEmpty().withMessage("Please enter a password."),

], forgetPassword)
module.exports = router;