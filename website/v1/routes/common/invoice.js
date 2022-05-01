let express = require("express");
let router = express.Router();
const {
    merchantInvoice
} = require("../../controllers/common/invoice");
const verifyAdmin = require("../../middlewares/verifyAdmin");

router.post("/admin/merchant/invoice", verifyAdmin, merchantInvoice)



module.exports = router
