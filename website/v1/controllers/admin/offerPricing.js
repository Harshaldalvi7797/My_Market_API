// core modules
const path = require("path");
const mongoose = require("mongoose");
var XLSX = require('xlsx');
const { validationResult } = require('express-validator');
const all_models = require("../../../../utilities/allModels");

exports.offerDeactivateCheckAdmin = async (req, res) => {
    // endDate > today
    const today = new Date();
    // today.setHours(0);
    // today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);

    let datetime = convertDateTime(today);
    let adFilter = {
        '$and': [

            { "endDateTime1": { $gte: datetime } },
            { "adminApproval": true },
            { "active": true },

        ]
    }
    let advertiseoffer = await all_models.advertisementCampaign.aggregate([
        { $match: { "whatToPromote.id": mongoose.Types.ObjectId(req.body.offerId) } },
        { $match: adFilter }
    ])

    let RESPONSE = { advertiseoffer: advertiseoffer }
    return res.send({ data: RESPONSE })

}

exports.offersWithSearch = async (req, res) => {
    const { search } = req.body;
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
    let sellerFilter = {}
    if (search) {
        const regexp = new RegExp(search, "i");
        filter["$or"] = [
            { "offerName": regexp },
            { "indexNo": parseInt(search) }
        ];

        sellerFilter["$or"] = [
            { "offerName": regexp },
            { "indexNo": parseInt(search) },
            { "seller.nameOfBussinessEnglish": regexp }
        ]
    }
    //console.log(sellerFilter);

    let offers = await all_models.offerPricing.aggregate([
        // { $match: filter },
        {
            $lookup: {
                from: 'sellers', localField: 'sellerId',
                foreignField: '_id', as: 'seller'
            }
        },
        {
            $unwind: {
                "path": "$seller",
                "preserveNullAndEmptyArrays": true
            }
        },

        { $match: sellerFilter },
        {
            $project:
            {
                "_id": 1,
                "offerName": 1,
                "active": 1,
                "sellerId": 1,
                "adminId": 1,
                "startDateTime": 1,
                "endDateTime": 1,
                "createdAt": 1,
                "updatedAt": 1,
                "createdDate": 1,
                "updatedDate": 1,
                "startDate": 1,
                "endDate": 1,
                "indexNo": 1,
                "seller.sellerDetails": 1,
                "seller.nameOfBussinessEnglish": 1,
            }
        },
        { $sort: { "indexNo": -1 } },
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

    const offerList = offers.length ? offers[0].paginatedResults : [];
    let totalCount = 0;
    try {
        totalCount = offers[0].totalCount[0].count
    } catch (error) {
        totalCount = 0
    }
    return res.send({ totalCount: totalCount, count: offerList.length, data: offerList });

    //return res.send({ d: offers })


}

exports.adminAddOfferprice = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    // console.log("Startdate=> " + new Date(req.body.startDateTime), new Date(req.body.startDateTime).toISOString());
    // console.log("Enddate=> " + new Date(req.body.endDateTime), new Date(req.body.endDateTime).toISOString());

    let offerPrice = new all_models.offerPricing({
        sellerId: req.body.sellerId,
        adminId: req.userId,
        offerName: req.body.offerName,
        startDateTime: new Date(req.body.startDateTime),
        endDateTime: new Date(req.body.endDateTime),
        active: req.body.active
    })
    let data = await offerPrice.save()
    return res.send({ message: "Offer has been added.", d: data });
}

exports.adminUpdateStatus = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {
        let offerprice = await all_models.offerPricing.findByIdAndUpdate(req.params.id);
        if (!offerprice) {
            return res.status(403).send({ message: "There was no offer found with given information!" });
        }
        offerprice.active = req.body.active
        offerprice.save()
        return res.send({ message: "Offer status has been updated" });
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }
}

