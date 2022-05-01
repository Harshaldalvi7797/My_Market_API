let allModels = require("../../../utilities/allModels");
let bcrypt = require("bcrypt");
let mailService = require('../../middlewares/mailService');
const { validationResult } = require('express-validator');
let sendSMS = require("../../middlewares/sendSMS");
const countries = require('country-data').countries;

exports.signup = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    try {
        let user = await allModels.customer.findOne({
            "emailAddress": req.body.emailAddress
        });
        if (user) {
            return res.status(409).send({ message: "Uh Oh! This Email Address is in use. Try logging in instead." });
        }
        let mobile = await allModels.customer.findOne({
            "mobilePhone": req.body.mobilePhone

        });
        if (mobile) {
            return res.status(409).send({ message: "Uh Oh! This Mobile Number is in use. Try logging in instead" });
        }

        let reqData = req.body;

        let b = countries.all.filter(f => {
            if (f.countryCallingCodes.length > 0) {
                return f.countryCallingCodes[0].toString().replace(/\+/g, "") == reqData.mobileCountryCode
            } else {
                return false;
            }
        });

        if (b.length > 0) { }
        const newuser = new allModels.customer({
            firstName: reqData.firstName,
            lastName: reqData.lastName,
            emailAddress: reqData.emailAddress,
            password: reqData.password,
            mobilePhone: reqData.mobilePhone,
            mobileCountryCode: reqData.mobileCountryCode,
            active: true,
            customerCountry: b[0].name.toUpperCase(),
            referredBy: reqData.referredBy || null
        });
        let salt = await bcrypt.genSalt(10);
        newuser.password = await bcrypt.hash(
            newuser.password,
            salt
        );
        // let otp = generateOTP();
        // newuser.otp = otp;
        // newuser.expireOtp = Date.now() + (1000 * 60) * 2; // 2 min expiry time added
        let data = await newuser.save();
        generateTapCustomerId(newuser);
        /**send email dynamically*/
        let mailBody = {
            'emailId': req.body.emailAddress,
            'subject': 'Registration',
            'message': `Congratulations! Your account has been created.`
        }
        req.mailBody = mailBody;
        await mailService.sendMail(req, res);
        /**send email dynamically*/

        data = await allModels.customer.findOne({ _id: data._id })
            .select(['emailAddress', 'customerCountry', 'emailAddressVerified', 'firstName', 'lastName', 'mobilePhone', 'mobilePhoneVerified', 'mobileCountryCode', 'gender', 'tapCustomerId']);

        if (req.body.deviceIdentifier) {
            await cartOperation(req.body.deviceIdentifier, data.id);
        }
        return res.send({ message: "Congratulations! Your account has been created.", d: data, token: newuser.UserToken() });
    }
    catch (error) {
        //console.log(error)
        return res.status(422).send({ error: error.message });
    }

}

function generateOTP() {
    var digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < 4; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
}

exports.verifyOtp = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    if (req.body.emailAddress) {
        let user = await allModels.customer.findOne({
            "emailAddress": req.body.emailAddress

        })
        if (!user) { return res.status(403).send({ message: "Invalid User" }) }
        if (user.otp != req.body.otp) { return res.status(403).send({ message: "Invalid OTP" }) }
        let now = new Date();
        let expiry = new Date(user.expireOtp);
        if (!(now < expiry)) { return res.status(403).send({ message: "OTP Expired" }) }
        user.emailAddressVerified = true;
        await user.save();
        return res.send({ message: "Your email address has been verified." });
    }

    else if (req.body.mobilePhone && req.body.mobileCountryCode) {
        let user = await allModels.customer.findOne({
            "mobilePhone": req.body.mobilePhone,
            "mobileCountryCode": req.body.mobileCountryCode
        })
        if (!user) { return res.status(403).send({ message: "No Data found with given information" }) }
        if (user.otp != req.body.otp) { return res.status(403).send({ message: "Please enter valid OTP." }) }
        let now = new Date();
        let expiry = new Date(user.expireOtp);
        if (!(now < expiry)) { return res.status(403).send({ message: "Your OTP has been expired" }) }
        user.mobilePhoneVerified = true;
        await user.save();
        return res.send({ message: "Your mobile number has been verified." });
        // return res.send({ message: "Mobile sms api not ready" })
    }
    else {
        return res.send({ message: "Wrong input" })
    }

    //testing
    /* console.log("exp: ", `${expiry.getDate()}-${expiry.getMonth()}-${expiry.getFullYear()} ${expiry.getHours()}:${expiry.getMinutes()}:${expiry.getSeconds()}:${expiry.getMilliseconds()}`);
    console.log("now: ", `${now.getDate()}-${now.getMonth()}-${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}:${expiry.getMilliseconds()}`);
    console.log(now < expiry); */
}

