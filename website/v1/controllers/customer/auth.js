let allModels = require("../../../../utilities/allModels");
let bcrypt = require("bcrypt");
let mailService = require('../../middlewares/mailService');
const { validationResult } = require('express-validator');
let sendSMS = require("../../middlewares/sendSMS");
let { sendNotification } = require("../../middlewares/sendNotification");
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
            firstName: reqData.firstName.split(" ")[0],
            lastName: reqData.firstName.split(" ")[1],
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
        let otp = generateOTP();
        newuser.otp = otp;
        newuser.expireOtp = Date.now() + (1000 * 60) * 5; // 5 min expiry time added

        let data = await newuser.save();
        generateTapCustomerId(newuser);
        //notification.addNotification(data._id, data._id, "other", ` Thank you for becoming a member of My Market Family; we hope you enjoy your shopping experience! Your Login details ${req.body.emailAddress}`, "email",
        //data._id, "Welcome new user")

        //console.log(data)
        /**send email dynamically*/
        // let mailBody = {
        //     'emailId': req.body.emailAddress,
        //     'subject': 'Registration',
        //     'message': `Congratulations! Your account has been created.`
        // }
        // req.mailBody = mailBody;
        // await mailService.sendMail(req, res);
        /**send email dynamically*/

        data = await allModels.customer.findOne({ _id: data._id }).select(['emailAddress', 'emailAddressVerified', 'firstName', 'lastName', 'mobilePhone', 'mobileCountryCode', 'mobilePhoneVerified', 'gender', 'defaultLanguage']);

        if (req.body.deviceIdentifier) {
            await cartOperation(req.body.deviceIdentifier, data.id);
        }
        data.customername = `${data.firstName} ${data.lastName}`
        sendNotification(req, null, data._id, '48', data, 'customer', data._id)
        return res.send({ message: "Congratulations! Your account has been created.", d: data, token: newuser.UserToken() });
    }
    catch (error) {
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

    let user = await allModels.customer.findOne({
        "emailAddress": req.body.emailAddress,
        "_id": req.userId,
    })
    //console.log(user)
    if (!user) { return res.status(403).send({ message: "Invalid User" }) }
    if (user.otp != req.body.otp) { return res.status(403).send({ message: "Invalid OTP" }) }
    let now = new Date();
    let expiry = new Date(user.expireOtp);
    if (!(now < expiry)) { return res.status(403).send({ message: "OTP has been expired" }) }
    user.emailAddressVerified = true;
    await user.save();
    return res.send({ message: "Your email address has been verified." });
    //testing
    /* console.log("exp: ", `${expiry.getDate()}-${expiry.getMonth()}-${expiry.getFullYear()} ${expiry.getHours()}:${expiry.getMinutes()}:${expiry.getSeconds()}:${expiry.getMilliseconds()}`);
    console.log("now: ", `${now.getDate()}-${now.getMonth()}-${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}:${expiry.getMilliseconds()}`);
    console.log(now < expiry); */
}


exports.verifyMobile = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let user = await allModels.customer.findOne({
        "mobilePhone": req.body.mobile,
        "_id": req.userId,
    })
    //console.log(user)
    if (!user) { return res.status(403).send({ message: "Invalid User" }) }
    if (user.otp != req.body.otp) { return res.status(403).send({ message: "Invalid OTP" }) }
    let now = new Date();
    let expiry = new Date(user.expireOtp);
    if (!(now < expiry)) { return res.status(403).send({ message: "OTP has been expired" }) }
    user.mobilePhoneVerified = true;
    await user.save();

    return res.send({ message: "Your mobile number has been verified." });

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
        user.expireOtp = Date.now() + (1000 * 60) * 5; // 5 min expiry time added(1sec =>1000mill , 1min =>60sec,  5min)
        await user.save();
        /**send email dynamically*/
        let mailBody = {
            'emailId': req.body.emailAddress,
            'subject': 'Registration OTP',
            'message': `Your one time password is ` + otp + `.`
        }
        req.mailBody = mailBody;
        await mailService.sendMail(req, res);
        return res.send({ message: "OTP has been sent" });
    }
    catch (error) {
        //console.log(error)
        return res.status(422).send({ error: error.message });
    }
}
exports.mobileOtp = async (req, res, next) => {
    try {
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

        req.toNumber = fullMobile;
        req.message = message;
        await sendSMS.sendSMS(req, res, next).then((smsres) => {
            return res.send({
                message: "OTP has been sent to your mobile number.",
            });
        })
    }
    catch (error) {
        return res.status(422).send({ error: error.message });
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
                $and: [{
                    "emailAddress": req.body.user,

                    // "emailAddressVerified": true
                }]
            },
            {
                "mobilePhone": req.body.user,
                "mobileCountryCode": req.body.mobileCountryCode
            }
        ]
    })

    if (!user) {
        return res.status(409).send({ message: "User not found, please check and try again." });
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
        data: { customerId: user.id, tapCustomerId: user.tapCustomerId }
    });
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
    user['emailAddressVerified'] = false
    user['mobilePhoneVerified'] = false
    await user.save();

    return res.send({ message: "Your Account is Deactivated!" });


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
    const updateKeys = Object.keys(req.body);
    updateKeys.forEach((update) => (user[update] = req.body[update]));

    if (req.body.password) {
        let salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(
            user.password,
            salt
        );
    }

    let data = await user.save();
    if (req.body.password) {
        data.customername = data.firstName
        //notification
        sendNotification(req, null, req.userId, '52', data, 'customer', data._id)
    }
    return res.send({ message: "Profile details has been updated.", d: data });

}


