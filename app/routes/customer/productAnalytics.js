let express = require("express");
let router = express.Router();

let { query, body } = require("express-validator");
let tokenVerify = require('../../middlewares/tokenVerify');
let { appClickViews } = require("../../controllers/customer/productAnalytics");


router.post("/app/product/analytics",
    body("deviceIdentifier").notEmpty().withMessage("Please enter a valid deviceIdentifier."),
    body("productVariantId").notEmpty().withMessage("Please enter a valid productVariantId."),
    body("type").notEmpty().withMessage("Please enter a valid type."),
    async (req, res, next) => {
        if (req.header('Authorization')) {
            await tokenVerify(req, res, next);
        } else {
            next();
        }
    },

    appClickViews)

module.exports = router