
const express = require('express');
let { body, query } = require("express-validator");


const { notifyMe } = require('./../../controllers/customer/notify');
const router = express.Router();
const tokenVerify = require("../../middlewares/tokenVerify");

const isCustomer = require("../../middlewares/isCustomer");


router.post("/website/customer/notify", [
    body("productVariantId").notEmpty().isAlphanumeric().withMessage("Please enter valid productVariantId"),
], tokenVerify, isCustomer, notifyMe)

module.exports = router;