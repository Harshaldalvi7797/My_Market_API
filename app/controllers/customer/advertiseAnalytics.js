let allModels = require("../../../utilities/allModels");
const { trim } = require('lodash');
const { validationResult } = require('express-validator');
let mongoose = require("mongoose");
let { getRating } = require('../../../common/productVariantReview');


exports.advertiseClicks = async (req, res) => {

    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    try {
        let reqData = req.body;
        let checkAdvertiseClick = null;
        //if (!req.userId) {

        let ad = await allModels.advertisementCampaign.findOne({
            _id: req.body.advertiseId
        });

        if (!ad) {
            return res.status(403).send({ message: "There was no advertise found with given information!" });
        }

        checkAdvertiseClick = await allModels.advertiseanalyticsModel.findOne({
            deviceIdentifier: reqData.deviceIdentifier,
            advertiseId: ad._id
        });

        if (!checkAdvertiseClick) {
            let newadvertiseanalytics = new allModels.advertiseanalyticsModel({
                deviceIdentifier: req.body.deviceIdentifier,
                customerId: req.userId || null,
                sellerId: ad.sellerId,
                advertiseId: ad._id,
                clickCount: 1
            })

            let data = await newadvertiseanalytics.save()
            return res.send({ message: "advertise click successfully", data: data })
        }
        else {
            let findData = await checkAdvertiseClick['advertiseId'];

            if (findData != -1) {
                checkAdvertiseClick.clickCount = parseInt(checkAdvertiseClick.clickCount) + 1
            }

            checkAdvertiseClick['customerId'] = req.userId || checkAdvertiseClick['customerId'] || null
            checkAdvertiseClick['deviceIdentifier'] = reqData.deviceIdentifier || advertcheckAdvertiseClickiseanalytics['deviceIdentifier'] || null

            let data = await checkAdvertiseClick.save();
            return res.send({ message: "advertise click successfully", data: data })
        }
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }


}
