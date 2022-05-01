let express = require("express");
let {  query,body } = require("express-validator");
let router = express.Router();
let { getdashboardOrderdata} = require('./../../../controllers/seller/dashboard/dashboardOrder')
let tokenVerify = require('./../../../middlewares/tokenVerify');


router.post("/seller/dashboard/order", [
    body("duration_type").notEmpty().withMessage("Please enter valid duration_type"),
    // query("toDate").notEmpty().withMessage("toDate is required or invalid format"),
], tokenVerify,getdashboardOrderdata)

module.exports = router