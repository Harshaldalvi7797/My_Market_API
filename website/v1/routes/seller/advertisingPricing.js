let express = require("express");
let { body, query, param } = require("express-validator");
let router = express.Router();
const tokenVerify = require('../../middlewares/tokenVerify');
const isSeller = require('../../middlewares/isSeller')
let {
    addAdvertisePricing,getAllAdvertisePricing
} = require("../../controllers/seller/advertisingPricing")

router.post("/seller/create/advertisepricing",tokenVerify,isSeller,addAdvertisePricing)

router.get("/seller/alladvertisepricing", tokenVerify,isSeller, getAllAdvertisePricing)

module.exports = router