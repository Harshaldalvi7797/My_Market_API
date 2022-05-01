let express = require("express");
const {
	suggestIdeas, singleIdea, suggestionWithSearch, suggestionWithSearchExcel
} = require("../../controllers/admin/suggestIdea");

const verifyAdmin = require("../../middlewares/verifyAdmin");
let router = express.Router();

router.post("/admin/suggestidea/withsearch", verifyAdmin, suggestionWithSearch)
router.post("/admin/suggestidea/withsearch/excel", verifyAdmin, suggestionWithSearchExcel)


router.get("/admin/suggestidea", verifyAdmin, suggestIdeas)
router.get("/admin/single/suggestidea/:id", verifyAdmin, singleIdea)
module.exports = router