exports.resendOtp = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    try {
        let user = await allModels.customer.findOne({
            "emailAddress": req.body.emailAddress
        });
        if (!user) { return res.status(409).send({ message: "Invalid User" }) }
        let otp = generateOTP();
        user.otp = otp
        user.expireOtp = Date.now() + (1000 * 60) * 2; // 2 min expiry time added(1sec =>1000mill , 1min =>60sec,  5min)
        await user.save();
        /**send email dynamically*/
        let mailBody = {
            'emailId': req.body.emailAddress,
            'subject': 'Registration OTP',
            'message': `Your one time password is ` + otp + `.`
        }
        req.mailBody = mailBody;
        await mailService.sendMail(req, res);
        return res.send({ message: "OTP Sent" });
    }
    catch (error) {
        //console.log(error)
        return res.send({ message: error.message });
    }
}

exports.login = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let user = await allModels.customer.findOne({
        $or: [
            {
                $and: [{ "emailAddress": req.body.user }
                    // { "emailAddressVerified": true }
                ]
            },
            { "mobilePhone": req.body.user, "mobileCountryCode": req.body.mobileCountryCode }
        ]
    })
    /*  "emailAddress": req.body.emailAddress,
        "emailAddressVerified": true
    */

    if (!user) {
        return res.status(409).send({ message: "Your email/mobile is invalid, please check and try again." });
    }
    if (user['active'] == false) {
        return res.send({ message: "Your account is Inactive" })
    }
    //after password bcrypt
    let password = await bcrypt.compare(
        req.body.password,
        user.password
    );
    if (!password) {
        return res.status(403).send({ message: "Your password is incorrect, please try resetting your password." });
    }

    if (req.body.deviceIdentifier) {
        await cartOperation(req.body.deviceIdentifier, user.id);
    }
    let token = user.UserToken();
    return res.send({
        message: "Login Successful",
        token: token,
        data: { customerId: user.id, tapCustomerId: user.tapCustomerId },
    });
}

exports.customerAccount = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let user = await allModels.customer.findOne({
        "_id": req.userId
    });
    if (!user) {
        return res.status(403).send({ message: "Uh Oh! Invalid user." });
    }

    let checkEmail = await allModels.customer.findOne({
        "emailAddress": req.body.emailAddress
    });
    if (checkEmail) {
        return res.status(403).send({ message: "Uh Oh! this eamil already exist." });
    }

    if (req.body.password) {
        let password = await bcrypt.compare(
            req.body.password,
            user.password
        );
        if (password) {
            return res.status(403).send({ message: "New password can't be same as old password." });
        }
    }

    user.firstName = req.body.firstName ? req.body.firstName : user.firstName;
    user.lastName = req.body.firstName ? req.body.lastName : user.lastName;
    user.gender = req.body.gender ? req.body.gender : user.gender;
    user.imageFile = req.body.profileImage ? req.body.profileImage : user.imageFile;
    user.mobilePhone = req.body.mobilePhone ? req.body.mobilePhone : user.mobilePhone;

    if (req.body.password) {
        let salt = await bcrypt.genSalt(10);
        // @ts-ignore
        user.password = await bcrypt.hash(
            // @ts-ignore
            req.body.password,
            salt
        );
    }

    let data = await user.save();

    return res.send({ message: "Profile details has been updated.", d: data });

}

exports.accountDeactive = async (req, res) => {

    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let user = await allModels.customer.findOne({
        "_id": req.userId
    })
    //console.log(req.userId)
    if (!user) { return res.status(403).send({ message: "Invalid User" }) }

    user['active'] = false;
    await user.save();

    return res.send({ message: "Your Account is Deactivated!" });


}

exports.googleSignup = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    try {

        let user = await allModels.customer.findOne({
            "emailAddress": req.body.emailAddress
        });
        if (user) {
            return res.status(409).send({ message: "Uh Oh! This Email Address is in use. Try logging in instead." });
        }
        let mobile = await allModels.customer.findOne({
            "mobilePhone": req.body.mobilePhone

        });
        if (mobile) {
            return res.status(409).send({ message: "Uh Oh! This Mobile Number is in use. Try logging in instead" });
        }
        let reqData = req.body;
        let newUser = new allModels.customer({
            firstName: reqData.firstName,
            lastName: reqData.lastName,
            emailAddress: reqData.emailAddress,
            mobilePhone: reqData.mobilePhone,
            googleLoginId: reqData.googleLoginId,
            active: true,
            emailAddressVerified: true
        })

        let data = await newUser.save();
        generateTapCustomerId(newUser);
        return res.send({ message: "Congratulations! Your account has been created.", d: data, token: newUser.UserToken() });
    }
    catch (error) {
        return res.status(403).send({ message: error.message });

    }

}

