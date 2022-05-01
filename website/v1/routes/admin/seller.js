let express = require("express");
const {
	getSellerWithSearch,
	updateSeller,
	deleteSeller,
	searchSeller,
	sellerEarnings,
	getSellerById,
	adminApprovalUpdate,
	sellerExcelDownload
} = require("../../controllers/admin/seller");

const verifyAdmin = require("../../middlewares/verifyAdmin");
let router = express.Router();


router.post("/admin/seller/excel", sellerExcelDownload)
router.put("/admin/seller/approval", verifyAdmin, adminApprovalUpdate)

router.post("/admin/seller/withsearch", verifyAdmin, getSellerWithSearch);



router.patch("/admin/sellers/:id", verifyAdmin, updateSeller);

router.delete("/admin/sellers/delete", deleteSeller);

// router.get("/admin/sellers/:id", verifyAdmin, getDetails);

router.get("/admin/sellers/:id/earnings", verifyAdmin, sellerEarnings);

router.get("/admin/search/sellers", verifyAdmin, searchSeller);
router.get("/admin/seller/single/:id", verifyAdmin, getSellerById);

module.exports = router;
