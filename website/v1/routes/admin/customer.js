let express = require("express");
const { body, query } = require("express-validator");
const {
	addCustomer,
	getCustomers,
	updateCustomer,
	deleteCustomer,
	updateStatus,
	getCustomerById,
	customerOrders,
	customerWithSearch, customerExcelDownload, blockCustomer
} = require("../../controllers/admin/customer");
const verifyAdmin = require("../../middlewares/verifyAdmin");
let router = express.Router();


router.put("/admin/customer/block", verifyAdmin, blockCustomer)

router.post("/admin/customer/excel", verifyAdmin, customerExcelDownload)
router.post("/admin/customers/search", verifyAdmin, customerWithSearch)

//router.post("/admin/customer", verifyAdmin, addCustomer)
router.get("/admin/customers", verifyAdmin, getCustomers);

router.get("/admin/customer/orders", [

	query("customerId").notEmpty().withMessage("Please enter order status"),
], verifyAdmin, customerOrders)

router.put("/admin/update/customer", verifyAdmin, updateCustomer);
router.put("/admin/cutsomer/active", verifyAdmin, updateStatus)

router.delete("/admin/customers/:id", verifyAdmin, deleteCustomer);
router.get("/admin/customer/single/:id", verifyAdmin, getCustomerById);
module.exports = router;
