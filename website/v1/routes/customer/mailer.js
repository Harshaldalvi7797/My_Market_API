let express = require("express");
let router = express.Router();
let nodemailer = require("nodemailer");
let { mailer } = require("../../controllers/customer/mailer")
let crypto = require("crypto");
router.post("/customer/forgotpassword", mailer);
module.exports = router;
