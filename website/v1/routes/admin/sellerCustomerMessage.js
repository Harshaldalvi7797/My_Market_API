let express = require("express");
const { body, query } = require("express-validator");
const {
    sellerMessageCustomerList, adminGetMessages
} = require("../../controllers/admin/sellerCustomerMessage");

const verifyAdmin = require("../../middlewares/verifyAdmin");
let router = express.Router();
router.get("/admin/seller/inbox", [
    query("sellerId").notEmpty().withMessage("Please enter a sellerId."),
], verifyAdmin, sellerMessageCustomerList);

router.get("/admin/getMessages", [
    query('sellerId').notEmpty().withMessage("Please enter valid sellerId"),
    query('toReceiverId').notEmpty().withMessage("Please enter valid receiver id")
], verifyAdmin, adminGetMessages);

module.exports = router