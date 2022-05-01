const path = require("path");
const { body } = require("express-validator");
let express = require("express");
let router = express.Router();
const {
	insert_currency_decimal,
	fetch_currency_decimal,
	update_currency_decimal,
	delete_currency_decimal,
	singleDeciamlCurrency
} = require("../../controllers/admin/currency_decimal");
const verifyAdmin = require("../../middlewares/verifyAdmin");
const data_validity_middleware = require("../../middlewares/data_validity_middleware");


router.post("/admin/currency-decimal", verifyAdmin,
	[
		body("currencyShort", "Currency short is required.").notEmpty(),
		body("currencyName", "Currency name is required.").notEmpty(),
		body("currencyDecimal", "Currency decimal is required.").notEmpty(),
	],
	data_validity_middleware, insert_currency_decimal);

router.post("/admin/currencydecimal/withsearch", verifyAdmin, fetch_currency_decimal);

router.get("/admin/currency-decimal/:id", verifyAdmin, singleDeciamlCurrency)

router.put("/admin/currency-decimal",
	verifyAdmin,
	[
		body("_id", "Currency decimal id is required.").notEmpty(),
	],
	data_validity_middleware, update_currency_decimal
);

router.delete("/admin/currency-decimal/:id", verifyAdmin, delete_currency_decimal);


module.exports = router;
