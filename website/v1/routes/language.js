const express = require('express');
const router = express.Router();

const {addLanguage, getLanguages} = require('./../controllers/language');

router.get("/getLanguages", getLanguages);
//router.post("/addLanguage", addLanguage);

module.exports = router;