let express = require("express");
const {
	getWhatTopromote, getAllAdvertisePricing, promoteProductList, promoteCategoryList
	, promoteOffers, promoteBrand,getProductVarintsPromoteAdmin,sellerPromote
} = require("../../controllers/admin/whatToPromote");

const verifyAdmin = require("../../middlewares/verifyAdmin");
let router = express.Router();

router.get("/admin/promote/brand", verifyAdmin, promoteBrand)
router.get("/admin/advertise/promote/offers", verifyAdmin, promoteOffers)

router.get("/admin/advertise/promote/categories", verifyAdmin, promoteCategoryList)

router.get("/admin/advertisement/whatopromote", verifyAdmin, getWhatTopromote)

router.get("/admin/advertise/pricing", verifyAdmin, getAllAdvertisePricing)

router.get("/admin/advertise/promote/products", verifyAdmin, promoteProductList)

router.get("/admin/advertisement/promote/productvarinats",verifyAdmin,getProductVarintsPromoteAdmin)

router.get("/admin/advertise/seller",sellerPromote)

module.exports = router