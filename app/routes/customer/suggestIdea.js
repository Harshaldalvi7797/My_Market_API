const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");
let { suggestIdea } = require('../../../app/controllers/customer/suggestIdea')
const tokenVerify = require("../../middlewares/tokenVerify");
const isCustomer = require("../../middlewares/isCustomer");

router.post('/app/addsuggestidea', [
    body("name").notEmpty().withMessage("Please enter your name."),
    body("emailAddress").notEmpty().isEmail().withMessage("Please enter a valid email address."),
    body("mobileNumber").notEmpty().isNumeric().withMessage("Please enter a valid mobile number."),
    body("countryCode").notEmpty().isNumeric().withMessage("Please enter a valid country code."),
    body("idea").notEmpty().withMessage("Please enter valid idea.")

], suggestIdea)
module.exports = router