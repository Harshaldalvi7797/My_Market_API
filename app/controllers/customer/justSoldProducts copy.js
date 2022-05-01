let allModels = require("../../../utilities/allModels")
let { getRating } = require("../../../common/productVariantReview")


exports.justSoldProducts = async (req, res) => {
    try {
        let justSold = await allModels.orderItems.find({})
            .select(['productVariantId'])
            .populate({
                path: 'productVariantId',
                select: ['-__v', '-createdAt', '-updatedAt',
                    , '-inventoryQuantity', '-inventoryReOrderLevel', '-inventoryReOrderQuantity', '-shipmentWidth',
                    '-shipmentLength', '-shipmentHeight', '-shipmentWeight', '-orderQuantityMax', '-orderQuantityMin',
                    '-productVariantImages.active', '-productVariantImages.photoOrder'
                ],
                match:{
                    active:true, 
                    "productVariantImages":{$ne:[]}
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
            .limit(10).lean()

        let sold = []
        if (justSold.length == 0) {
            return res.send({ count: 0, d: [] })
        }

        for (let i = 0; i < justSold.length; i++) {
            const el = justSold[i];            
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
                .select(["offerPrice", "discount", "discountType","discountValue"])
        }

        await getRating(check, temp);


        let RESPONSE_DATA = temp.filter(a => {
            return a['sellerId'] != null;
        });
        return res.send({ count: RESPONSE_DATA.length, d: RESPONSE_DATA })

    }
    catch (error) {
        return error.message
    }


}