let allModels = require("../../../../utilities/allModels")
const { validationResult } = require('express-validator');
const mongoose = require("mongoose");
let { sendNotification } = require("../../middlewares/sendNotification");

exports.productAllReview = async (req, res) => {
    try {
        const { search, rating } = req.body;
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
        let ratingFilter = {};

        if (search) {
            const regexp = new RegExp(search, "i");

            filter["$or"] = [
                { "pvs.productVariantDetails.productVariantName": regexp },
                { "description": regexp },
                { "rating": regexp },
                { "customers.fullName": regexp },
            ];
        }
        if (rating) {
            ratingFilter = { rating: parseFloat(rating) };
        }

        let review = await allModels.productVarientReview.aggregate([
            { $match: ratingFilter },
            {
                $lookup: {
                    from: 'productvariants', localField: 'productVariantId',
                    foreignField: '_id', as: 'pvs'
                }
            },
            {
                $lookup: {
                    from: 'customers', localField: 'customerId',
                    foreignField: '_id', as: 'customers'
                }
            },
            { $unwind: "$customers" },
            {
                "$project": {
                    "_id": 1,
                    "productVarientId": 1,
                    "productImages": 1,
                    "active": 1,
                    "description": 1,
                    "rating": 1,
                    "customerId": 1,
                    "pvs.sellerId": 1,
                    "pvs.productVariantDetails.productVariantName": 1,
                    "customers.firstName": 1,
                    "customers.lastName": 1,
                    "customers.fullName": { $concat: ["$customers.firstName", " ", "$customers.lastName"] },
                    "reportFlag": 1,
                    "reportComment": 1
                }
            },
            { $match: { "pvs.sellerId": mongoose.Types.ObjectId(req.userId) } },
            { $match: filter },
            { $sort: { _id: -1 } },
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
            }
        ])

        let reviewList = review.length ? review[0].paginatedResults : [];
        let totalCount = 0
        try {
            totalCount = review[0].totalCount[0].count
        } catch (err) { }
        return res.send({ totalCount: totalCount, count: reviewList.length, d: reviewList })
    }
    catch (error) {
        return res.status(403).send({ message: error.message })
    }

}
exports.productReview = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {
        const { search, rating } = req.body;
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
        const filter = {};
        if (search) {
            const regexp = new RegExp(search, "i");
            filter["$or"] = [

                { "pvs.productVariantDetails.productVariantName": regexp },
                { "description": regexp },
                { "customers.fullName": regexp },
            ];
        }
        if (rating && parseFloat(rating.toString()).toString().toLowerCase() != 'nan') {
            filter["$and"] = [];
        }
        if (rating && parseFloat(rating.toString()).toString().toLowerCase() != 'nan') {
            filter["$and"].push({ "rating": { $in: [parseFloat(rating.toString())] } });
        }
        // console.log("filter", filter)
        let productReview = await allModels.productVarientReview.aggregate([
            {
                $lookup: {
                    from: 'productvariants', localField: 'productVariantId',
                    foreignField: '_id', as: 'pvs'
                }
            },
            //{ $match: { "pvs.sellerId": mongoose.Types.ObjectId(req.userId) } },
            { $match: { "pvs._id": mongoose.Types.ObjectId(req.body.productId) } },
            {
                $lookup: {
                    from: 'customers', localField: 'customerId',
                    foreignField: '_id', as: 'customers'
                }
            },
            { $unwind: "$customers" },
            {
                $project: {
                    _id: 1,
                    productVarientId: 1,
                    productImages: 1,
                    active: 1,
                    description: 1,
                    rating: 1,
                    customerId: 1,
                    "pvs._id": 1,
                    "pvs.sellerId": 1,
                    "pvs.productVariantDetails.productVariantName": 1,
                    "customers.firstName": 1,
                    "customers.lastName": 1,
                    "customers.fullName": { $concat: ["$customers.firstName", " ", "$customers.lastName"] },
                    reportFlag: 1,
                    reportComment: 1
                }
            },
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
            }
        ])

        let productReviewList = productReview.length ? productReview[0].paginatedResults : [];
        let totalCount = 0
        try {
            totalCount = productReview[0].totalCount[0].count
        } catch (err) { }
        return res.send({ totalCount: totalCount, count: productReviewList.length, d: productReviewList })

    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }



}

exports.reportReview = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    try {
        let reportReview = await allModels.productVarientReview.findOne({ "_id": req.body.reviewId })

        if (!reportReview) {
            return res.send({ message: "There was no review  found with given information!" })
        }
        if (reportReview.reportFlag == true) {
            return res.send({ message: "You already reported this review." })
        }

        reportReview.reportFlag = req.body.reportFlag;
        reportReview['reportComment'] = req.body.reportComment;
        let data = await reportReview.save()

        //Sending Notification
        let adminId = "61c961934280680ee8782e76"
        data.sellername = req.seller.nameOfBussinessEnglish
        await sendNotification(req, req.userId, adminId, '46', data, 'report review', data._id)

        return res.send({ message: "Your report has been submitted.", data: data })
    }
    catch (error) {
        return res.status(500).send({ message: error });
    }

}

