const allModels = require('../utilities/allModels')
const { validationResult } = require('express-validator');
let mailService = require('../middlewares/mailService');

const subscribeNewsletter = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let data = req.body;
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


        let mailBody = {
            'emailId': req.body.emailAddress,
            'subject': 'Newsletter Subscription',
            'message': 'Congratulations! You have been registered onto our newsletter.'
        }
        req.mailBody = mailBody;

        insertSubscribe.message = 'Congratulations! You have been registered onto our newsletter.';
        await mailService.sendMail(req, res);
        return res.status(201).send(insertSubscribe);


    } catch (e) {
        return res.status(400).send(e);
    }
}

module.exports = {
    subscribeNewsletter
}