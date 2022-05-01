let express = require("express");
let { query, body } = require("express-validator");
const tokenVerify = require("../../middlewares/tokenVerify");
const isCustomer = require("../../middlewares/isCustomer");
let router = express.Router();
let { advertiseClicks } = require("../../controllers/customer/advertiseAnalytics");


router.post("/app/advertisement/clicks", [
    body("advertiseId").notEmpty().withMessage("Please enter a valid advertiseId."),
], async (req, res, next) => {
    if (req.header('Authorization')) {
        await tokenVerify(req, res, next);
    } else {
        next();
    }
}, advertiseClicks)


module.exports = router