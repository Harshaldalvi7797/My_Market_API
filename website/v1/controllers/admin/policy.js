const all_models = require("../../../../utilities/allModels");
const { validationResult } = require('express-validator')


exports.insertDetail = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    try {
        const { details, detailFor, type, active } = req.body;

        let isCustomer, isSeller = false;

        if (detailFor && detailFor.toLowerCase() == "customer") {
            isCustomer = true;
        } else if (detailFor && detailFor.toLowerCase() == "seller") {
            isSeller = true;
        }

        let fetchDetails = await all_models.detailsModel.findOne({
            type: type, isSeller: isSeller, isCustomer: isCustomer
        })

        if (fetchDetails) {
            return res.status(403).send({ message: `${type} already added` });
        }

        let insertData = {
            details: details,
            type: type,
            isCustomer: isCustomer,
            isSeller: isSeller,
            active: active
        };



        if (!req.body.id) {
            let details = new all_models.detailsModel(insertData)
            let data = await details.save()

            return res.json({
                data: data,
                message: "Policy has been inserted successfully.",
            });
        }

    } catch (error) { return res.status(403).send({ message: error.message }); }

};// End of insert_policy method

exports.getAllEnum = async (req, res) => {

    let details = ['Terms & Conditions', 'Privacy Policy', 'Return Policy', 'About Us', 'Delivery Terms']
    return res.send({ count: details.length, d: details })

}


exports.fetchSingleDetail = async (req, res) => {
    try {
        let details = await all_models.detailsModel.findOne({
            type: req.body.type,
            isCustomer: req.body.isCustomer,
            isSeller: req.body.isSeller,
        })

        return res.send({ data: details });
    } catch (error) {
        return res.status(403).send({
            message: error.message,
        });
    }
}

exports.updateDetails = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    const { id, details, detailFor, type, active } = req.body;
    //console.log(id);
    try {
        let filter = {
            _id: id,
            isCustomer: false,
            isSeller: false
        };

        if (detailFor && detailFor.toLowerCase() == "customer") {
            filter['isCustomer'] = true;
        } else if (detailFor && detailFor.toLowerCase() == "seller") {
            filter['isSeller'] = true;
        }

        let singleDetail = await all_models.detailsModel.findOne(filter);
        if (!singleDetail) {
            return res.status(403).send({ message: "invalid detail selected" });
        }

        singleDetail.details = details || singleDetail.details;
        singleDetail.type = type;
        singleDetail.isCustomer = filter.isCustomer;
        singleDetail.isSeller = filter.isSeller;
        singleDetail.active = active;

        //console.log(singleDetail.active)

        let data = await singleDetail.save();
        return res.send({ data: data, message: "Details updated successfully" });

    } catch (error) { return res.status(403).send({ message: error.message }); }

};// End of update_policy method// End of update_policy method
