let allModels = require('../../utilities/allModels');
const { validationResult } = require('express-validator');

exports.suggestIdea = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    
    try {
        let reqData = req.body;
        let newSuggestIdea = new allModels.suggets({
            name: reqData.name,
            emailAddress: reqData.emailAddress,
            mobileNumber: reqData.mobileNumber.toString(),
            countryCode: reqData.countryCode.toString(),
            idea: reqData.idea,
        })
        let data = await newSuggestIdea.save()
        //console.log(data)
        return res.send({ message: "Suggestion send successfully! We have received your suggestion.", d: data })
    } catch (error) {
        return res.status(403).send({ message: error.message })
    }

}