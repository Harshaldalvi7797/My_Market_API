const { validationResult } = require("express-validator");
const allModels = require("../../../../utilities/allModels");
let mongoose = require("mongoose");

exports.questionProductId = async (req, res) => {
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

    const filter = {};
    if (search) {
        const regexp = new RegExp(search, "i");
        filter["$or"] = [
            { "question": regexp },
            { "answer": regexp },
            { "pvs.productVariantDetails.productVariantName": regexp },
            { "customers.firstName": regexp },
            { "customers.lastName": regexp },
        ];
    }
    if (!mongoose.Types.ObjectId.isValid(req.body.productId)) {
        return res.send({ message: "There was no product found with given information!" })
    }
    let questions = await allModels.question.aggregate([

        {
            $lookup: {
                from: 'productvariants', localField: 'productVarientId',
                foreignField: '_id', as: 'pvs'
            }
        },
        {
            $lookup: {
                from: 'sellers', localField: 'pvs.sellerId',
                foreignField: '_id', as: 'seller'
            }
        },
        {
            $lookup: {
                from: 'customers', localField: 'customerId',
                foreignField: '_id', as: 'customers'
            }
        },
        // { $unwind: { path: "$pvs" } },
        // { $unwind: { path: "$customer" } },
        // { $unwind: { path: "$seller" } },
        { $match: { "pvs._id": mongoose.Types.ObjectId(req.body.productId) } },
        // {
        //     "$project": {
        //         "_id": 1,
        //         "productVarientId": 1,
        //         "question": 1,
        //         "reportFlag": 1,
        //         "reportComment": 1,
        //         "answer": 1,
        //         "customerId": 1,
        //         "pvs.sellerId": 1,
        //         "seller.sellerDetails": 1,
        //         "pvs.productVariantDetails.productVariantName": 1,
        //         "customers.firstName": 1,
        //         "customers.lastName": 1,
        //         "reportFlag": 1,
        //         "reportComment": 1,
        //         "likeCount": 1,
        //         "disLikeCount": 1
        //     }
        // },

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
    let questionList = questions.length ? questions[0].paginatedResults : [];
    let totalCount = 0
    try {
        totalCount = questions[0].totalCount[0].count
    } catch (err) { }
    return res.send({ totalCount: totalCount, count: questionList.length, d: questionList })

}
exports.allQuestions = async (req, res) => {
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

    const filter = {};
    if (search) {
        const regexp = new RegExp(search, "i");
        filter["$or"] = [
            { "question": regexp },
            { "answer": regexp },
            { "pvs.productVariantDetails.productVariantName": regexp },
            { "customers.firstName": regexp },
            { "customers.lastName": regexp },
        ];
    }
    let questions = await allModels.question.aggregate([
        {
            $lookup: {
                from: 'productvariants', localField: 'productVarientId',
                foreignField: '_id', as: 'pvs'
            }
        },
        {
            $lookup: {
                from: 'sellers', localField: 'pvs.sellerId',
                foreignField: '_id', as: 'seller'
            }
        },
        {
            $lookup: {
                from: 'customers', localField: 'customerId',
                foreignField: '_id', as: 'customers'
            }
        },
        {
            "$project": {
                "_id": 1,
                "productVarientId": 1,
                "question": 1,
                "active": 1,
                "reportFlag": 1,
                "reportComment": 1,
                "answer": 1,
                "customerId": 1,
                "pvs.sellerId": 1,
                "seller.sellerDetails": 1,
                "seller.nameOfBussinessEnglish": 1,
                "pvs.productVariantDetails.productVariantName": 1,
                "pvs._id": 1,
                "customers.firstName": 1,
                "customers.lastName": 1,
                "reportFlag": 1,
                "reportComment": 1
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
        },

    ])
    let questionList = questions.length ? questions[0].paginatedResults : [];
    let totalCount = 0
    try {
        totalCount = questions[0].totalCount[0].count
    } catch (err) { }
    return res.send({ totalCount: totalCount, count: questionList.length, d: questionList })
}
exports.adminUpdateAnswer = async (req, res, next) => {
    try {
        let question = await allModels.question.findById(req.params.id)
        // console.log(question)
        if (!question) {
            return res.status(404).send({ message: "Invalid question Id" });
        }
        question['answer'] = req.body.answer;

        await question.save()
        return res.send({ message: "Your answer has been submitted.", d: question })

    }
    catch (error) {
        next(error)

    }

}
exports.questionStatus = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.body.id)) {
            return res.send({ message: "There was no question found with given information!" })
        }
        let question = await allModels.question.findByIdAndUpdate(req.body.id);
        if (!question) {
            return res.status(403).send({ message: "There was no question found with given information!" });
        }
        question.active = req.body.active
        question.save()
        return res.send({ message: "Product question status has been updated" });
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }
}