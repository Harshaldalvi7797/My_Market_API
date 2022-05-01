let allModels = require("../../../utilities/allModels");
const { validationResult } = require('express-validator');
const mongoose = require("mongoose")


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