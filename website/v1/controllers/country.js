const allModels = require("../../../utilities/allModels");

exports.getCountries = async (req, res) => {
    try {
        let countries = await allModels.country.find().sort([["countryName", 1]]);
        return res.send({ data: countries });
    }
    catch (err) {
        return res.status(400).send(err);
    }
}

exports.addCountry = async (req, res) => {
    try {
        let reqData = req.body;
        const newCountry = new allModels.country({
            countryName: reqData.countryName,
            countryShort: reqData.countryShort,
            currencyName: reqData.currencyName,
            currencyShort: reqData.currencyShort,
        });

        let new_country = await newCountry.save();
        return res.send({ message: "Country added", data: new_country });
    }
    catch (err) {
        return res.status(400).send(err);
    }
}
