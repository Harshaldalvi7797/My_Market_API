let express = require("express");
let router = express.Router();
let { body } = require("express-validator");
let { forgetPassword } = require("../../controllers/admin/forget.password")
//api route for forgot  password
router.post("/admin/forgetpassword-reset/:token", [
    body("password").notEmpty().withMessage("Please enter a password."),

], forgetPassword)
module.exports = router;