let express = require("express");
const { body, query } = require("express-validator");

const {
      subscriptionWithSearch, subscriptionExportExcel,
      subscriptionBulkStatusUpdate
} = require("../../controllers/admin/subscription");
const verifyAdmin = require("../../middlewares/verifyAdmin");
let router = express.Router();

router.post("/admin/subscription/withsearch", verifyAdmin, subscriptionWithSearch)
router.post("/admin/subscription/export", verifyAdmin, subscriptionExportExcel)
router.post("/admin/subscription/summary", verifyAdmin, subscriptionWithSearch)
router.put("/admin/subscription/bulkstatus/update", [
      body("statusSet").notEmpty().withMessage("Please enter valid status"),
      body("subscriptionList").notEmpty().withMessage("Please enter valid subscriptionList data")
],verifyAdmin, subscriptionBulkStatusUpdate)


module.exports = router;