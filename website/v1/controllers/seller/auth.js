let allModels = require("../../../../utilities/allModels");
let bcrypt = require("bcrypt");
const { validationResult } = require('express-validator');
let mailService = require("../../middlewares/mailService");
let upload = require("./../../middlewares/AdminfileUpload");
let { createDirectories } = require('./../../middlewares/checkCreateFolder');
let { sendNotification } = require("../../middlewares/sendNotification");

exports.signup = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    let seller = await allModels.seller.findOne({
        "emailAddress": req.body.emailAddress
    });
    if (seller) {
        return res.status(409).send({ message: "Uh Oh! This Email Address is in use. Try logging in instead." });
    }
    let mobile = await allModels.seller.findOne({
        "mobilePhone": req.body.mobilePhone

    });
    // console.log(mobile)
    if (mobile) {
        return res.status(409).send({ message: "Uh Oh! This Mobile Number is in use. Try logging in instead" });
    }
    // const newseller = new allModels.seller(req.body);
    const newseller = new allModels.seller({
        sellerDetails: req.body.sellerDetails,
        vatNo: req.body.vatNo,
        sellerAddress: req.body.sellerAddress,
        supplierFrom: req.body.supplierFrom,
        nameOfBussinessEnglish: req.body.nameOfBussinessEnglish,
        nameOfBussinessArabic: req.body.nameOfBussinessArabic,
        emailAddress: req.body.emailAddress,
        password: req.body.password,
        countryCode: req.body.countryCode,
        mobilePhone: req.body.mobilePhone,
        deliveryMethod: req.body.deliveryMethod
    });
    let salt = await bcrypt.genSalt(10);
    // @ts-ignore
    newseller.password = await bcrypt.hash(
        // @ts-ignore
        newseller.password,
        salt
    );
    let otp = generateOTP();
    newseller.otp = otp;
    newseller.expireOtp = Date.now() + (1000 * 60) * 5; // 5 min expiry time added
    let data = await newseller.save();

    generateTapCustomerId(newseller);

    let mailBody = {
        'emailId': req.body.emailAddress,
        'subject': 'Registration',
        'message': `Congratulations! Your account has been created. Your one time password is ` + otp + `.`
    }
    req.mailBody = mailBody;
    await mailService.sendMail(req, res);
    seller = await allModels.seller.findOne({
        emailAddress: req.body.emailAddress

    }).select(['-supplierFrom', '-nameOfBussiness', '-countryCode', '-questionnaire', '-sellerDocuments', '-__v', '-createdAt', '-updatedAt']);
    //console.log(seller)

    return res.send({
        message: "Congratulations! Your account has been created.",
        d: seller, token: newseller.sellerToken()
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

exports.verifyOtp = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    let seller = await allModels.seller.findOne({
        "emailAddress": req.body.emailAddress
    })
    if (!seller) { return res.status(409).send({ message: "Invalid User" }) }
    if (seller.otp != req.body.otp) { return res.status(409).send({ message: "Invalid OTP" }) }
    let now = new Date();
    let expiry = new Date(seller.expireOtp);
    if (!(now < expiry)) { return res.status(409).send({ message: "OTP Expired" }) }
    seller.emailAddressVerified = true;
    await seller.save();
    return res.send({ message: "Your email address has been verified." })
}

exports.resendOtp = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    let seller = await allModels.seller.findOne({
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

exports.login = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }


    let seller = await allModels.seller.findOne({
        $or: [
            {
                $and: [{ "emailAddress": req.body.user }
                    // { "emailAddressVerified": true }
                ]
            },
            { "mobilePhone": req.body.user, "countryCode": req.body.countryCode },

        ]
    })
    if (!seller) {
        return res.status(409).send({ message: "User not found, please check and try again." });
    }

    //after password bcrypt   
    let password = await bcrypt.compare(
        req.body.password,
        seller.password
    );
    if (!password) {
        return res.status(403).send({ message: "Your password is incorrect, please try resetting your password." });
    }
    let token = seller.sellerToken();

    let check = await checkSellerProfile(seller);
    if (!check) {
        return res.send({
            message: "Please complete your profile",
            token: token,
            data: seller
        });
    }
    if (seller['adminVerified'] == false) {
        return res.send({ message: "Your account is not verified by Admin!" })
    }
    //data pass in login response
    seller = await allModels.seller.findOne({
        $or: [
            {
                $and: [{ "emailAddress": req.body.user },
                { "emailAddressVerified": true }]
            },
            { "mobilePhone": req.body.user }
        ]
    }).select(['-password', '-__v', '-otp', '-expireOtp', '-createdAt', '-updatedAt', '-resetpasswordtoken', '-resetpasswordexpire']);
    // console.log(seller)

    let expiryDoc = [];
    //docs expiry opearation
    if (expiryDoc.length > 0) {
    }
    return res.send({
        message: "Login Successful",
        token: token,
        expiryDoc: expiryDoc,
        data: seller
    });

}

let checkSellerProfile = async (sellerDetails) => {
    let sellerDoc = sellerDetails.sellerDocuments.length
    let sellerQuestion = sellerDetails.questionnaire.length

    if (sellerDoc >= 2 && sellerQuestion >= 1) {
        return true;
    }
    else {
        return false;
    }
}
//data: { sellerId: seller.id, token: token }
exports.addDocuments = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    //check if seller exists
    let seller = await allModels.seller.findOne({
        emailAddress: req.body.emailAddress,
        _id: req.userId
    });
    if (!seller) {
        return res.status(409).json({ error: "Invalid user" });
    }
    if (!req.body.docType) {
        return res.status(401).json({ error: "Please enter valid document type" });
    }
    let docType = null;
    let expirydate = null;
    try {
        docType = JSON.parse(req.body.docType);
        expirydate = JSON.parse(req.body.expirydate);
    } catch (error) {
        return res.status(403).send({ message: "docType has invalid format" });
    }
    try {
        //req.userId = seller._id;
        let uploadPath = "uploads/" + req.userId + "/documents/";
        await createDirectories(uploadPath);
        let allPath = [];
        // console.log("---------------============", req.body.docType);
        docType = docType.filter(a => {
            //console.log(a);
            return a != null;
        });

        expirydate = expirydate.filter(a => {
            //console.log(a);
            return a != null;
        });

        //check files and save
        let docUpload = async (req, allPath) => {
            return new Promise((resolve, reject) => {
                if (req.files && req.files.sellerDocuments) {
                    //console.log('check1');
                    //console.log("---------------", docType);

                    if (req.files.sellerDocuments.length) {
                        for (let i = 0; i < req.files.sellerDocuments.length; i++) {
                            const ele = req.files.sellerDocuments[i];

                            var file = ele
                            try {
                                allPath.push({
                                    "expirydate": expirydate[i],
                                    "docType": docType[i],
                                    "path": (req.headers.host + "/" + uploadPath + file.name).replace(/uploads\//g, "")
                                });
                            } catch (error) {
                                allPath.push({
                                    "expirydate": null,
                                    "docType": null,
                                    "path": (req.headers.host + "/" + uploadPath + file.name).replace(/uploads\//g, "")
                                });
                            }

                            file.mv(uploadPath + file.name, function (err) {
                                if (err) { console.log(err); }
                                else {
                                    console.log('file uploaded successfully');
                                }
                            });

                            if (i == (req.files.sellerDocuments.length - 1)) {
                                resolve(true);
                            }
                        }

                    } else {
                        var file = req.files.sellerDocuments
                        docType = docType.filter(a => {
                            //console.log(a);
                            return a != null;
                        });
                        allPath.push({
                            "docType": docType[0],
                            "path": (req.headers.host + "/" + uploadPath + file.name).replace(/uploads\//g, ""),
                            "expirydate": expirydate[0]
                        });

                        file.mv(uploadPath + file.name, function (err) {
                            if (err) { console.log(err); }
                            else {
                                console.log('file uploaded successfully');
                                resolve(true);
                            }
                        });
                    }
                }
            })

        }
        let mailBody = {
            'emailId': req.body.emailAddress,
            'subject': 'Document',
            'message': `Congratulations! New Document is uploaded`
        }
        req.mailBody = mailBody;
        //console.log(mailBody)
        await mailService.sendMail(req, res);

        mailBody = {
            'emailId': "tan@kenmark.in",
            'subject': 'Document',
            'message': `Congratulations! New Document is uploaded`
        }
        req.mailBody = mailBody;
        // console.log(mailBody)
        await mailService.sendMail(req, res);

        await docUpload(req, allPath);
        //updating seller record
        //console.log(JSON.stringify(seller));
        let docDetails = seller['sellerDocuments'];
        if (docDetails.length == 0) {
            seller['sellerDocuments'] = allPath;
        } else if (docDetails.length > 0) {
            for (let index = 0; index < allPath.length; index++) {
                const ele = allPath[index];
                let a = await docDetails.findIndex(x => x.docType.toString() === ele.docType.toString());
                //console.log(a);
                if (a != -1) {
                    docDetails[a].docType = ele.docType;
                    docDetails[a].path = ele.path;
                    docDetails[a].expirydate = ele.expirydate;
                } else {
                    docDetails.push({
                        docType: ele.docType,
                        path: ele.path,
                        expirydate: ele.expirydate
                    })
                }
            }

            let sellerUpdate = await allModels.seller.findOne({
                _id: seller._id
            });
            // console.log("docDetails", docDetails)
            sellerUpdate['sellerDocuments'] = docDetails;
            let mailBody = {
                'emailId': req.body.emailAddress,
                'subject': 'Registration',
                'message': `Congratulations! New Document is uploaded`
            }
            req.mailBody = mailBody;
            await mailService.sendMail(req, res);

            mailBody = {
                'emailId': "tan@kenmark.in",
                'subject': 'Document',
                'message': `Congratulations! New Document is uploaded`
            }
            req.mailBody = mailBody;
            // console.log(mailBody)
            await mailService.sendMail(req, res);
            await sellerUpdate.save();
            // console.log(sellerUpdate['sellerDocuments']);
        }

    } catch (error) {
        return res.status(403).send({ message: error.message });
    }
    await seller.save();
    let sellerData = await allModels.seller.findOne({
        emailAddress: req.body.emailAddress
    })
        .select(['-countryCode', '-mobilePhone', '-expireOtp', '-resetpasswordtoken', '-resetpasswordexpire', '-nameOfBussiness', '-supplierFrom', '-questionnaire', '-sellerAddress',
            '-sellerDetails', '-password', '-__v', '-otp', '-createdAt', '-updatedAt', '-socialMedia']);

    return res.send({ message: "Documents has been added", d: sellerData });
}
exports.questionnaire = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let seller = await allModels.seller.findOne({
        emailAddress: req.body.emailAddress

    })

    if (!seller) {
        return res.status(401).json({ error: "Invalid user" });
    }
    seller['questionnaire'] = req.body
    seller.save()

    //Notification Work
    seller.sellername = seller.nameOfBussinessEnglish
    seller.emailId = seller.emailAddress
    sendNotification(req, null, seller._id, '54', seller, 'questionnaire', seller._id)
    //End Notification Work

    return res.send({ message: "Business Information has been added successfully." })
}

exports.login_with_phone = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let seller = await allModels.seller.findOne({
        "mobilePhone": req.body.mobilePhone,
    })
    if (!seller) {
        return res.status(403).send({ message: "Your Number is invalid, please check and try again." });
    }
    //after password bcrypt
    // @ts-ignore
    let password = await bcrypt.compare(
        req.body.password,
        // @ts-ignore
        seller.password
    );
    if (!password) {
        return res.status(403).send({ message: "Your password is incorrect, please try resetting your password." });
    }
    //res.send({ message: "Login Successfully" })
    let token = seller.sellerToken();
    // res.send({ message: "hi", data })
    return res.send({
        message: "Login Successful",
        token: token,
        data: { sellerId: seller._id }
    });
}

// exports.sellerImages = async (req, res, next) => {
//     try {
//         let seller = await allModels.seller.findById({
//             _id: req.userId
//         }).select(["_id", "bussinessCoverImage", "profileImage"])
//         console.log(seller)

//         if (!seller) {
//             return res.send("invalid id")
//         }

//         let uploadLocation = `/seller/images` + `/${seller['_id']}`

//         await upload.fileUpload(req, next, ['bussinessCoverImage'], uploadLocation);
//         seller['bussinessCoverImage'] = req.filPath[0];

//         await upload.fileUpload(req, next, ['profileImage'], uploadLocation);
//         seller['profileImage'] = req.filPath[0];

//         let data = await seller.save()
//         return res.send({ message: "bussiness profile image has been updated.", d: data })

//     }
//     catch (error) {
//         return res.status(403).send({ message: error.message });

//     }
// }

// exports.sellerAll = async (req, res, next) => {

//     try {
//         let seller = await allModels.seller.find({ "_id": req.userId })
//         if (!seller) { return res.status(409).send({ message: "Invalid User" }) }

//         return res.send({ d: seller })

//     }
//     catch (error) {

//         return res.status(403).send({ message: error.message });
//     }

// }
exports.editSellerProfile = async (req, res, next) => {

    try {
        let seller = await allModels.seller.findById({
            _id: req.userId
        })
        //console.log(req.userId)

        if (!seller) {
            return res.send("invalid id")
        }

        // let sellerAddress = {}
        let sellerAddress = (req.body.sellerAddress);
        let keys = Object.keys(seller['sellerAddress']);
        let reqKeys = Object.keys(sellerAddress);
        //  //console.log(keys.length);
        for (let index = 0; index < keys.length; index++) {
            const attributeName = keys[index];
            //console.log(attributeName)
            if (reqKeys.includes(attributeName)) {
                seller['sellerAddress'][attributeName] = sellerAddress[attributeName]
                let data = await seller.save()
                //console.log(seller)
                return res.send({ message: "seller has been updated.", d: seller })

            }
        }

        // let sellerDetails= JSON.parse(req.body.sellerDetails)
        //  keys = Object.keys(seller['sellerDetails']);
        //  reqKeys = Object.keys(sellerDetails);
        //  for (let index = 0; index < keys.length; index++) {
        //     const attributeName = keys[index];
        //     if (reqKeys.includes(attributeName)) {
        //         seller['sellerDetails'][attributeName] = sellerDetails[attributeName]
        //     }
        // }


        // sellerAddress = JSON.parse(req.body.sellerAddress) ? JSON.parse(req.body.sellerAddress) : seller.sellerAddress
        // seller.sellerAddress = sellerAddress
        // socialMedia = JSON.parse(req.body.socialMedia) ? JSON.parse(req.body.socialMedia) : seller.socialMedia
        // seller.socialMedia = socialMedia
        // seller.nameOfBussiness = req.body.nameOfBussiness ? req.body.nameOfBussiness : seller.nameOfBussiness

        let data = await seller.save()
        // console.log(seller)
        return res.send({ message: "seller has been updated.", d: seller })

    }
    catch (error) {
        return res.status(404).send({ message: error.message });
    }


}

// exports.changePassword = async (req, res) => {
//     const validationError = validationResult(req);
//     if (!validationError.isEmpty()) {
//         return res.status(403).send({ message: validationError.array() });
//     }

//     allModels.seller.findOne({ 'emailAddress': req.body.emailAddress })
//         .then(user => {
//             if (!user) {
//                 return res.status(403).send({ message: "Invalid email address" })
//             }
//             bcrypt.hash(req.body.password, 10)
//                 .then(async hashedpassword => {
//                     //console.log(user.password)
//                     user.password = hashedpassword;
//                     //console.log(hashedpassword)
//                     return await user.save()
//                 })
//                 .then(result => {
//                     if (!result) {
//                         return res.status(403).send({ message: 'Something went wrong' })
//                     }
//                     //console.log(result.password)
//                     return res.send({ message: "your password has been updated successfully" })
//                 })
//         })

// }
// exports.editBankDetails = async (req, res, next) => {
//     try {
//         let seller = await allModels.seller.findOne({ "_id": req.userId })

//         if (!seller) { return res.status(409).send({ message: "Invalid User" }) }

//         seller.bankDetails = req.body.bankDetails ? req.body.bankDetails : seller.productDetails;

//         return res.send({ message: "Bank Details updated successfully", seller })

//     } catch (error) { return res.status(403).send({ message: error.message }); }
// }


const generateTapCustomerId = async (details) => {

    let seller = await allModels.seller.findOne({ _id: details._id });
    if (seller) {
        const postData = {
            "first_name": seller.sellerDetails.sellerfName,
            "last_name": seller.sellerDetails.sellerlName,
            "email": seller.emailAddress,
            "phone": {
                "country_code": seller.countryCode.substring(0, 5),
                "number": seller.mobilePhone
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
                seller.tapCustomerId = response.id
                seller.save();
                //console.log(response);
            }).catch(function (err) {
                console.log(err);
            })
    }
}