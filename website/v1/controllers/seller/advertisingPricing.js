let allModels = require("../../../../utilities/allModels")
const { validationResult } = require('express-validator');
let mongoose = require("mongoose");


exports.addAdvertisePricing = async (req, res, next) => {

    try {
        let newAdvertisePricing = new allModels.advertisingPricing({
            advertisingType: req.body.advertisingType,
            oneDayPricing: req.body.oneDayPricing,
            threeDayPricing: req.body.threeDayPricing,
            oneWeekPricing: req.body.oneWeekPricing

        })
        /**----------------------------------------- */
        let data = await newAdvertisePricing.save()
        return res.send({ message: "advertise pricing   add successfully", d: data });

    }
    catch (error) {
        //console.log(error)
        return res.status(404).send({ message: error.message });
    }


}

exports.getAllAdvertisePricing = async (req, res) => {

    try {
        let advertisePricing = await allModels.advertisingPricing
            .find({ active: true })
            .limit(parseInt(req.query.limit))
            .skip(parseInt(req.query.skip))
            .lean();
        let totalCount = await allModels.advertisingPricing.count();
        return res.send({ count: advertisePricing.length, totalCount, advertisePricing });
    } catch (error) {
        return res.status(403).send({
            message: error.message,
        });
    }

}