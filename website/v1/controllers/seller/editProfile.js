let allModels = require("../../../../utilities/allModels");
let bcrypt = require("bcrypt");
const { validationResult } = require('express-validator');
let mailService = require("../../middlewares/mailService");
let upload = require("./../../middlewares/AdminfileUpload");
let { createDirectories } = require('./../../middlewares/checkCreateFolder');


exports.sellerNameEdit = async (req, res, next) => {

    try {
        let seller = await allModels.seller.findOne({ "_id": req.userId })

        if (!seller) { return res.status(409).send({ message: "User not found, please check and try again." }) }
        // console.log(req.body.sellerDetails)

        let sellerDetails = {
            sellerfName: seller.sellerDetails.sellerfName,
            sellerlName: seller.sellerDetails.sellerlName,
            sellerEmail: seller.sellerDetails.sellerEmail,
            sellerMobile: seller.sellerDetails.sellerMobile,
            sellerPhone: seller.sellerDetails.sellerPhone,
            sellerVatCertified: seller.sellerDetails.sellerVatCertified
        }
        //console.log("1", sellerDetails)
        if (req.body.sellerDetails.sellerfName) {
            // console.log("fname")

            sellerDetails.sellerfName = req.body.sellerDetails.sellerfName


        }
        // console.log("2", sellerDetails)

        if (req.body.sellerDetails.sellerlName) {
            // console.log("fname")

            sellerDetails.sellerlName = req.body.sellerDetails.sellerlName


        }

        seller.sellerDetails = sellerDetails
        let data = await seller.save()
        return res.send({ message: "Your name has been updated." })
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }

}
exports.sellerImages = async (req, res, next) => {
    try {
        let seller = await allModels.seller.findById({
            _id: req.userId
        }).select(["_id", "bussinessCoverImage", "profileImage"])
        // console.log(seller)
        if (!seller) {
            return res.send("invalid id")
        }
        let uploadLocation = `/seller/images` + `/${seller['_id']}`
        if (req.files) {
            if (req.files['bussinessCoverImage']) {
                await upload.fileUpload(req, next, 'bussinessCoverImage', uploadLocation);
                seller['bussinessCoverImage'] = req.filPath[0];
            }
            if (req.files['profileImage']) {
                await upload.fileUpload(req, next, 'profileImage', uploadLocation);
                seller['profileImage'] = req.filPath[0];
            }
        }
        let data = await seller.save()
        return res.send({ message: "bussiness profile image has been updated.", d: data })
    }
    catch (error) {
        return res.status(403).send({ message: error.message });

    }
}
exports.deleteimages = async (req, res) => {

    let seller = await allModels.seller.findById({
        _id: req.userId
    }).select(["_id", "bussinessCoverImage", "profileImage"])

    if (!seller) {
        return res.send({ message: "User not found, please check and try again." })
    }
    if (req.body.bussinessCoverImage == 0) {
        seller.bussinessCoverImage = null
    }
    if (req.body.profileImage == 0) {
        seller.profileImage = null
    }
    let data = await seller.save()
    return res.send({ message: "Your image has been deleted!" })
}
exports.sellerAll = async (req, res, next) => {

    try {
        let seller = await allModels.seller.findOne({ "_id": req.userId })
            .select(["-__v", "-password", "-otp", "-expireOtp", "-resetpasswordexpire", "-resetpasswordtoken"])
        if (!seller) { return res.status(409).send({ message: "Invalid User" }) }

        return res.send({ d: seller })

    }
    catch (error) {

        return res.status(403).send({ message: error.message });
    }

}
exports.changePassword = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let user = await allModels.seller.findOne({ _id: req.userId });
    if (!user) {
        return res.status(403).send({ message: "User not found, please check and try again." })
    }

    try {
        let password = await bcrypt.compare(
            req.body.oldPassword,
            user.password
        );
        if (!password) {
            return res.status(403).send({ message: "Your old password is incorrect." });
        }

        let oldpassword = await bcrypt.compare(req.body.newPassword, user.password);
        if (oldpassword) { return res.status(402).send({ message: "The new password matches your current password! Please set a new password" }) };

        let hashedpassword = await bcrypt.hash(req.body.newPassword, 10)
        user.password = hashedpassword;
        await user.save()
        return res.send({ message: "Your password has been changed." });
    } catch (error) {
        return res.status(403).send({ message: error.message });
    }


}
exports.editBankDetails = async (req, res, next) => {
    try {
        let seller = await allModels.seller.findOne({ "_id": req.userId })

        if (!seller) { return res.status(409).send({ message: "User not found, please check and try again." }) }
        seller.bankDetails = req.body.bankDetails ? req.body.bankDetails : seller.bankDetails;

        await seller.save()
        let mailBody = {
            'emailId': seller.emailAddress,
            'subject': 'Bank Details',
            'message': `Your Bank Details has been updated!`
        }
        req.mailBody = mailBody;
        await mailService.sendMail(req, res);
        return res.send({ message: "Your bank details have been updated.", seller })

    } catch (error) { return res.status(403).send({ message: error.message }); }
}
exports.businessInfoemation = async (req, res, next) => {
    try {
        let seller = await allModels.seller.findOne({ "_id": req.userId })
        if (!seller) { return res.status(409).send({ message: "User not found, please check and try again." }) }
        seller.questionnaire = req.body.questionnaire ? req.body.questionnaire : seller.questionnaire;
        await seller.save()

        return res.send({ message: "Business Information has been Updated!", seller })
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }
}
exports.companyProfileUpdate = async (req, res, next) => {

    try {

        let seller = await allModels.seller.findOne({ "_id": req.userId })
            .select(["_id", "nameOfBussinessEnglish","nameOfBussinessArabic", "countryCode", "sellerAddress", "socialMedia"])

        if (!seller) { return res.status(409).send({ message: "User not found, please check and try again." }) }
        seller.nameOfBussinessEnglish = req.body.nameOfBussinessEnglish ? req.body.nameOfBussinessEnglish : seller.nameOfBussinessEnglish;
        seller.nameOfBussinessArabic = req.body.nameOfBussinessArabic ? req.body.nameOfBussinessArabic : seller.nameOfBussinessArabic;
        seller.countryCode = req.body.countryCode ? req.body.countryCode : seller.countryCode;
        seller.sellerAddress = req.body.sellerAddress ? req.body.sellerAddress : seller.sellerAddress;
        seller.socialMedia = req.body.socialMedia ? req.body.socialMedia : seller.socialMedia;
        seller.deliveryMethod = req.body.deliveryMethod ? req.body.deliveryMethod :
            seller.deliveryMethod;

        await seller.save()

        return res.send({ message: "Company profile has been updated!", seller })

    }

    catch (error) {
        return res.status(403).send({ message: error.message });
    }

}