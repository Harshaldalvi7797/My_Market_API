let allModels = require("../../../../utilities/allModels");
const { trim } = require('lodash');
const { validationResult } = require('express-validator');
let mongoose = require("mongoose");
let { getRating } = require("../../../../common/productVariantReview")
const { ObjectId } = require("mongodb");
const { commonInclustion, filter } = require("../../../../utilities/filter_util");


exports.advertiseClicks = async (req, res) => {

    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    try {
        let reqData = req.body;
        let checkAdvertiseClick = null;
  

        let ad = await allModels.advertisementCampaign.findOne({
            _id: reqData.advertiseId
        });

        if (!ad) {
            return res.status(403).send({ message: "There was no advertise found with given information!" });
        }

        checkAdvertiseClick = await allModels.advertiseanalyticsModel.findOne({
            deviceIdentifier: reqData.deviceIdentifier,
            advertiseId: ad._id
        });

        // if (!checkAdvertiseClick) {
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
    catch (error) {
        return res.status(403).send({ message: error.message });
    }


}

