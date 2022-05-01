const { validationResult } = require("express-validator");
const allModels = require("../../../../utilities/allModels");
let upload = require("./../../middlewares/AdminfileUpload");
let mongoose = require("mongoose");

exports.advertisePricingWithSearch = async (req, res) => {
    let { search } = req.body;

    let { limit, page } = req.body;

    if (!limit) { limit = 10 }
    if (!page) { page = 1 }

    let perPage = parseInt(limit)
    let pageNo = Math.max(0, parseInt(page))

    if (pageNo > 0) {
        pageNo = pageNo - 1;
    } else if (pageNo < 0) {
        pageNo = 0;
    }
    let filter = {};
    if (search) {
        const regexp = new RegExp(search, "i");
        filter["$or"] = [
            { "advertisingType": regexp }
        ];
        if (parseInt(search) != NaN) {
            filter["$or"].push({ "indexNo": parseInt(search) }),
                filter["$or"].push({ "oneDayPricing": parseInt(search) }),
                filter["$or"].push({ "threeDayPricing": parseInt(search) }),
                filter["$or"].push({ "oneWeekPricing": parseInt(search) })
        }

    }

    let advertisepricing = await allModels.advertisingPricing.aggregate([
        { $match: filter },
        {
            $facet: {
                paginatedResults: [
                    {
                        $skip: (perPage * pageNo),
                    },
                    {
                        $limit: perPage,
                    },
                ],
                totalCount: [
                    {
                        $count: "count",
                    },
                ],
            },
        },
    ])
    const advertisepricingList = advertisepricing.length ? advertisepricing[0].paginatedResults : [];
    let totalCount = 0
    try {
        totalCount = advertisepricing[0].totalCount[0].count
    } catch (err) { }
    return res.send({ totalCount: totalCount, count: advertisepricingList.length, d: advertisepricingList })

}

exports.addAdvertisePrice = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {
        let newAdCharges = new allModels.advertisingPricing({
            advertisingType: req.body.advertisingType,
            oneDayPricing: req.body.oneDayPricing,
            threeDayPricing: req.body.threeDayPricing,
            oneWeekPricing: req.body.oneWeekPricing,
            active: false
        })
        let data = await newAdCharges.save()
        return res.send({ message: "Ad Pricing has been added.", d: data });
    }
    catch (error) {
        return res.status(403).send({ message: error.message });

    }
}

exports.editAddCharges = async (req, res) => {

    try {
        if (!mongoose.Types.ObjectId.isValid(req.body.id)) {
            return res.send({ message: "Please enter valid id!" })
        }
        let addCharges = await allModels.advertisingPricing.findOne({ "_id": req.body.id })
        if (!addCharges) {
            return res.send({ message: "There was no Add charges found with given information!" })
        }
        const updateKeys = Object.keys(req.body);
        updateKeys.forEach((update) => (addCharges[update] = req.body[update]));

        await addCharges.save();
        return res.send({ message: "Ad Pricing has been updated.", addCharges });
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }
}

exports.deleteAdCharges = async (req, res) => {

    try {
        const adChargeId = req.params.id;
        let addCharges = await allModels.advertisingPricing.findOneAndRemove({
            _id: adChargeId,
        });
        if (!addCharges)
            return res.status(404).send({
                message: "There was no Add charges found with given information!",
            });
        return res.send({ message: "addCharges has been deleted", addCharges });

    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }

}

exports.adChargeStatus = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.body.id)) {
            return res.send({ message: "There was no Add charges found with given information!" })
        }
        let addCharges = await allModels.advertisingPricing.findOne({ "_id": req.body.id })
        if (!addCharges)
            return res.status(404).send({
                message: "There was no Add charges found with given information!",
            });
        addCharges.active = req.body.active
        addCharges.save()
        return res.send({ message: "Ad Pricing has been approved." });
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }


}

exports.singleAdCharge = async (req, res) => {
    try {
        let addCharges = await allModels.advertisingPricing.findById(req.params.id)

        return res.send({ data: addCharges })
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }

}