exports.adminMultiStatusUpdateOffer = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    let offer = [];
    let filter = {};
    let sellerFilter = {}

    if (req.body.search) {
        let search = req.body.search;
        const regexp = new RegExp(search, "i");
        filter["$or"] = [
            { "offerName": regexp },
            { "indexNo": parseInt(search) }
        ];

        sellerFilter["$or"] = [
            { "offerName": regexp },
            { "indexNo": parseInt(search) },
            { "seller.sellerDetails.sellerfName": regexp },
            { "seller.sellerDetails.sellerlName": regexp }
        ]
    }
    //console.log(sellerFilter);

    if (req.body.isBulk && req.body.search) {
        offer = await all_models.offerPricing.aggregate([
            // { $match: filter },
            {
                $lookup: {
                    from: 'sellers', localField: 'sellerId',
                    foreignField: '_id', as: 'seller'
                }
            },
            { $unwind: "$seller" },

            { $match: sellerFilter },
            {
                $project:
                {
                    "_id": 1,
                    "offerName": 1,
                    "active": 1,
                    "sellerId": 1,
                    "startDateTime": 1,
                    "endDateTime": 1,
                    "createdAt": 1,
                    "updatedAt": 1,
                    "createdDate": 1,
                    "updatedDate": 1,
                    "startDate": 1,
                    "endDate": 1,
                    "indexNo": 1,
                    "seller.sellerDetails": 1,
                }
            }
        ])
    } else if (req.body.isBulk && !req.body.search) {
        offer = await all_models.offerPricing.find({})
    } else if (!req.body.isBulk) {
        if (!req.body.offerPricingId) {
            return res.status(403).send({ message: "Please enter offerPricingId" });
        }
        offer = await all_models.offerPricing.find({ "_id": req.body.offerPricingId })
            .select(["_id"])
    }

    for (let index = 0; index < offer.length; index++) {
        const element = offer[index];
        let update = { active: req.body.active }
        await all_models.offerPricing.updateMany({ "_id": element._id }, { $set: update })
    }
    return res.send({ message: "Status has been updated" });
}

exports.singleOfferView = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.send({ message: "There was no offer found with given information!" })
        }
        let offer = await all_models.offerPricing.findById(req.params.id)
            .populate({
                path: 'sellerId',
                select: ["_id", "sellerDetails", "nameOfBussinessEnglish"]
            })

        if (!offer) {
            return res.status(404).send({
                message: "There was no offer found with given information!",
            });
        }
        return res.send({ offer });
    } catch (error) {
        return res.status(403).send({ message: error.message });

    }
}

const convertDateTime = (createdAt) => {
    let date = createdAt;
    let year = date.getFullYear();
    let mnth = ("0" + (date.getMonth() + 1)).slice(-2);
    let day = ("0" + date.getDate()).slice(-2);
    return Number(`${year}${mnth}${day}`)
}

exports.adminUpdateOfferPrice = async (req, res) => {
    try {
        const offerPriceId = req.params.id;
        let offerprice = await all_models.offerPricing.findOne({ _id: offerPriceId });
        if (!offerprice)
            return res.status(404).send({
                message: "There was no offerprice found with given information!",
            });

        let today = new Date();
        let d1 = convertDateTime(today)
        // console.log("d1",d1)

        // console.log("offerprice.startDate", offerprice.startDate)
        if (d1 == offerprice.startDate) {
            return res.send({ message: "Offer Already Start!" })

        }
        let bodyData = req.body;

        if (bodyData.startDateTime) {
            bodyData.startDateTime = new Date(bodyData.startDateTime)
        }
        if (bodyData.endDateTime) {
            bodyData.endDateTime = new Date(bodyData.endDateTime)
        }
        const updateKeys = Object.keys(bodyData);
        updateKeys.forEach((update) => (offerprice[update] = bodyData[update]));
        await offerprice.save();
        return res.send({ message: "Offer has been updated.", offerprice });
    } catch (error) {
        return res.status(500).send(error.message)
    }
}