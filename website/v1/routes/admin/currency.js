// core modules
const path = require("path");
const { body } = require("express-validator");
let express = require("express");
let router = express.Router();
const {
	Addcurrency,
	fetchCurrency,
	update_currency,
	delete_currency,
	singleCurrency
} = require("../../controllers/admin/currency");
const verifyAdmin = require("../../middlewares/verifyAdmin");
const data_validity_middleware = require("../../middlewares/data_validity_middleware");


router.post("/admin/add/currency", verifyAdmin, Addcurrency);

router.post("/admin/currency/withsearch", verifyAdmin, fetchCurrency);
router.get("/admin/single/currency/:id", verifyAdmin, singleCurrency)

router.put("/admin/currency",
	verifyAdmin,
	[
		body("_id", "Currency id is required.").notEmpty(),
	],
	data_validity_middleware, update_currency
);

router.delete("/admin/currency/:id", verifyAdmin, delete_currency);


module.exports = router;
