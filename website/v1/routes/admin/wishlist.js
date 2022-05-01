const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
// middleware
const verifyAdmin = require("../../middlewares/verifyAdmin");
const data_validity_middleware = require("../../middlewares/data_validity_middleware")

// controller
const {
	insert_wishlist,
	delete_wishlist, getSingleWishlist, excelWishlist, wishlistWithSearch, wishlistFilterProducts, wishlistFilterProductsSellers
} = require('./../../controllers/admin/wishlist');


router.post("/admin/wishlist/withsearch", verifyAdmin, wishlistWithSearch)
router.post("/admin/wishlist/excel/download", verifyAdmin, excelWishlist)

router.post("/admin/wishlist", verifyAdmin,
	[
		body("productVariantId", "Customer id is required.").notEmpty(),
		body("customerId", "Customer id is required.").notEmpty(),
	],
	data_validity_middleware, insert_wishlist);
router.get("/admin/wishlist/:id", verifyAdmin, getSingleWishlist);

router.delete("/admin/wishlist/:_id", verifyAdmin, delete_wishlist);

router.post("/admin/wishlist/filter/product", verifyAdmin, wishlistFilterProducts)

router.post("/admin/wishlist/sellerandproduct", verifyAdmin, wishlistFilterProductsSellers)


module.exports = router;
