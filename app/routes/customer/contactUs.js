const express = require('express');
const router = express.Router();

const { contactUs } = require("./../../controllers/customer/contactUs");

router.post("/app/contactUs", contactUs);

module.exports = router;