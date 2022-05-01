let allModels = require("../../../../utilities/allModels")
const { validationResult } = require('express-validator')
let mongoose = require("mongoose")

exports.globalFilter = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
}


let newArrivalProducts = async () => {
    let newArrival = await allModels.productVariant.find({

    }).sort([['createdAt', '-1']])

        // .select(['_id'])
        .select(['-__v', '-updatedAt', '-createdAt', '-active', '-inventoryQuantity',
            '-inventoryReOrderLevel', '-inventoryReOrderQuantity'
            , '-productVariantImages.active', '-productVariantImages.photoOrder', '-tags',
            "-shipmentWidth", "-shipmentWeight", "-shipmentHeight", "-shipmentLength"])
        .populate([
            {
                path: 'brandId',
                select: ["-updatedAt", "-createdAt", "-active", "-__v", "-tags"]
            },
            {
                path: 'productId',
                select: ["-productCategories._id", "-productCategories.active", "-updatedAt", "-createdAt", "-active", "-__v", "-tags", "-adminApproval", "-activeWeb", "-activeSeller", "-brandId"],
                populate: [
                    {
                        path: 'productCategories.categoryId',
                        select: ["-active", "-__v", "-isParent", "-parentCategoryId"]
                    }
                ]
            },
            {
                path: 'sellerId',
                select: ["_id", "nameOfBussinessEnglish","nameOfBussinessArabic"]
            },
        ]).lean()
    //console.log(newArrival)

    if (newArrival.length == 0) {
        return res.send({ count: 0, d: newArrival });
    }

    let temp = [];
    await getRating(newArrival, temp);

    let RESPONSE_DATA = temp.filter(a => {
        return a['sellerId'] != null;
    });
    //console.log(RESPONSE_DATA)
    return { count: RESPONSE_DATA.length, data: RESPONSE_DATA }
}