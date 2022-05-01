let express = require("express");
// let router = express.Router();
let allModels = require("../../../../utilities/allModels")
let mailService = require("../../middlewares/mailService");
let bcrypt = require("bcrypt");
let { sendNotification } = require("../../middlewares/sendNotification");

function generateOTP() {
    var digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < 4; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
}

exports.forgetPassword = async (req, res) => {
    let user = await allModels.customer.findOne({
        "resetpasswordtoken": req.params.token,
        "resetpasswordexpire":
        {
            $gt: Date.now()
        }
    })
    if (!user) { return res.status(403).send({ message: "invalid token or token got expires" }) }

    let oldpassword = await bcrypt.compare(req.body.password, user.password);
    if (oldpassword) { return res.status(402).send({ message: "its same ." }) };

    //console.log(oldpassword);
    user.password = req.body.password;
    user.resetpasswordexpire = undefined;
    user.resetpasswordtoken = undefined;
    let salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    await user.save();
    
    //Sending Notification
    sendNotification(req, null, user._id, '52', user, 'Password Changed', user._id)

    return res.send({ message: "Your password has been updated." })
}

exports.ChangePassword = async (req, res, next) => {

    try {

        const email = req.body.email;
        const userExistance = await allModels.customer.findOne({
            "emailAddress": email
        })
        if (!userExistance) {
            return res.status(403).send({ message: "User does not exists" })
        }
        let otp = generateOTP();
        // console.log("otp", otp)
        userExistance.otp = otp;
        // console.log("otp", otp)
        let data = await userExistance.save();

        let mailBody = {
            'emailId': email,
            'subject': 'change password OTP',
            'message': `Your one time password is ` + otp + `.`
        }
        req.mailBody = mailBody;
        await mailService.sendMail(req, res);
        return res.send({ message: "OTP has been sent" });

        // req.emailId= email;
        // req.subject= 'Verification';
        // req.message= `Your one time password is ` + otp + `.`

        //  return res.send({ message: "OTP is send to your email address ", d: data });

    }
    catch (err) {
        return res.status(400).send(err);
    }

}


exports.passwordVerifyOtp = async (req, res, next) => {

    allModels.customer.findOne({ 'otp': req.body.otp })
        .then(async user => {
            if (!user) {
                return res.status(403).send({ message: "Invalid Otp" })
            }

            if (user.password) {
                let password = await bcrypt.compare(
                    req.body.password,
                    user.password
                );
                if (password) {
                    return res.status(403).send({ message: "New password can't be same as old password." });
                }
            }

            bcrypt.hash(req.body.password, 10)
                .then(async hashedpassword => {
                    //console.log(user.password)
                    user.password = hashedpassword;
                    //console.log(hashedpassword)
                    return await user.save()
                })
                .then(result => {
                    if (!result) {
                        return res.status(403).send({ message: 'Something went wrong' })
                    }
                    //console.log(result.password)
                    return res.send({ message: "your password has been updated successfully" })
                })
        })

}