let allModels = require("../../../../utilities/allModels");
let bcrypt = require("bcrypt");
const { validationResult } = require('express-validator');
let mailService = require("../../middlewares/mailService");
let sendSMS = require("../../middlewares/sendSMS");
let mongoose = require("mongoose");
const { sendMail } = require("../../middlewares/mailService");

exports.signup = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    let admin = await allModels.admin.findOne({
        "emailAddress": req.body.emailAddress
    });
    if (admin) {
        return res.status(409).send({ message: "Uh Oh! This Email Address is in use. Try logging in instead." });
    }

    const newadmin = new allModels.admin(req.body);
    let salt = await bcrypt.genSalt(10);
    // @ts-ignore
    newadmin.password = await bcrypt.hash(
        // @ts-ignore
        newadmin.password,
        salt
    );
    // let otp = generateOTP();
    // newadmin.otp = otp;
    // newadmin.expireOtp = Date.now() + (1000 * 60) * 5; // 5 min expiry time added
    let data = await newadmin.save();
    // let mailBody = {
    //     'emailId': req.body.emailAddress,
    //     'subject': 'Registration',
    //     'message': `Congratulations! Your account has been created. Your one time password is ` + otp + `.`
    // }
    // req.mailBody = mailBody;
    // await mailService.sendMail(req, res);
    // admin = await allModels.admin.findOne({
    //     emailAddress: req.body.emailAddress
    // })

    return res.send({
        message: "Congratulations! Your account has been created.",
        d: data, token: newadmin.adminToken()
    });

}

function generateOTP() {
    var digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < 4; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
}

exports.login = async (req, res, next) => {

    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let admin = await allModels.admin.findOne({
        "emailAddress": req.body.emailAddress
    })

    if (!admin) {
        return res.status(409).send({ message: "Your email is invalid, please check and try again." });
    }
    //after password bcrypt
    let password = await bcrypt.compare(
        req.body.password,
        admin.password
    );
    if (!password) {
        return res.status(403).send({ message: "Your password is incorrect, please try resetting your password." });
    }
    let token = admin.adminToken();
    admin = await allModels.admin.findOne({
        "emailAddress": req.body.emailAddress
    })

    //send otp 
    let otp = generateOTP();

    admin.otp = otp;
    admin.expireOtp = Date.now() + (1000 * 60) * 5; // 5 min expiry time added(1sec =>1000mill , 1min =>60sec,  5min)
    // console.log("admin",admin.mobileOtp)
    //save otp and false mobile verified
    await admin.save()

    let message = `Your one time password is ` + otp + `.`
    let fullMobile = admin.mobileCountryCode + '' + admin.mobileNumber;
    req.toNumber = fullMobile;
    req.message = message;

    //EMAIL OTP
    let mailResponse = await sendMail({
        mailBody: {
            emailId: req.body.emailAddress,
            subject: "2Auth OTP",
            message: message
        }
    }, res);

    //SMS OTP
    await sendSMS.sendSMS(req, res, next).then((smsres) => {
        return res.send({
            message: "OTP has been sent to your mobile number.",
            token: token,
            emailAddress: admin.emailAddress,
            emailResponse: mailResponse
        });
    });

}

//mobile number otp verified api
exports.adminVerifyOtp = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let admin = await allModels.admin.findOne({
        "emailAddress": req.body.emailAddress

    })
    if (!admin) { return res.status(403).send({ message: "Invalid User", status: false }) }
    if (admin.otp != req.body.otp) { return res.status(403).send({ message: "Invalid OTP" }) }
    let now = new Date();
    let expiry = new Date(admin.expireOtp);
    if (!(now < expiry)) { return res.status(403).send({ message: "OTP has been expired" }) }
    admin.emailAddressVerified = true;
    let token = admin.adminToken();
    await admin.save();

    admin1 = await allModels.admin.aggregate([
        { $match: { "emailAddress": req.body.emailAddress } },
        {
            $lookup: {
                from: "roles",
                localField: "role",
                foreignField: "_id",
                as: "roles"
            }

        },
        {
            $lookup: {
                from: "permissions",
                localField: "roles.permissions",
                foreignField: "_id",
                as: "permissions"
            }

        },
        { $unwind: { path: "$roles", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                password: 0,
                resetpasswordtoken: 0,
                resetpasswordexpire: 0,
                __v: 0
            }
        }
    ])
    return res.send({ message: "Login successfully", token: token, data: admin1, status: true });
}

exports.adminResendOtp = async (req, res, next) => {


    let admin = await allModels.admin.findOne({
        "emailAddress": req.body.emailAddress
    })

    if (!admin) {
        return res.status(409).send({ message: "Your email is invalid, please check and try again." });
    }
    let token = admin.adminToken();
    let otp = generateOTP();

    admin.otp = otp;
    admin.expireOtp = Date.now() + (1000 * 60) * 5; // 5 min expiry time added(1sec =>1000mill , 1min =>60sec,  5min)
    await admin.save()

    let message = `Your one time password is ` + otp + `.`
    // console.log("message", message)
    let fullMobile = admin.mobileCountryCode + '' + admin.mobileNumber;
    req.toNumber = fullMobile;
    req.message = message;
    await sendSMS.sendSMS(req, res, next).then((smsres) => {
        return res.send({
            message: "OTP has been sent to your mobile number.",
            token: token,
            emailAddress: admin.emailAddress
        });
    })

}



exports.getprofile = async (req, res) => {

    let admin = await allModels.admin.aggregate([
        { $match: { "_id": mongoose.Types.ObjectId(req.userId) } },
        {
            $lookup: {
                from: "roles",
                localField: "role",
                foreignField: "_id",
                as: "roles"
            }

        },
        {
            $lookup: {
                from: "permissions",
                localField: "roles.permissions",
                foreignField: "_id",
                as: "permissions"
            }

        },
        { $unwind: { path: "$roles", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                password: 0,
                resetpasswordtoken: 0,
                resetpasswordexpire: 0,
                __v: 0
            }
        }
    ])
    // console.log(admin, req.userId)
    if (admin.length == 0) {
        return res.send({ message: "No data found" })
    }

    return res.send({ data: admin })

}

exports.changepassword = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let admin = await allModels.admin.findOne({ _id: req.userId });
    if (!admin) {
        return res.status(403).send({ message: "Admin not found, please check and try again." })
    }
    //console.log(admin)

    try {
        let password = await bcrypt.compare(
            req.body.oldPassword,
            admin.password
        );
        if (!password) {
            return res.status(403).send({ message: "Your old password is incorrect." });
        }

        let oldpassword = await bcrypt.compare(req.body.newPassword, admin.password);
        if (oldpassword) { return res.status(402).send({ message: "The new password matches your current password! Please set a new password" }) };

        let hashedpassword = await bcrypt.hash(req.body.newPassword, 10)
        admin.password = hashedpassword;
        await admin.save()
        return res.send({ message: "Your password has been changed." });
    } catch (error) {
        return res.status(403).send({ message: error.message });
    }
}

exports.editProfile = async (req, res) => {
    let admin = await allModels.admin.findOne({
        "_id": req.userId
    });
    if (!admin) {
        return res.send({ message: "No data found" })
    }

    // admin.firstName = req.body.firstName
    // admin.lastName = req.body.lastName

    const updateKeys = Object.keys(req.body);
    updateKeys.forEach((update) => (admin[update] = req.body[update]));

    await admin.save();
    return res.send({ message: "Your profile has been updated" })
}