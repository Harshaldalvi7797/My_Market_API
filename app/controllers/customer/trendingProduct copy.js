let allModels = require("../../utilities/allModels")
const { validationResult } = require('express-validator');
let { getRating } = require("../../../common/productVariantReview")
exports.trendingProducts = async (req, res) => {

    try {
        let trending = await allModels.orderItems.find()
            .select(["productVariantId", "createdAt"])
            .populate({
                path: "productVariantId", select: ['-__v', '-updatedAt', '-createdAt', '-inventoryQuantity', '-inventoryReOrderLevel', '-inventoryReOrderQuantity'
                    , '-productVariantImages.active', '-productVariantImages.photoOrder', "-shipmentWidth", "-shipmentWeight", "-shipmentHeight", "-shipmentLength"],

                match: {
                    $and: [
                        { active: true },
                        { "productVariantImages": { $ne: [] } }]
                },
                populate: [
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
                        select: ["_id", "nameOfBussinessEnglish"]
                    },
                ]
            })
            .sort([['createdAt', '-1']])
            .limit(10)
            .lean()

        let sold = []

        if (trending.length == 0) {
            return res.send({ count: 0, d: [] })
        }

        for (let i = 0; i < trending.length; i++) {
            const el = trending[i];

            if (el['productVariantId']) {
                sold.push(el['productVariantId']);
            }
        }

        let check = sold.filter((li, idx, self) => self.map(itm =>
            itm._id).indexOf(li._id) === idx);

        let temp = [];
        if (check.length == 0) {
            return res.send({ count: 0, d: [] })
        }



        for (let index = 0; index < check.length; index++) {
            const element = check[index]._id;
            check[index].offerPrice = await allModels.offerPricingItem.find({ "productVariantId": element })
                .select(["offerPrice", "discount", "discountType", "discountValue"])
        }

        await getRating(check, temp);


        let RESPONSE_DATA = temp.filter(a => {
            return a['sellerId'] != null;
        });
        return res.send({ count: RESPONSE_DATA.length, d: RESPONSE_DATA })

    }
    catch (error) {
        console.log(error.message)
        return res.status(403).send({ message: error.message })
    }


    // return res.send({ count: trending.length, d: trending })
}

