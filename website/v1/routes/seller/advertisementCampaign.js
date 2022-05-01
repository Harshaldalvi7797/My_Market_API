let express = require("express");
let { body, query, param } = require("express-validator");
let router = express.Router();
const tokenVerify = require('../../middlewares/tokenVerify');
const isSeller = require('../../middlewares/isSeller')
const { advertisementCampaign, getAdvertisementCampaign, sellerProductvariants, singleCampaign, advertisementCampaignPaymentAdd 
,updateStatus
} = require("../../controllers/seller/advertisementCampaign")

router.put("/seller/advertise/status", tokenVerify,updateStatus)

router.post("/seller/create/campaignadvertise", tokenVerify, isSeller, [
   body("campaignName").notEmpty().withMessage("Please enter a valid campaign name."),
   body("typeOfAdvertisement").notEmpty().withMessage("Please enter a valid typeOfAdvertisement."),
   body("startDateTime").notEmpty().withMessage("Please enter valid startDateTime."),
   body("endDateTime").notEmpty().withMessage("Please enter valid endDateTime."),
   body("whatToPromote").notEmpty().withMessage("Please enter valid whatToPromote."),
   body("tapPaymentDetails").notEmpty().withMessage("Please enter valid tapPaymentDetails."),
   body("totalAmount").notEmpty().isNumeric().withMessage("Please enter valid totalAmount."),
   body("duration").notEmpty().withMessage("Please enter valid duration."),
   body("language").notEmpty().withMessage("Please enter valid language."),
], advertisementCampaign);

router.put("/seller/create/campaignadvertise", tokenVerify, isSeller, [
   body("tapPaymentDetails").notEmpty().withMessage("Please enter valid tapPaymentDetails."),
   body("id").notEmpty().isAlphanumeric().withMessage("Please enter a valid advertisement campaign id."),   
], advertisementCampaignPaymentAdd);

router.post("/seller/advertisementwithsearch", tokenVerify, isSeller, getAdvertisementCampaign);
router.get("/seller/advertise/productvariants", tokenVerify, isSeller, sellerProductvariants);
router.get("/seller/campaign/:id", tokenVerify, isSeller, singleCampaign);



module.exports = router