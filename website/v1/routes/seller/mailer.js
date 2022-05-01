let express = require("express");
let router = express.Router();
let { body, query } = require("express-validator");
let { mailer } = require("../../controllers/seller/mailer")
let crypto = require("crypto");
router.post("/seller/forgotpassword", [
    body("emailAddress").notEmpty().isEmail().withMessage("Please enter a  email address.")
], mailer);
module.exports = router;
