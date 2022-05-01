const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");

let { webSimilarProducts

} = require("../../controllers/customer/similarProducts");
const tokenVerify = require("../../middlewares/tokenVerify");
const isCustomer = require("../../middlewares/isCustomer");

router.post("/website/similar/products", [
    body("categoryId").notEmpty().withMessage("Please enter a valid Category Id."),
], webSimilarProducts)

module.exports = router