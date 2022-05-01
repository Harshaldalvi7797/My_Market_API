const path = require("path");
const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const verifyAdmin = require("../../middlewares/verifyAdmin");
const data_validity_middleware = require("../../middlewares/data_validity_middleware")

// controller
const {
	insert_cart,
	delete_cart,
	singleCart,
	excelDownloadCart,
	cartWithSearch,
	cartFilterProduct, cartSellerAndProduct
} = require('./../../controllers/admin/cart');


router.post("/admin/filter/products/cart", verifyAdmin, cartFilterProduct)

router.post("/admin/cart/withsearch", verifyAdmin, cartWithSearch)
router.post("/admin/cart/sellerandproduct", verifyAdmin, cartSellerAndProduct)

router.post("/admin/cart/download", verifyAdmin, excelDownloadCart)

router.post("/admin/cart", verifyAdmin,
	[
		body("productVariantId", "Customer id is required.").notEmpty(),
		body("customerId", "Customer id is required.").notEmpty(),
	],
	data_validity_middleware, insert_cart);

router.get("/admin/single/cart/:id", verifyAdmin, singleCart)

router.delete("/admin/cart/:_id", verifyAdmin, delete_cart);


module.exports = router;
