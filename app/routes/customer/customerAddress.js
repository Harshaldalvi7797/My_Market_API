const express = require('express');
const router = express.Router();
let { body, query } = require("express-validator");
let tokenVerify = require('../../middlewares/tokenVerify');
const { validateAddress } = require("./../../controllers/customer/customerAddress");

router.post("/app/customer/validateaddress", [
      body("Line1").notEmpty().withMessage("Please enter a valid Line1 address."),
      body("Line2").notEmpty().withMessage("Please enter a valid Line2 address."),
      body("City").notEmpty().withMessage("Please enter a valid City."),
      body("PostCode").optional().isAlpha(),
      body("CountryCode").notEmpty().withMessage("Please enter a valid Country."),
], tokenVerify, validateAddress)

module.exports = router