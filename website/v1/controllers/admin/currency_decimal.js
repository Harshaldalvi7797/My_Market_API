const path = require("path");
const all_models = require("../../../../utilities/allModels");
const remove_null_keys = require("../../../../utilities/remove_null_keys");


exports.insert_currency_decimal = async (req, res, next) => {

    try {
        const {
            currencyName, currencyShort, currencyDecimal, active
        } = req.body;

        const { _id } = await all_models.currencyDecimal.create({
            currencyShort, currencyName, currencyDecimal, active,
        });


        return res.status(201).json({
            _id,
            message: "Inserted successfully.",
        });

    } catch (error) { return res.status(403).send({ message: error.message }); }

};// End of insert_currency_decimal method


exports.fetch_currency_decimal = async (req, res, next) => {

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
            { "indexNo": regexp },
        ];
    }
    let currencyDecimal = await all_models.currencyDecimal.aggregate([

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
    const currencyDecimalList = currencyDecimal.length ? currencyDecimal[0].paginatedResults : [];

    let totalCount = 0
    try {
        totalCount = currencyDecimal[0].totalCount[0].count
    } catch (err) { }
    return res.send({ totalCount: totalCount, count: currencyDecimalList.length, data: currencyDecimalList });

};// End of fetch_currency_decimal method
exports.singleDeciamlCurrency = async (req, res) => {
    try {
        let currencyDecimal = await all_models.currencyDecimal.findById(req.params.id)
        if (!currencyDecimal) {
            return res.status(404).send({
                message: "There was no currency decimal found with given information!",
            });
        }
        return res.send({ currencyDecimal });
    } catch (error) {
        return res.status(500).send({
            message: "Internal server error :(",
            systemErrorMessage: error.message,
        });
    }
}

exports.update_currency_decimal = async (req, res, next) => {

    const {
        _id, currencyName, currencyShort, currencyDecimal, active
    } = req.body;

    try {

        const data = remove_null_keys({
            currencyName, currencyShort, currencyDecimal, active
        });

        const { nModified } = await all_models.currencyDecimal.updateOne(
            { _id },
            { $set: data }
        );

        return res.json({
            message: nModified ? "Updated successfully" : "Already updated."
        });

    } catch (error) { return res.status(403).send({ message: error.message }); }

};// End of update_currency_decimal method



exports.delete_currency_decimal = async (req, res, next) => {

    try {
        const { id } = req.params;

        const { n: isDeleted } = await all_models.currencyDecimal.deleteOne({ id });

        return res.status(isDeleted ? 200 : 404).json({
            message: isDeleted ? "Currency decimal has been removed successfully" : "Resource not found."
        });

    } catch (error) { return res.status(403).send({ message: error.message }); }

};// End of delete_currency_decimal method
