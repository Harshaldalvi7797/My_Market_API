const All_Models = require('../../../utilities/allModels')
const { validationResult } = require('express-validator');
const { trim } = require('lodash');

exports.Post_Policy = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(422).send({ message: validationError.array() });
    }
    try {
        const policy = new All_Models.detailsModel(req.body);
        //console.log(req.body)
        const policyInsert = await policy.save();
        return res.status(201).send(policyInsert)
    }
    catch (err) { return res.status(400).send(err) }
}

exports.getPolicy = async (req, res, next) => {
     const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(422).send({ message: validationError.array() });
    }
    
    try {
        const getPolicy = await All_Models.detailsModel.findOne({
            "details.name": trim(req.query.name),
        })
        return res.status(200).send(getPolicy);

    }
    catch (err) { return res.status(400).send(err) }
}

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