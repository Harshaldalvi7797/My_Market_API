let allModels = require("../../../../utilities/allModels");
const { validationResult } = require('express-validator');

exports.addfaq = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    try {
        let newFaq = new allModels.faqModel({
            questionEnglish: req.body.question,
            questionArabic: req.body.answer,
            answerEnglish: req.body.answerEnglish,
            answerArabic: req.body.answerArabic,
            orderNo: req.body.orderNo,
            active: true
        })
        let data = await newFaq.save()
        return res.send({ message: "newFaq", d: data })
    }
    catch (error) {
        return res.status(400).send({ message: err.message })
    }
}


exports.getFaqs = async (req, res) => {
    let { search } = req.query;
    let filter = {}
    if (search) {
        let regexSearch = new RegExp(search, "i");
        filter['$or'] = [
            { questionEnglish: regexSearch },
            { questionArabic: regexSearch },
            { answerEnglish: regexSearch },
            { answerArabic: regexSearch },
        ]
    }
    try {
        let faqs = await allModels.faqModel.find(filter)
        return res.send({ count: faqs.length, d: faqs })
    }
    catch (error) {
        return error
    }



}