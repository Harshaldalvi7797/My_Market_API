const path = require("path");
const all_models = require("../../../../utilities/allModels");
const remove_null_keys = require("../../../../utilities/remove_null_keys");


exports.Addcurrency = async (req, res) => {

    try {
        const {
            language, countryName, currencyName, currencyShort,
            from_currencyShort, from_value, to_currencyShort, to_value, decimal, active
        } = req.body;

        const { _id } = await all_models.currency.create({
            currencyDetails: {
                language, countryName, currencyName, currencyShort,
            },
            conversionRate: {
                from: {
                    currencyShort: from_currencyShort,
                    value: from_value
                },
                to: {
                    currencyShort: to_currencyShort,
                    value: to_value
                },
                decimal
            },
            active,
        });


        return res.status(201).json({
            _id,
            message: "Currency inserted successfully.",
        });

    } catch (error) { return res.status(403).send({ message: error.message }); }

};// End of insert_currency method


exports.fetchCurrency = async (req, res, next) => {
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
            { "currencyDetails.currencyShort": regexp },
            { "currencyDetails.currencyName": regexp },
            { "currencyDetails.countryName": regexp },
            { "conversionRate.from.currencyShort": regexp },
        ];
        if (!isNaN(parseInt(search))) {
            filter["$or"].push({ "indexNo": parseInt(search) })
        }
    }
    let currency = await all_models.currency.aggregate([

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
    const currencyList = currency.length ? currency[0].paginatedResults : [];

    let totalCount = 0
    try {
        totalCount = currency[0].totalCount[0].count
    } catch (err) { }
    return res.send({ totalCount: totalCount, count: currencyList.length, data: currencyList });

};// End of fetch_currency method

exports.singleCurrency = async (req, res) => {
    try {
        let currency = await all_models.currency.findById(req.params.id)
        if (!currency) {
            return res.status(404).send({
                message: "There was no currency  found with given information!",
            });
        }
        return res.send({ currency });
    } catch (error) {
        return res.status(500).send({
            message: "Internal server error :(",
            systemErrorMessage: error.message,
        });
    }
}
exports.update_currency = async (req, res, next) => {

    try {
        const {
            _id,
            language, countryName, currencyName, currencyShort,
            from_currencyShort, from_value, to_currencyShort, to_value, decimal, active
        } = req.body;

        const data = remove_null_keys({
            "currencyDetails.language": language,
            "currencyDetails.countryName": countryName,
            "currencyDetails.currencyName": currencyName,
            "currencyDetails.currencyShort": currencyShort,

            "conversionRate.from.currencyShort": from_currencyShort,
            "conversionRate.from.value": from_value,
            "conversionRate.to.currencyShort": to_currencyShort,
            "conversionRate.to.value": to_value,
            "conversionRate.decimal": decimal,
            active,
        });

        const { nModified } = await all_models.currency.updateOne(
            { _id },
            { $set: data }
        );

        return res.json({
            message: nModified ? "Updated successfully" : "Already updated."
        });

    } catch (error) { return res.status(403).send({ message: error.message }); }

};// End of update_currency method



exports.delete_currency = async (req, res, next) => {

    try {
        const { id } = req.params;
        let currency = await all_models.currency.findOneAndRemove({ "_id": id })
        // console.log(currency)
        return res.send({ message: "Currency has been deleted" })

        // let { n: isDeleted } = await all_models.currency.deleteOne({ id });
        // console.log(n)

        // return res.status(isDeleted ? 200 : 404).json({
        //     message: isDeleted ? "Currency has been removed successfully" : "Resource not found."
        // });

    } catch (error) { return res.status(403).send({ message: error.message }); }

};// End of delete_currency method
