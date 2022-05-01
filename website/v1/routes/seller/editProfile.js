let express = require("express");
let app = express()
let { body, query } = require("express-validator");
let router = express.Router();

let allModels = require("../../../../utilities/allModels");
let { sellerImages, sellerAll, changePassword, editBankDetails, businessInfoemation, companyProfileUpdate, deleteimages
    , sellerNameEdit
} = require("../../controllers/seller/editProfile")
const tokenVerify = require('../../middlewares/tokenVerify');
const isSeller = require('../../middlewares/isSeller')


router.put("/seller/name/edit",tokenVerify,isSeller,sellerNameEdit)

router.delete("/seller/images/delete",tokenVerify,deleteimages)
router.put('/seller/profile/images', tokenVerify, isSeller, sellerImages)
router.get("/seller/information", tokenVerify, isSeller, sellerAll)
router.put("/seller/changepassword", [
    body("oldPassword").notEmpty().withMessage("Please enter old password."),
    body("newPassword").notEmpty().withMessage("Please enter new password.")
], tokenVerify, isSeller, changePassword)
router.put("/seller/bankdetails", tokenVerify, isSeller, editBankDetails)
router.put("/seller/update/busienssinformation", tokenVerify, isSeller, businessInfoemation)
router.put("/seller/update/company/profile", tokenVerify, isSeller, companyProfileUpdate)

module.exports = router