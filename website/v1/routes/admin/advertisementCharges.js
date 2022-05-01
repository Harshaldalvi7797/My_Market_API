let express = require("express");
let router = express.Router();
let { body, query } = require("express-validator");
const {
    advertisePricingWithSearch, addAdvertisePrice, editAddCharges, deleteAdCharges, adChargeStatus, singleAdCharge

} = require("../../controllers/admin/advertisementCharges");
const verifyAdmin = require("../../middlewares/verifyAdmin");

router.post("/admin/advertisecharges/withsearch", verifyAdmin, advertisePricingWithSearch)

router.post("/admin/advertise/charges", verifyAdmin, addAdvertisePrice)

router.put("/admin/advertise/charges/edit", verifyAdmin, editAddCharges)


router.delete("/admin/advertise/charge/delete/:id", verifyAdmin, deleteAdCharges)


router.put("/admin/advertise/charge/status", verifyAdmin, adChargeStatus)

router.get("/admin/advertise/charges/single/:id", verifyAdmin, singleAdCharge)

module.exports = router;

