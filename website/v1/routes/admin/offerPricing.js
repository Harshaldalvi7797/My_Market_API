const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");
const verifyAdmin = require("../../middlewares/verifyAdmin");
const { offersWithSearch, adminAddOfferprice, singleOfferView, adminUpdateOfferPrice,
    adminUpdateStatus, adminMultiStatusUpdateOffer, offerDeactivateCheckAdmin

} = require('./../../controllers/admin/offerPricing');

router.post("/admin/check/offeradvertise", verifyAdmin, offerDeactivateCheckAdmin)

router.post("/admin/offers/withsearch", verifyAdmin, offersWithSearch)

router.post("/admin/add/offerprice", [
    body("offerName").notEmpty().withMessage("Please Enter a Offer Name."),
    body("startDateTime").notEmpty().withMessage("Please Enter a Start Date."),
    body("endDateTime").notEmpty().withMessage("Please Enter a End date."),
    body("sellerId").notEmpty().withMessage("Please Enter valid seller id."),
], verifyAdmin, adminAddOfferprice)

router.get("/admin/offerprice/:id", verifyAdmin, singleOfferView)

router.put("/admin/offerPrice/update/:id", verifyAdmin, adminUpdateOfferPrice)

router.put("/admin/offerpricing/status/:id", [
    body("active").notEmpty().withMessage("Please Enter a active."),
], verifyAdmin, adminUpdateStatus)

router.put("/admin/offerprice/bulk/update", [
    //body("offerPricingId").notEmpty().withMessage("Please Enter a offerPricingId."),
    body("active").notEmpty().withMessage("Please Enter a active."),
    body("isBulk").isBoolean().notEmpty().withMessage("Please enter is bulk status."),

], verifyAdmin, adminMultiStatusUpdateOffer)




module.exports = router;