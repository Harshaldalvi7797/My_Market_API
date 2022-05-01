const express = require('express');
const router = express.Router();

const { contactUs, getContact } = require("./../../controllers/customer/contactUs");

router.post("/contactUs", contactUs);

router.get("/website/contact", getContact)

module.exports = router;