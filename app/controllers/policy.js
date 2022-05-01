const All_Models = require('../utilities/allModels')
const { validationResult } = require('express-validator');

exports.Get_Policy = async (req, res, next) => {
    const validationError = validationResult(req)
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    // console.log(req.query.type);
    try {
        const getPolicy = await All_Models.detailsModel.find({
            type: req.query.type,
            active: true,
            isCustomer: true
        })

        return res.status(201).send(getPolicy);

    }
    catch (err) { return res.status(400).send({ message: err.message }) }
}