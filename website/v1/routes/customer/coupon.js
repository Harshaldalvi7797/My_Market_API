const express = require('express');
const router = express.Router();
let { body, query } = require("express-validator");
let tokenVerify = require('../../middlewares/tokenVerify');
const { couponCustomer } = require("./../../controllers/customer/coupon");

router.post("/customer/coupon", [
    body("couponCode").notEmpty().withMessage("Please enter a valid coupon code for offer."),
    body("productVariant").notEmpty().withMessage("Please enter a valid productVariant data"),
], tokenVerify, couponCustomer)

module.exports = router