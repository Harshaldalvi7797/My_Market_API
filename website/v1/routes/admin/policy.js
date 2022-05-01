// core modules
const path = require("path");
let express = require("express");
const { body } = require("express-validator");
const {
	insertDetail,
	updateDetails,
	fetchSingleDetail,
	getAllEnum
} = require("../../controllers/admin/policy");
const verifyAdmin = require("../../middlewares/verifyAdmin");
const data_validity_middleware = require("../../middlewares/data_validity_middleware");
let router = express.Router();


router.get("/admin/details/values", getAllEnum)
router.post("/admin/details/add", verifyAdmin,
	[
		body("details").notEmpty().withMessage("Please enter valid details"),
		body("active").notEmpty().withMessage("Please enter valid active status"),
		body("type").notEmpty().withMessage("Please enter valid type"),
		body("detailFor").notEmpty().withMessage("Please enter valid detailFor attribute"),
	],
	data_validity_middleware, verifyAdmin, insertDetail);
router.post("/admin/details/single", verifyAdmin, fetchSingleDetail);

router.put("/admin/details/update",
	[
		body("id").notEmpty().withMessage("Please enter valid detail id"),
		body("type").notEmpty().withMessage("Please enter valid type"),
		body("detailFor").notEmpty().withMessage("Please enter valid detailFor attribute"),
		body("active").notEmpty().withMessage("Please enter valid active status"),
	],
	data_validity_middleware, verifyAdmin, updateDetails
);



module.exports = router;
