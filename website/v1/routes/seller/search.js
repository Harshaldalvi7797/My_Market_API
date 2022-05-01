let express = require("express");
// let { body, query } = require("express-validator");
let router = express.Router();
const { productSearch  , sellerProductSearch} = require('../../controllers/seller/search');
const tokenVerify = require('../../middlewares/tokenVerify')
const isSeller = require('../../middlewares/isSeller')
router.post('/seller/productcheck', tokenVerify,isSeller, productSearch);

module.exports = router;