exports.googleLogin = async (req, res, next) => {

    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {
        let user = await allModels.customer.findOne({
            emailAddress: req.body.emailAddress,
            emailAddressVerified: true
        })
        /*  "emailAddress": req.body.emailAddress,
            "emailAddressVerified": true
        */
        //    console.log(user)

        if (!user) {
            return res.status(409).send({ message: "Your Email in Incorrect!" });
        }
        if (user['active'] == false) {
            return res.send({ message: "Your account is Inactive" })
        }

        let token = user.UserToken();
        return res.send({
            message: "Login Successful",
            token: token,
            data: { customerId: user.id, tapCustomerId: user.tapCustomerId },
        });

    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }

}



const generateTapCustomerId = async (details) => {

    let customer = await allModels.customer.findOne({ _id: details._id });
    if (customer) {
        const postData = {
            "first_name": customer.firstName,
            "last_name": customer.lastName,
            "email": customer.emailAddress,
            "phone": {
                "country_code": customer.mobileCountryCode,
                "number": customer.mobilePhone
            },
            "currency": "BHD"
        };

        const request = require('request-promise');

        const options = {
            method: 'POST',
            uri: 'https://api.tap.company/v2/customers',
            body: postData,
            json: true,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer sk_test_XKokBfNWv6FIYuTMg5sLPjhJ'
            }
        }

        request(options)
            .then(function (response) {
                customer.tapCustomerId = response.id
                customer.save();

            }).catch(function (err) {
                // console.log(err);
            })
    }
}

const cartOperation = async (deviceIdentifier, customerId) => {

    let checkCart = await allModels.cartModel.findOne({
        deviceIdentifier: deviceIdentifier
    })
    if (checkCart) {
        let checkCart1 = await allModels.cartModel.findOne({
            customerId: customerId
        });
        if (checkCart1) {
            checkCart1.productVariants = [...checkCart.productVariants];
            await checkCart1.save();

            checkCart.delete();
        } else {
            checkCart.deviceIdentifier = null;
            checkCart.customerId = customerId;
            await checkCart.save();
        }
    }

    return true;
}

exports.sendForverify = async (req, res, next) => {

    let checkCustomer
    let otp
    //console.log("start")

    if (req.body.emailAddress) {
        //console.log("emailAddress")
        checkCustomer = await allModels.customer.findOne({ "emailAddress": req.body.emailAddress })
        if (!checkCustomer) {
            return res.send({ message: "Invalid customer" })
        }
        otp = generateOTP();
        checkCustomer.otp = otp;

        let data = await checkCustomer.save();

        let mailBody = {
            'emailId': req.body.emailAddress,
            'subject': 'Verification',
            'message': `Your one time password is ` + otp + `.`
        }
        req.mailBody = mailBody;
        await mailService.sendMail(req, res);
        return res.send({ message: "Otp is send to your email address " });

        // console.log(req.body.emailAddress)
    }

    if (req.body.mobilePhone && req.body.mobileCountryCode) {
        // console.log("mobilePhone")
        checkCustomer = await allModels.customer.findOne({ "mobilePhone": req.body.mobilePhone, "mobileCountryCode": req.body.mobileCountryCode })
        if (!checkCustomer) {
            return res.send({ message: "Invalid Mobile number" })
        }
        let otp = generateOTP();

        checkCustomer.otp = otp;
        checkCustomer.expireOtp = Date.now() + (1000 * 60) * 5; // 5 min expiry time added(1sec =>1000mill , 1min =>60sec,  5min)

        await checkCustomer.save()

        let message = `Your one time password is ` + otp + `.`
        // console.log("message", message)
        let fullMobile = checkCustomer.mobileCountryCode + '' + checkCustomer.mobilePhone;
        // console.log("admin.mobileCountryCode", admin.mobileCountryCode)
        // console.log("fullMobile", fullMobile)
        req.toNumber = fullMobile;
        req.message = message;
        await sendSMS.sendSMS(req, res, next).then((smsres) => {
            return res.send({
                message: "OTP has been sent to your mobile number.",
            });
        })
        //  return res.send({ message: "SMS api not ready" });
    }
    // else if return res.send({ message: "Please provide data" })
    else {
        return res.send({ message: "Please provide data" })
    }
    //  return res.send({ message: "Please provide data" })
}

exports.verifyLogin = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let { emailAddress, mobilePhone, otp } = req.body


    if (emailAddress) {
        checkCustomer = await allModels.customer.findOne({ "emailAddress": req.body.emailAddress, "otp": otp })
        if (!checkCustomer) {
            return res.send({ message: "Invalid customer" })
        }

        checkCustomer.emailAddressVerified = true

        await checkCustomer.save()
        return res.send({ message: "Your Email has been verified" })

    }

    if (mobilePhone) {
        return res.send({ message: "No Available" })
    }
}

