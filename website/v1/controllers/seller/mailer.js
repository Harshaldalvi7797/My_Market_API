let allModels = require("../../../../utilities/allModels")
let crypto = require("crypto");
const { validationResult } = require('express-validator');
let mailService = require("../../middlewares/mailService");

exports.mailer = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    let seller = await allModels.seller.findOne({
        "emailAddress": req.body.emailAddress
    });
    if (!seller) {
        return res.status(402).send({ message: "Your email is invalid, please check and try again." });
    }
    let token = crypto.randomBytes(30).toString("hex");
    seller.resetpasswordtoken = token;
    seller.resetpasswordexpire = Date.now() + 3600000; //1hr expiry time
    await seller.save();
    let mailBody = {
        'emailId': req.body.emailAddress,
        'subject': 'Reset Your Password',
        'message': ""
    }
    //Please click here to reset your MyMarketplace Account Password: https://seller.mymrkt.work/forget-password/` + token + `.
    if (req.headers.host == "api.mymrkt.work") {
        mailBody.message = `Please click here to reset your MyMarketplace Account Password: <a href="${process.env.UAT_SELLER}/forget-password/${token}"> ${process.env.UAT_SELLER}/forget-password/` + token + `</a>`;
    } else {
        mailBody.message = `Please click here to reset your MyMarketplace Account Password: <a href="${process.env.DEV_SELLER}/forget-password/${token}"> ${process.env.DEV_SELLER}/forget-password/` + token + `</a>`;
        //`Please click here to reset your MyMarketplace Admin Account Password: ${process.env.DEV_ADMIN}/forget-password/` + token;
    }
    //https://mmwebsite.datavivservers.in
    //https://mmseller.datavivservers.in
    req.mailBody = mailBody;
    let mailResponse = await mailService.sendMail(req, res);
    return res.send({ message: "A password reset link has been sent to your registered email.", mailResponse: mailResponse });


}
