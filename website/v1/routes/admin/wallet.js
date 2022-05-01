let express = require("express");
const {
    allCustomerCurrentBalance, customerTransactioins, adminwalletTransaction, singleCustomerCurrentBalance
} = require("../../controllers/admin/wallet");

const verifyAdmin = require("../../middlewares/verifyAdmin");
let router = express.Router();

router.post("/admin/customer/wallet", verifyAdmin, allCustomerCurrentBalance)

router.post("/admin/customer/wallet/summary", verifyAdmin, singleCustomerCurrentBalance)

router.post("/admin/customer/transactions", verifyAdmin, customerTransactioins)

router.post("/admin/walletTransaction", verifyAdmin, adminwalletTransaction)

module.exports = router