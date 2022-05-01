const express = require('express');
const router = express.Router();
let { body, query } = require("express-validator");
let tokenVerify = require('../../middlewares/tokenVerify');
const { getFaqs } = require("./../../controllers/customer/faq");

router.get("/app/customer/faqs", getFaqs)

module.exports = router