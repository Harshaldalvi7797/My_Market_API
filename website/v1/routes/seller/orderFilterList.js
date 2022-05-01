let express = require("express");
let router = express.Router();
const {SellerOrderStatus , SellerOrderpaymentMethod , SellerOrderCountry
} = require('../../controllers/seller/orderFilterList');

const tokenVerify = require('../../middlewares/tokenVerify')
const isSeller = require('../../middlewares/isSeller')

router.get("/seller/filter/order/status", tokenVerify,isSeller, SellerOrderStatus)
router.get("/seller/filter/order/paymentmethod", tokenVerify,isSeller, SellerOrderpaymentMethod)

router.get("/seller/filter/order/country", tokenVerify,isSeller, SellerOrderCountry)


module.exports = router;

