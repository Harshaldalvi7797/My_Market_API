let express = require("express");
let { body, query } = require("express-validator");
let router = express.Router();
let { addOfferpricingItem, getofferpricingitem, singleOfferpricingItem, updateofferPricingitem, getItemsBasedOnOfferPricingId, deleteOfferpricingItem,

    statusUpdateOfferpricingItem } = require("../../controllers/seller/offerPricingItem")
const tokenVerify = require('../../middlewares/tokenVerify');
const isSeller = require("../../middlewares/isSeller");

router.post("/seller/add/offerpriceitem", tokenVerify, isSeller, addOfferpricingItem);

router.get("/seller/offerpricingitems", [
    query("offerpricingId").notEmpty().withMessage("Please enter valid offerpricingId.")
], tokenVerify, getItemsBasedOnOfferPricingId);

router.get("/seller/offerpricingitem/:id", tokenVerify, singleOfferpricingItem);

router.patch("/seller/offerpricingitem/update/:id", [
    body("offerPrice").notEmpty().isNumeric().withMessage("Please Enter offerPrice Numeric"),
], tokenVerify, updateofferPricingitem);

router.get("/seller/productlist/offersnot", [
    query("startDate").notEmpty().withMessage("Please enter valid start date."),
    query("endDate").notEmpty().withMessage("Please enter valid end date.")
], tokenVerify, getofferpricingitem);

router.delete("/seller/offerpricingitem/:id/:productVariantId", tokenVerify, deleteOfferpricingItem)
router.put("/seller/offerpricingitem/status", tokenVerify, statusUpdateOfferpricingItem)
module.exports = router
