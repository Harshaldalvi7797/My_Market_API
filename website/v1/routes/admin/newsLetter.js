let express = require("express");
const { body } = require("express-validator");

const {
    getAllNewsLetter, deleteNewsLetter, adminNewsLetterExcel
} = require("../../controllers/admin/newsLetter");
const verifyAdmin = require("../../middlewares/verifyAdmin");

let router = express.Router();

router.post("/admin/newsletter/excel/download",verifyAdmin, adminNewsLetterExcel)

router.post("/admin/newsletters/withsearch", verifyAdmin, getAllNewsLetter)
router.delete("/admin/newsletters/:_id", verifyAdmin, deleteNewsLetter);

module.exports = router