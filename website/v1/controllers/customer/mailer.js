let allModels = require("../../../../utilities/allModels")
let crypto = require("crypto");
let mailService = require("../../middlewares/mailService");
let { sendNotification } = require("../../middlewares/sendNotification");

exports.mailer = async (req, res) => {
    let user = await allModels.customer.findOne({
        "emailAddress": req.body.emailAddress
    });
    if (!user) {
        return res.status(402).send({ message: "Your email is invalid, please check and try again." });
    }
    let token = crypto.randomBytes(30).toString("hex");
    user.resetpasswordtoken = token;
    user.resetpasswordexpire = Date.now() + 3600000;
    await user.save();
    
    if (req.headers.host == "api.mymrkt.work") {
        //mailBody.message = `<a href="${process.env.UAT_WEBSITE}/forgot-password/${token}">Please click here to reset your MyMarketplace Account Password ${process.env.UAT_WEBSITE}/forgot-password/` + token+`</a>`;
         var link= `${process.env.UAT_WEBSITE}/forgot-password/${token}`;
    } else {
        //mailBody.message =  `<a href="${process.env.DEV_WEBSITE}/forgot-password/${token}">Please click here to reset your MyMarketplace Account Password ${process.env.DEV_WEBSITE}/forgot-password/` + token+`</a>`;
        var link= `${process.env.DEV_WEBSITE}/forgot-password/${token}`
    }
    let data= {link: link, emailAddress: req.body.emailAddress}
    // req.mailBody = mailBody;
    // await mailService.sendMail(req, res);

    //Sending Notification
    sendNotification(req, null, null, '51', data, 'other', data._id)

    return res.send({ message: "A password reset link has been sent to your registered email.", d: user });
}