//validate email 
exports.validateEmailAddress = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let user = await allModels.customer.findOne({
        "emailAddress": req.body.emailAddress
    });

    if (user) {
        return res.status(409).send({ message: "Uh Oh! This Email Address is in use. Try logging in instead." });
    }
    return res.send({ message: "Email address available" });
}

//validate mobile 
exports.validateMobileNumber = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let user = await allModels.customer.findOne({
        "mobilePhone": req.body.mobilePhone
    });
    //console.log(user)
    if (user) {
        return res.status(409).send({ message: "Uh Oh! This Mobile number is in use. Try logging in instead." });
    }
    return res.send({ message: "Mobile number available" });
}

//random password generator
exports.randomString = async (length) => {
    var i, key = "", characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$@&*";
    var charactersLength = characters.length;

    for (i = 0; i < length; i++) {
        key += characters.substr(Math.floor((Math.random() * charactersLength) + 1), 1);
    }
    return key
}

//language update api
exports.languageUpdate = async (req, res, next) => {
    try {

        let customer = await allModels.customer.findById({
            customerId: req.userId
        });
        //console.log(order)
        if (!customer) { return res.status(403).send({ message: "Invalid customer id selected" }); }
        
        if (req.body.language == 'english' || req.body.language == "arabic") {
            customer['defaultLanguage'] = req.body.language
        }
        await order.save()
        //console.log(data)
        return res.send({ message: "language updated successfully.." })
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }
}


//guest user signup
exports.guest_signup = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {
        let user = await allModels.customer.findOne({
            "emailAddress": req.body.emailAddress
        });
        //console.log(user)
        if (user) {
            return res.status(409).send({ message: "Uh Oh! This Email Address is in use. Try logging in instead." });
        }

        let mobile = await allModels.customer.findOne({
            "mobilePhone": req.body.mobilePhone

        });
        // console.log(mobile)
        if (mobile) {
            return res.status(409).send({ message: "Uh Oh! This Mobile Number is in use. Try logging in instead" });
        }
        let reqData = req.body;
        let password = await this.randomString(9);

        const newuser = new allModels.customer({
            firstName: reqData.firstName,
            lastName: reqData.lastName,
            emailAddress: reqData.emailAddress,
            password: password,
            mobilePhone: reqData.mobilePhone
        });

        //console.log(newuser['password'])

        let salt = await bcrypt.genSalt(10);
        newuser['password'] = await bcrypt.hash(
            newuser['password'],
            salt
        );
        let otp = generateOTP();
        newuser['otp'] = otp;
        newuser['expireOtp'] = Date.now() + (1000 * 60) * 5; // 5 min expiry time added
        let data = await newuser.save();
        //console.log(data)
        /**send email dynamically*/
        let mailBody = {
            'emailId': req.body.emailAddress,
            'subject': 'Registration',
            'message': `Congratulations! Your account has been created. Your auto generated password is ${password}. Please verify your email with OTP ${otp} to login.`
        }
        req.mailBody = mailBody;
        await mailService.sendMail(req, res);
        /**send email dynamically*/

        /** add addres*/
        await this.add_guest_address(reqData, newuser._id);
        data = await allModels.customer.findOne({ _id: data._id }).select(['emailAddress', 'emailAddressVerified', 'firstName', 'lastName', 'mobilePhone', 'mobileCountryCode', 'mobilePhoneVerified', 'gender']);

        return res.send({ message: "Congratulations! Your account has been created.", d: data, token: newuser.UserToken() });
    }
    catch (error) {
        return res.status(422).send({ error: error.message });
        //console.log(error)
    }

}

//add guest address
exports.add_guest_address = async (data, customerId) => {
    try {
        const localAddress = new allModels.customerAddress({
            customerId: customerId,
            addressName: data.firstName,
            addressType: data.addressType,
            contactNumber: data.mobilePhone,
            addressLine1: data.addressLine1,
            addressLine2: data.addressLine2 || null,
            addressLine3: data.addressLine3 || null,
            city: data.city,
            state: data.state,
            country: data.country,
            pincode: data.pincode,
        });
        //console.log(localAddress);
        await localAddress.save();
    } catch (error) {
        return res.status(422).send({ error: error.message });
    }
}

exports.getprofile = async (req, res) => {
    let customer = await allModels.customer.findOne({ "_id": req.userId })
        .select(["-password", "-resetpasswordtoken", "-__v", "-updatedAt", "-expireOtp", "-createdAt"])

    return res.send({ customer })
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
                //console.log(response);
            }).catch(function (err) {
                console.log(err);
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

//social signup
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
            mobileCountryCode: reqData.mobileCountryCode,
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

exports.facebookSignup = async (req, res, next) => {
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
            mobileCountryCode: reqData.mobileCountryCode,
            facebookLoginId: reqData.facebookLoginId,
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
            emailAddressVerified: true,
            googleLoginId: req.body.googleLoginId
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
        return error
    }

}

exports.facebookLogin = async (req, res, next) => {

    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {
        let user = await allModels.customer.findOne({
            emailAddress: req.body.emailAddress,
            emailAddressVerified: true,
            facebookLoginId: req.body.facebookLoginId
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
        return error
    }

}
