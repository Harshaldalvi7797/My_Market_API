let allModels = require("../../utilities/allModels");
const { ObjectId } = require("mongoose").Types;
const { writeLog } = require("./../../utilities/log");
const { validationResult } = require('express-validator');


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


