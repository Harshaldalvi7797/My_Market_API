

const allModels = require('../../../../utilities/allModels');
const { validationResult } = require('express-validator');
let mailService = require('../../middlewares/mailService');
let { sendNotification } = require("../../middlewares/sendNotification");

exports.notifyMe = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    try {
        let reqData = req.body;
        const notify = new allModels.notifyModel({
            customerId: req.userId,
            productVariantId: reqData.productVariantId,
            status: reqData.status,
        });

        let data = await notify.save();
        return res.send({ message: "We will notify you!", data: notify })

    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }
}