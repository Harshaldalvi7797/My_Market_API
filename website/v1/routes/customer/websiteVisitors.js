const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");
let { webClickViews } = require('../../controllers/customer/websiteVisitors')
const tokenVerify = require("../../middlewares/tokenVerify");


router.post("/website/product/analytics", [
    body("deviceIdentifier").notEmpty().withMessage("Please enter a valid deviceIdentifier."),
    body("productVariantId").notEmpty().withMessage("Please enter a valid productVariantId."),
    body("type").notEmpty().withMessage("Please enter a valid type.")
], async (req, res, next) => {
    if (req.header('Authorization')) {
        await tokenVerify(req, res, next);
    } else {
        next();
    }
}, webClickViews)
module.exports = router