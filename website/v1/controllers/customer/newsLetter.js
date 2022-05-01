const allModels = require('../../../../utilities/allModels');
const { validationResult } = require('express-validator');
let mailService = require('../../middlewares/mailService');
let { sendNotification } = require("../../middlewares/sendNotification");

const subscribeNewsletter = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    let data = req.body;
    let check = await allModels.customerNewsLetter.findOne({ emailAddress: data.emailAddress });
    if (check) { return res.status(403).send({ message: "You are already registered to our newsletter " }); }
    
    try {
        const subscribe = new allModels.customerNewsLetter({
            customerId: req.userId || null,
            smsActive: data.smsActive,
            emailAddress: data.emailAddress,
            mobilePhone: data.mobilePhone,
            emailActive: data.emailActive,
            newsletterFrequency: data.newsletterFrequency,
            acceptTerms: data.acceptTerms
        })
        const insertSubscribe = await subscribe.save();

        insertSubscribe.message = 'Congratulations! You have been registered onto our newsletter.';

        //Sending notification
        sendNotification(req, null, null, '49', insertSubscribe, 'other',insertSubscribe._id)

        return res.status(201).send(insertSubscribe);
    } catch (e) {
        return res.status(400).send(e);
    }
}

const personalInfoGet = async (req, res) => {
    let user = await allModels.customer.findOne({ _id: req.userId })
        .select(['emailAddress', 'emailAddressVerified', 'firstName', 'lastName', 'mobilePhone', 'mobileCountryCode', 'mobilePhoneVerified', 'gender', 'referralCode', 'tapCustomerId']);
    return res.status(201).send(user);
}

module.exports = {
    subscribeNewsletter, personalInfoGet
}