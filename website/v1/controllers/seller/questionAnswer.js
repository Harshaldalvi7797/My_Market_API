let allModels = require("../../../../utilities/allModels")
const { validationResult } = require('express-validator');
const mongoose = require("mongoose");
let { sendNotification } = require("../../middlewares/sendNotification");
exports.questionAnswerSeller = async (req, res) => {

    questions = await allModels.question.find({
        productVarientId: req.query.id,
    }).populate({
        path: "productVarientId",
        select: ["productVariantDetails.productVariantName"]
    })
        .select(['-__v', '-createdAt', '-updatedAt']);
    //console.log(id);

    return res.send({ count: questions.length, data: questions })
}

exports.allQuestionsProduct = async (req, res) => {
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
            { "customers.fullName": regexp }
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
                from: 'customers', localField: 'customerId',
                foreignField: '_id', as: 'customers'
            }
        },
        { $unwind: "$customers" },
        {
            $project: {
                _id: 1,
                productVarientId: 1,
                question: 1,
                answer: 1,
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
        { $match: { "pvs._id": mongoose.Types.ObjectId(req.body.productId) } },
        // { $match: { "pvs.sellerId": mongoose.Types.ObjectId(req.userId) } },
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


exports.updateAnswer = async (req, res) => {
    try {
        let question = await allModels.question.findById({ _id: req.body.questionId, sellerId: req.userId })
            .populate([
                {
                    path: "productVarientId", select: ['productVariantDetails'],
                    populate: {
                        path: "sellerId", select: ['nameOfBussinessEnglish', 'sellerDetails']
                    }
                },
                { path: "customerId", select: ['firstName', 'lastName'] }
            ]);

        if (!question) {
            return res.status(404).send({ message: "Invalid question Id" });
        }
        question['answer'] = req.body.answer;

        await question.save()
        res.send({ message: "Your answer has been submitted.", d: question })

        //Sending Notification
        question.customername = question.customerId.firstName
        question.sellername = question.productVarientId.sellerId.nameOfBussinessEnglish
        question.productname = question.productVarientId.productVariantDetails[0].productVariantName
        return sendNotification(req, req.userId, question.customerId._id, '17', question, 'question', question.productVarientId)
        //End Sending Notification
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }

}

exports.sellerQuestions = async (req, res) => {
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
            { "customers.fullName": regexp },
        ];
    }
    let questions = await allModels.question.aggregate([
        { $sort: { "indexNo": - 1 } },
        {
            $lookup: {
                from: 'productvariants', localField: 'productVarientId',
                foreignField: '_id', as: 'pvs'
            }
        },
        { $match: { "pvs.sellerId": mongoose.Types.ObjectId(req.userId) } },
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
                "question": 1,
                "answer": 1,
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

exports.reportQuestion = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    try {
        let reportQuestion = await allModels.question.findOne({ "_id": req.body.questionId })
        // console.log(reportReview)
        if (!reportQuestion) {
            return res.send({ message: "There was no question  found with given information!" })
        }
        if (reportQuestion.reportFlag == true) {
            return res.send({ message: "You already reported this question." })
        }

        reportQuestion.reportFlag = req.body.reportFlag;
        reportQuestion['reportComment'] = req.body.reportComment;
        let data = await reportQuestion.save()

        return res.send({ message: "Your report has been submitted.", data: data })
    }
    catch (error) {
        return res.status(500).send({ message: error });
    }

}


