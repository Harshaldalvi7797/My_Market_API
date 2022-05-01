const allModels = require("../../../utilities/allModels");

exports.getLanguages = async (req, res) => {
    try {
        let languages = await allModels.language.find({
            active:true
        });
        return res.send({ data: languages });
    }
    catch (err) {
        return res.status(400).send(err);
    }
}

exports.addLanguage = async (req, res) => {
    try {
        let reqData = req.body;
        const newLanguage = new allModels.language({
            language: reqData.language,
            languageShort: reqData.languageShort,
            direction: reqData.direction,
        });
        let new_language = await newLanguage.save();
        return res.send({ message: "Language added", data: new_language });
    }
    catch (err) {
        return res.status(400).send(err);
    }
}
