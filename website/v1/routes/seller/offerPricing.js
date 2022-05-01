let express = require("express");
let { body, query } = require("express-validator");
let router = express.Router();
let { addOfferprice, getOfferprice, getSingleofferPrice, updateOfferPrice, updateStatus,
    updateMultipleOffersEndDate, multiStatusUpdateOffer, offerDeactivateCheck } = require("../../controllers/seller/offerPricing");
const tokenVerify = require('../../middlewares/tokenVerify');
const isSeller = require("../../middlewares/isSeller");


router.post("/seller/check/offeradvertise", tokenVerify, offerDeactivateCheck)


router.post("/seller/add/offerprice", [
    body("offerName").notEmpty().withMessage("Please Enter a Offer Name."),
    body("startDateTime").notEmpty().withMessage("Please Enter a Start Date."),
    body("endDateTime").notEmpty().withMessage("Please Enter a End date."),
], tokenVerify, isSeller, addOfferprice)
router.post("/seller/offerprices", tokenVerify, isSeller, getOfferprice)
router.get("/seller/offerprice/:id", tokenVerify, isSeller, getSingleofferPrice)

router.patch("/seller/offerPrice/update/:id", updateOfferPrice)
router.put("/seller/offerpricing/status/:id", tokenVerify, updateStatus)


router.put("/seller/offers/enddate/update", [
    body("endDateTime").notEmpty().withMessage("Please enter a endDateTime")
], tokenVerify, isSeller, updateMultipleOffersEndDate)

router.put("/seller/offerprice/multiupdate", tokenVerify, isSeller, multiStatusUpdateOffer)

module.exports = router
