const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");
const verifyAdmin = require("../../middlewares/verifyAdmin");
const { adminAddOfferpricingItem, adminGetofferpricingitem, adminGetItemsBasedOnOfferPricingId
    , adminStatusUpdateOfferpricingItem, adminUpdateofferPricingitem

} = require('./../../controllers/admin/offerPricingItem');

router.post("/admin/add/offerpriceitem", verifyAdmin, adminAddOfferpricingItem);
router.get("/admin/productlist/offersnot", [
    query("startDate").notEmpty().withMessage("Please enter valid start date."),
    query("endDate").notEmpty().withMessage("Please enter valid end date."),
    query("sellerId").notEmpty().withMessage("Please enter valid seller id.")
], verifyAdmin, adminGetofferpricingitem);

router.get("/admin/offerpricingitems",
    [query("offerpricingId").notEmpty().withMessage("Please enter valid offerpricingId.")],
    verifyAdmin, adminGetItemsBasedOnOfferPricingId);

router.put("/admin/offerpricingitem/status", [
    body("productVariantId").notEmpty().withMessage("Please Enter a productVariantId."),
    body("active").notEmpty().withMessage("Please Enter a active."),
], verifyAdmin, adminStatusUpdateOfferpricingItem)
router.patch("/admin/offerpricingitem/update/:id",
    [
        body("offerPrice").notEmpty().isNumeric().withMessage("Please Enter offerPrice Numeric"),
    ],
    verifyAdmin, adminUpdateofferPricingitem);

module.exports = router;