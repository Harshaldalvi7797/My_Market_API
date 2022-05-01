let express = require("express");
let router = express.Router();
let { body } = require("express-validator");
let { mailer } = require("../../controllers/admin/mailer")
let crypto = require("crypto");
router.post("/admin/forgotpassword", [
    body("emailAddress").notEmpty().isEmail().withMessage("Please enter a  email address.")
], mailer);
module.exports = router;
