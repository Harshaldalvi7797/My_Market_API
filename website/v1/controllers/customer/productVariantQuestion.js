let allModels = require("../../../../utilities/allModels");
const { validationResult } = require('express-validator');
let { sendNotification } = require("../../middlewares/sendNotification");

exports.addQueston = async (req, res) => {

    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    let reqData = req.body;
    let productVariant = await allModels.productVariant.findById(reqData.productVariantId);
    if (!productVariant) { return res.status(403).send({ message: "Invalid product variant id selected" }); }
    let newQuestion = new allModels.question({
        productVarientId: productVariant._id,
        customerId: req.userId,
        question: reqData.question,
        answer: ""
    })
    let data = await newQuestion.save()
        
    //Sending Notification
    data.customername= req.customer.firstName.toUpperCase()
    data.productname= productVariant.productVariantDetails[0].productVariantName
    await sendNotification(req, req.userId, productVariant.sellerId, '32', data, 'question', data._id)
    //End Sending Notification

    return res.send({ message: "success", d: data })
}
exports.allQuestions = async (req, res) => {
    try {
        let productVariant = await allModels.productVariant.findById(req.params.productVariantId);
        if (!productVariant) { return res.status(403).send({ message: "Invalid product variant id selected" }); }
        let data = await allModels.question.find({
            productVarientId: req.params.productVariantId
        })
            .select(['-__v', '-createdAt', '-updatedAt']);
        return res.send({ count: data.length, data: data });
    }
    catch (error) {
        return res.send({ message: error.message });
    }
}

exports.likeDislikeQuestion = async (req, res) => {
    let like = await allModels.question.findById({
        _id: req.params.id
    })
    if (!like) {
        return res.status(404).send({ message: "Invalid Id" });
    }
    let a = await like['likedislike'].findIndex(x => x.customerId.toString() === req.userId.toString());
    //console.log('=> ', a);
    if (a == -1) {
        like['likedislike'].push({ customerId: req.userId, isLike: req.body.isLike });
    } else {
        //console.log(req.body.isLike)
        like['likedislike'][a].isLike = req.body.isLike;
    }
    //Array Update end
    let data = await like.save()
    return res.send({ message: "like updated successfully..", data: data })
}

exports.searchQuestion = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    if (req.body.search.length > 2) {
        var search = req.body.search;
        allModels.question.find({
            $or: [
                { "question": new RegExp(search, "i") },
                { "answer": new RegExp(search, "i") }
            ]
        }, async (err, data) => {
            if (err) { return res.status(403).send({ error: err }); }
            var RESPONSE_DATA = [];

            if (data.length == 0) {
                return res.send({ count: data.length, d: RESPONSE_DATA });
            }
            return res.send({ count: data.length, d: data });

        }).select(["-__v", "-createdAt", "-updatedAt"])
    } else {
        return res.send({ message: "Search string must be greater the 2 characters" });
    }
}