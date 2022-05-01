const express = require('express');
let { body } = require("express-validator");
const router = express.Router()

let tokenVerify = require('../../middlewares/tokenVerify');

let { notifyMe } = require("../../controllers/customer/notify");



router.post("/app/customer/notify",[
    body("productVariantId").notEmpty().isAlphanumeric().withMessage("Please enter valid productVariantId"),
],tokenVerify, notifyMe)

module.exports = router;