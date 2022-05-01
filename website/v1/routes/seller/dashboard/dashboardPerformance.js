let express = require("express");
let { body } = require("express-validator");
let router = express.Router();
let { getDashboardPerformanceData } = require('./../../../controllers/seller/dashboard/dashboardPerformance')
let tokenVerify = require('./../../../middlewares/tokenVerify');


router.post("/seller/dashboard/performance", [
    body("duration_type").notEmpty().withMessage("Please enter valid duration_type"),
], tokenVerify, getDashboardPerformanceData)

module.exports = router