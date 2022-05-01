let express = require("express");
let router = express.Router();
const { addfaq,getFaqs } = require("../../controllers/common/faq");
const verifyAdmin = require("../../middlewares/verifyAdmin");

router.post("/admin/create/faq", addfaq)
router.get("/website/faq", getFaqs)


module.exports = router
