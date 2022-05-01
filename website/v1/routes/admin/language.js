let express = require("express");
const { body } = require("express-validator");

const {
	addLanguage,
	getLanguage,
	deleteLanguage,
	updateLanguage,
	getLanguages,
} = require("../../controllers/admin/language");
const verifyAdmin = require("../../middlewares/verifyAdmin");
let router = express.Router();

router.post(
	"/admin/language",
	[
		body("language").notEmpty().withMessage("Please enter language."),
		body("direction")
			.notEmpty()
			.withMessage("Please enter direction got the language."),
		body("languageShort")
			.notEmpty()
			.withMessage("Please enter language Short for the language."),
	],
	verifyAdmin,
	addLanguage
);

router.get("/admin/languages", verifyAdmin, getLanguages);

router.get("/admin/language/:id", verifyAdmin, getLanguage);

router.patch("/admin/language/:id", verifyAdmin, updateLanguage);

router.delete("/admin/language/:id", verifyAdmin, deleteLanguage);

module.exports = router;
