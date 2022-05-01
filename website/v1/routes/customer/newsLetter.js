
const express = require('express');
let { body, query } = require("express-validator");

const { personalInfoGet } = require('./../../controllers/customer/newsLetter');
const { subscribeNewsletter } = require('./../../controllers/customer/newsLetter');
const router = express.Router();
const tokenVerify = require("../../middlewares/tokenVerify");

const isCustomer = require("../../middlewares/isCustomer");
router.get('/account', tokenVerify, isCustomer, personalInfoGet);

router.post('/subscribe-newsletter', [
    body("emailAddress").notEmpty().isEmail().withMessage("Please enter a valid email address."),
    // body("mobilePhone").notEmpty().isNumeric().withMessage("Please enter a valid mobile number."),
    // body("smsActive").notEmpty().isBoolean().withMessage("Please enter a valid sms active subscription status."),
    body("emailActive").notEmpty().isBoolean().withMessage("Please enter a valid email active subscription status."),
    body("newsletterFrequency").notEmpty().isAlpha().withMessage("Please pass a valid parameter: Daily, Weekly, Monthly."),
    body("acceptTerms").notEmpty().isBoolean().withMessage("You must accept the terms before signing up for the newsletter."),
], async (req, res, next) => {
    if (req.header('Authorization')) {
        await tokenVerify(req, res, next);
    } else {
        req.userId = null;
        next();
    }
}, subscribeNewsletter);

module.exports = router;