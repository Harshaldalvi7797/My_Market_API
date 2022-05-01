let allModels = require('../../utilities/allModels');
const { validationResult } = require('express-validator');

exports.appClickViews = async (req, res) => {
    let reqData = req.body;
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    if (reqData.type === "Click") {
        try {
            let reqData = req.body;
            let checkVisitor = null;
            let checkClick = null;
            //if (!req.userId) {

            let pv = await allModels.productVariant.findOne({
                _id: req.body.productVariantId
            });

            if (!pv) {
                return res.status(403).send({ message: "There was no product found with given information!" });
            }

            checkClick = await allModels.visitorsModel.findOne({
                deviceIdentifier: reqData.deviceIdentifier,
                productVariantId: pv._id
            });

            if (!checkClick) {
                let lastIndex = await allModels.visitorsModel.findOne().sort([['indexNo', '-1']]);
                if (!lastIndex) { lastIndex = {}; lastIndex['indexNo'] = 1000 }

                let newVisitors = new allModels.visitorsModel({
                    deviceIdentifier: req.body.deviceIdentifier,
                    customerId: req.userId || null,
                    sellerId: pv.sellerId,
                    productVariantId: pv._id,
                    clickCount: 1,
                    indexNo: lastIndex.indexNo + 1
                })

                await newVisitors.save()
                return res.send({ message: "Click successfully" })
            }
            else {
                let findData = await checkClick['productVariantId'];

                if (findData != -1) {
                    checkClick.clickCount = parseInt(checkClick.clickCount) + 1
                }

                checkClick['customerId'] = req.userId || checkClick['customerId'] || null
                checkClick['deviceIdentifier'] = reqData.deviceIdentifier || checkClick['deviceIdentifier'] || null

                await checkClick.save();
                return res.send({ message: "Click successfully" })
            }
        }
        catch (error) {
            return res.status(403).send({ message: error.message });

        }



    }
    else if (reqData.type === "Views") {
        try {
            let reqData = req.body;
            let checkViews = null;
            //if (!req.userId) {

            let pv = await allModels.productVariant.findOne({
                _id: req.body.productVariantId
            });

            if (!pv) {
                return res.status(403).send({ message: "There was no product found with given information!" });
            }

            checkViews = await allModels.visitorsModel.findOne({
                deviceIdentifier: reqData.deviceIdentifier,
                productVariantId: pv._id
            });

            if (!checkViews) {
                let newVisitors = new allModels.visitorsModel({
                    deviceIdentifier: req.body.deviceIdentifier,
                    customerId: req.userId || null,
                    sellerId: pv.sellerId,
                    productVariantId: pv._id,
                    viewsCount: 1
                })

                await newVisitors.save()
                return res.send({ message: "views successfully" })
            }
            else {
                let findData = await checkViews['productVariantId'];

                if (findData != -1) {
                    checkViews.viewsCount = parseInt(checkViews.viewsCount) + 1
                }

                checkViews['customerId'] = req.userId || checkViews['customerId'] || null
                checkViews['deviceIdentifier'] = reqData.deviceIdentifier || checkViews['deviceIdentifier'] || null

                await checkViews.save();
                return res.send({ message: "views successfully" })
            }
        }
        catch (error) {
            return res.status(403).send({ message: error.message });

        }
    }
    else {
        return res.status(403).send({ message: "Please provide a valid data." });
    }



}