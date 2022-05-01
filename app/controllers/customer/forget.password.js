let express = require("express");
// let router = express.Router();
const { validationResult } = require('express-validator');
let allModels = require("../../../utilities/allModels");
let mailService = require("../../middlewares/mailService");
let bcrypt = require("bcrypt");

function generateOTP() {
    var digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < 4; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
}
exports.resendOtp = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    let seller = await allModels.customer.findOne({
        "emailAddress": req.body.emailAddress
    });
    if (!seller) {
        return res.status(409).send({ message: "User not found, please check and try again." });
    }
    let otp = generateOTP();
    seller.otp = otp
    seller.expireOtp = Date.now() + (1000 * 60) * 5.2; // 5 min expiry time added(1sec =>1000mill , 1min =>60sec,  5min)
    await seller.save();
    let mailBody = {
        'emailId': req.body.emailAddress,
        'subject': 'Registration',
        'message': `Your one time password is ` + otp + `.`
    }
    req.mailBody = mailBody;
    await mailService.sendMail(req, res);
    return res.send({ message: "OTP has been sent" });
}
exports.sendForPassword = async (req, res) => {

    let checkCustomer
    let otp
    if (req.body.emailAddress) {
        checkCustomer = await allModels.customer.findOne({ "emailAddress": req.body.emailAddress })
        if (!checkCustomer) {
            return res.send({ message: "Invalid customer" })
        }
        otp = generateOTP();
        checkCustomer.otp = otp;
        checkCustomer.expireOtp = Date.now() + (1000 * 60) * 2; // 2 min expiry time added

        let data = await checkCustomer.save();

        let mailBody = {
            'emailId': req.body.emailAddress,
            'subject': 'Verification',
            'message': `Your one time password is ` + otp + `.`
        }
        req.mailBody = mailBody;
        await mailService.sendMail(req, res);
        return res.send({ message: "Otp is send to your email address ", d: data });

        // console.log(req.body.emailAddress)
    }

    if (req.body.mobilePhone) {
        // console.log(req.body.mobilePhone)

        return res.send({ message: "SMS api not ready" });
    }
}
exports.passwordVerifyOtp = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    try {
        // let user = await allModels.customer.findOne({
        //     emailAddress: req.body.email,
        //     otp: req.body.otp
        // })
        let user = await allModels.customer.findOne({

            otp: req.body.otp
        })

        if (!user) {
            return res.send({ message: "Please enter valid otp" })
        }
        return res.send({ message: "Please set your new password", token: user.UserToken() })
    }
    catch (error) {
        return error.message
    }
}

exports.setNewpassword = async (req, res) => {

    try {
        const validationError = validationResult(req);
        if (!validationError.isEmpty()) {
            return res.status(403).send({ message: validationError.array() });
        }

        let user = await allModels.customer.findOne({ '_id': req.userId })
        //console.log(req.userId)

        if (!user) {
            return res.send({ message: "Invalid customer" })
        }

        let password = await bcrypt.compare(
            req.body.password,
            user.password
        );
        if (password) {
            return res.status(403).send({ message: "New password can't be same as old password." });
        }

        user.password = req.body.password;
        let salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        await user.save();
        //console.log(req.userId)
        return res.send({ message: "Your password is updated1!", token: user.UserToken() })

    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }

}

exports.ChangePassword = async (req, res, next) => {

    try {
        const validationError = validationResult(req);
        if (!validationError.isEmpty()) {
            return res.status(403).send({ message: validationError.array() });
        }

        const email = req.body.email;
        const userExistance = await allModels.customer.findOne({
            "emailAddress": email
        }).select(["emailAddress"])
        if (!userExistance) {
            return res.status(403).send({ message: "User does not exists" })
        }
        let otp = generateOTP();
        userExistance.otp = otp;

        let data = await userExistance.save();

        let mailBody = {
            'emailId': email,
            'subject': 'Verification',
            'message': `Your one time password is ` + otp + `.`
        }
        req.mailBody = mailBody;
        await mailService.sendMail(req, res);
        return res.send({ message: "Otp is send to your email address ", d: data });

    }
    catch (err) {
        return res.status(403).send({ message: err.message });
    }

}

exports.updatePassword = async (req, res, next) => {

    try {
        const validationError = validationResult(req);
        if (!validationError.isEmpty()) {
            return res.status(403).send({ message: validationError.array() });
        }

        let user = await allModels.customer.findOne({ '_id': req.userId })
        //console.log(req.userId)

        if (!user) {
            return res.send({ message: "Invalid customer" })
        }

        let password = await bcrypt.compare(
            req.body.password,
            user.password
        );
        if (password) {
            return res.status(403).send({ message: "New password can't be same as old password." });
        }

        user.password = req.body.password;
        let salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        await user.save();
        // console.log(req.userId)
        return res.send({ message: "Your password is updated1!", token: user.UserToken() })

    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }

}
