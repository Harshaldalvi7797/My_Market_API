const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");
const tokenVerify = require("../../middlewares/tokenVerify");
let { saveForLetter } = require("../../controllers/customer/saveForLetter")
router.post("/app/saveforlater", [
    body("productVariantId").notEmpty().withMessage("Please enter valid product variant id")
], tokenVerify, saveForLetter)

module.exports = router
