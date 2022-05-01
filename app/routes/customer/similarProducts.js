const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");
const tokenVerify = require("../../middlewares/tokenVerify");
let { similarProducts } = require("../../controllers/customer/similarProducts")
router.post("/app/similarproducts", [
    body("categoryId").notEmpty().withMessage("Please enter a valid Category Id."),
], similarProducts)

module.exports = router
