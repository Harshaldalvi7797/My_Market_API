let express = require("express");
let router = express.Router();
const { getCategoryOfSeller, getBrandOfSeller } = require('../../controllers/seller/filterList');
const tokenVerify = require('../../middlewares/tokenVerify')
const isSeller = require('../../middlewares/isSeller')

router.get("/seller/filter/category", tokenVerify, isSeller, getCategoryOfSeller)

router.get("/seller/filter/brands", tokenVerify, isSeller, getBrandOfSeller)

module.exports = router;