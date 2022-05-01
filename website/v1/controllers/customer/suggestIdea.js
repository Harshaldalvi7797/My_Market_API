let allModels = require('../../../../utilities/allModels');
const { validationResult } = require('express-validator');
let { sendNotification } = require("../../middlewares/sendNotification");
exports.suggestIdea = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    let reqData = req.body;
    let newSuggestIdea = new allModels.suggets({
        name: reqData.name,
        emailAddress: reqData.emailAddress,
        mobileNumber: reqData.mobileNumber.toString(),
        countryCode: reqData.countryCode.toString(),
        idea: reqData.idea,
    })
    let data = await newSuggestIdea.save()
    data.customername= data.name.toUpperCase()
    
    //Sending notification
    sendNotification(req, null, null, '53', data, 'sugestidea', data._id)

    return res.send({ message: "Suggestion send successfully!", d: data })
}