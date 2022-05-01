let allModels = require("../../../../utilities/allModels");
const { validationResult } = require('express-validator');

exports.createWhatToPromote = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {
        let whatToPromote = new allModels.whatToPromoteModel({
            name: req.body.name,
            adminId: req.userId
        })
        let data = await whatToPromote.save()
        return res.send({ message: "promote", d: data })

    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }

}