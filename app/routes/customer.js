
const express = require('express');
let { body, query } = require("express-validator");

const { personalInfoGet } = require('./../controllers/customer');
const { subscribeNewsletter } = require('./../controllers/newsLetter');
const router = express.Router();
const tokenVerify = require("../middlewares/tokenVerify");
const customerVerify = require("../middlewares/isCustomer");

router.get('/app/account', tokenVerify, customerVerify, personalInfoGet);

router.post('/app/subscribe-newsletter', [
    body("emailAddress").notEmpty().isEmail().withMessage("Please enter a valid email address."),
    body("emailActive").notEmpty().isBoolean().withMessage("Please enter a valid email active subscription status."),
], async (req, res, next) => {
    if (req.header('Authorization')) {
        await tokenVerify(req, res, next);
    } else {
        req.userId = null;
        next();
    }
}, subscribeNewsletter);

module.exports = router;