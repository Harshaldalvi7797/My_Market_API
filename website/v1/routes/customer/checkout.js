const express = require('express');
let { body } = require("express-validator");
const router = express.Router()
let { checkout,subscriptionCheckout } = require("../../controllers/customer/checkout")
let tokenVerify = require('../../middlewares/tokenVerify');

router.post("/website/checkout",tokenVerify, checkout);

router.post("/website/subscription/checkout", tokenVerify, [
      body("shippingAddressId").notEmpty().withMessage("Please enter valid shippingAddressId"),
      body("billingAddressId").notEmpty().withMessage("Please enter valid billingAddressId"),
      body("productVariantId").notEmpty().withMessage("Please enter valid productVariantId"),
      body("quantity").notEmpty().withMessage("Please enter valid quantity"),
], subscriptionCheckout);

module.exports = router;