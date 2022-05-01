let express = require("express");
let router = express.Router();
let { body, query } = require("express-validator");
const {
    getAdvertisementWithSearch, advertisementCampaign,
    statusUpdate, advertiseApproval, adminSingleAd, editAdvertisement


} = require("../../controllers/admin/advertisementCampaign");
const verifyAdmin = require("../../middlewares/verifyAdmin");

router.put("/admin/advertise/update/:id", editAdvertisement)
router.get("/admin/single/advertise/:id", verifyAdmin, adminSingleAd)

router.put("/admin/advertise/approval", [
    body("advertiseId").notEmpty().withMessage("Please enter a advertiseId."),
    body("adminApproval").notEmpty().withMessage("Please enter a adminApproval."),
], verifyAdmin, advertiseApproval)
router.put("/admin/advertise/status", [
    body("advertiseId").notEmpty().withMessage("Please enter a advertiseId."),
    body("active").notEmpty().withMessage("Please enter a Active."),
], verifyAdmin, statusUpdate)

router.post("/admin/advertisement/withsearch", verifyAdmin, getAdvertisementWithSearch)
router.post("/admin/create/campaignadvertise", verifyAdmin, [
    body("campaignName").notEmpty().withMessage("Please enter a valid campaign name."),
    body("typeOfAdvertisement").notEmpty().withMessage("Please enter a valid typeOfAdvertisement."),
    body("startDateTime").notEmpty().withMessage("Please enter valid startDateTime."),
    body("endDateTime").notEmpty().withMessage("Please enter valid endDateTime."),
    body("whatToPromote").notEmpty().withMessage("Please enter valid whatToPromote."),
    body("totalAmount").notEmpty().isNumeric().withMessage("Please enter valid totalAmount."),
    body("duration").notEmpty().withMessage("Please enter valid duration."),
    body("language").notEmpty().withMessage("Please enter valid language."),
], advertisementCampaign);




module.exports = router;