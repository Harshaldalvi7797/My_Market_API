let allModels = require("../../../../utilities/allModels")

const { validationResult } = require('express-validator')

//search product by product name
exports.productSearch = async (req, res) => {

}

exports.fetchProduct_with_category = async (req, res) => {
    try {
        const validationError = validationResult(req)
        if (!validationError.isEmpty()) {
            return res.status(403).send({ message: validationError.array() });
        }
        const product = await allModels.product.find({
            "productCategories.categoryId": req.query.categoryId
        });
        return res.send({
            data: product
        })
    }
    catch (err) {
        // allModels.log.writeLog(req, err);
        return res.send(err)
        //console.log(err)
    }
}


