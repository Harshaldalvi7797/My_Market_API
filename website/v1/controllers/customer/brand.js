let allModels = require("../../../../utilities/allModels");
const { validationResult } = require('express-validator')
let mongoose = require("mongoose")
let { getRating } = require('./../../../../common/productVariantReview');
// Local modules
const { commonInclustion, filter } = require("../../../../utilities/filter_util");
const { ObjectId } = mongoose.Types;

exports.sellerOfferProducts = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }


    const _commonInclustion = {
        productVariantImages: 1,
        promotionVideo: 1,
        adminId: 1,
        productVariantSpecifications: 1,
        productVariantDetails: 1,
        internationalShippingPrice: 1,
        domesticShippingPrice: 1,
        additionalCod: 1,
        adminApproval: 1,
        currency: 1,
        productSKU: 1,
        productGrossPrice: 1,
        productNetPrice: 1,
        productTaxPercentage: 1,
        productTaxPrice: 1,
        orderQuantityMax: 1,
        orderQuantityMin: 1,
        subscription: 1,
        subscriptionPrice: 1,
        subscriptionPriceWithoutTax: 1,
        subscriptionTaxAmount: 1,
        savingPercentage: 1,
        codConveniencePrice: 1,
        createdDate: 1,
        updatedDate: 1,
        indexNo: 1,
    }
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

    const today = new Date();
    // today.setHours(0);
    // today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);
    let datetime = convertDateTime(today);
    let offerPricingFilter = {
        $expr: {
            $and: [
                { $eq: ["$active", true] },
                { $ne: [[], "$$offerId"] },
                { $eq: ["$offerpricingId", "$$offerId"] },
                { $eq: ["$productVariantId", "$$pvId"] },
            ]
        }
    }

    let offerFilter = {
        $expr: {
            $and: [
                { $eq: ["$sellerId", "$$sellerId"] },
                { $eq: ["$active", true] },
                { $lte: ["$startDate", datetime] },
                { $gt: ["$endDate", datetime] }
            ]
        }
    }
    let productvariant = await allModels.productVariant.aggregate([
        {
            $match: {
                sellerId: ObjectId(req.body.sellerId),
                active: true, adminApproval: true,
                productVariantImages: { $ne: [] }
            }
        },
        // Joining brands
        {
            $lookup: {
                from: "brands",
                localField: "brandId",
                foreignField: "_id",
                as: "brands"
            }
        },
        // Joining products
        {
            $lookup: {
                from: "products",
                localField: "productId",
                foreignField: "_id",
                as: "products"
            }
        },
        // Joining sellers
        {
            $lookup: {
                from: "sellers",
                localField: "sellerId",
                foreignField: "_id",
                as: "sellers"
            }
        },
        // Joining productvarientreviews
        {
            $lookup: {
                from: "productvarientreviews",
                localField: "_id",
                foreignField: "productVariantId",
                as: "productvarientreviews"
            }
        },

        // First Projection
        {
            $project: {
                ...commonInclustion,
                productNetPrice: {
                    $toDouble: "$productNetPrice"
                },
                englishProductVariantName: {
                    $arrayElemAt: ["$productVariantDetails.productVariantName", 0]
                },
                arabicProductVariantName: {
                    $arrayElemAt: ["$productVariantDetails.productVariantName", 1]
                },
                productVariantImages: {
                    $filter: {
                        input: "$productVariantImages",
                        as: "productVariantImage",
                        cond: {
                            $eq: ["$$productVariantImage.active", true],
                        }
                    }
                },

                rating: {
                    averageRate: {
                        $avg: "$productvarientreviews.rating"
                    },
                    totalReview: {
                        $size: "$productvarientreviews"
                    }
                },

                brandId: {
                    $first: "$brands",
                },
                sellerId: {
                    _id: {
                        $first: "$sellers._id",
                    },
                    nameOfBussinessEnglish: {
                        $first: "$sellers.nameOfBussinessEnglish",
                    },
                    nameOfBussinessArabic: {
                        $first: "$sellers.nameOfBussinessArabic",
                    },
                },
                productId: {
                    _id: {
                        $first: "$products._id",
                    },
                    productSpecifications: {
                        $first: "$products.productSpecifications",
                    },
                    productDetails: {
                        $first: "$products.productDetails",
                    },
                    active: {
                        $first: "$products.active",
                    },
                    productCategories: {
                        $first: "$products.productCategories",
                    },
                    productDate: {
                        $first: "$products.productDate",
                    },
                    productUpdateDate: {
                        $first: "$products.productUpdateDate",
                    },
                }
            }
        },
        // Second Projection
        {
            $project: {
                // productFinalPrice: 1,
                ...commonInclustion,
                englishProductVariantName: {
                    $toLower: "$englishProductVariantName"
                },
                arabicProductVariantName: {
                    $toLower: "$arabicProductVariantName"
                },
                productVariantImages: {
                    $map: {
                        input: "$productVariantImages",
                        as: "productVariantImage",
                        in: {
                            path: "$$productVariantImage.path",
                            image_id: "$$productVariantImage.image_id"
                        }
                    }
                },
                rating: 1,

                brandId: 1,
                sellerId: 1,
                productId: 1
            }
        },
        //new changes start
        // Joining offerpricingitems
        {
            $lookup: {
                from: "offerpricings",
                let: { sellerId: "$sellerId._id" },
                pipeline: [{ $match: offerFilter }],
                as: "offerpricings",
            }
        },
        { $unwind: { path: "$offerpricings" } },
        {
            $lookup: {
                from: "offerpricingitems",
                let: { pvId: "$_id", offerId: "$offerpricings._id" },
                pipeline: [{ $match: offerPricingFilter }],
                as: "offerpricingitems",
            },
        },
        {
            $group: {
                _id: "$_id",
                englishProductVariantName: { $first: "$englishProductVariantName" },
                arabicProductVariantName: { $first: "$arabicProductVariantName" },
                productVariantImages: { $first: "$productVariantImages" },
                rating: { $first: "$rating" },
                brandId: { $first: "$brandId" },
                sellerId: { $first: "$sellerId" },
                productId: { $first: "$productId" },
                offerpricings: { $push: "$offerpricings" },
                offerpricingitems: { $push: "$offerpricingitems" },
                productVariants: { $first: "$productVariants" },
                promotionVideo: { $first: "$promotionVideo" },
                adminId: { $first: "$adminId" },
                productVariantSpecifications: { $first: "$productVariantSpecifications" },
                productVariantDetails: { $first: "$productVariantDetails" },
                internationalShippingPrice: { $first: "$internationalShippingPrice" },
                domesticShippingPrice: { $first: "$domesticShippingPrice" },
                additionalCod: { $first: "$additionalCod" },
                adminApproval: { $first: "$adminApproval" },
                currency: { $first: "$currency" },
                productSKU: { $first: "$productSKU" },
                productGrossPrice: { $first: "$productGrossPrice" },
                productNetPrice: { $first: "$productNetPrice" },
                productTaxPercentage: { $first: "$productTaxPercentage" },
                productTaxPrice: { $first: "$productTaxPrice" },
                orderQuantityMax: { $first: "$orderQuantityMax" },
                orderQuantityMin: { $first: "$orderQuantityMin" },
                subscription: { $first: "$subscription" },
                subscriptionPrice: { $first: "$subscriptionPrice" },
                subscriptionPriceWithoutTax: { $first: "$subscriptionPriceWithoutTax" },
                subscriptionTaxAmount: { $first: "$subscriptionTaxAmount" },
                savingPercentage: { $first: "$savingPercentage" },
                codConveniencePrice: { $first: "$codConveniencePrice" },
                createdDate: { $first: "$createdDate" },
                updatedDate: { $first: "$updatedDate" },
                indexNo: { $first: "$indexNo" },
                tags: { $first: "$tags" },
                trending: { $first: "$trending" },
                active: { $first: "$active" },
            }
        },
        {
            $addFields: {
                offerpricingitems: {
                    $filter: {
                        input: "$offerpricingitems",
                        as: "offerpricingitem",
                        cond: { $ne: ["$$offerpricingitem", []] }
                    }
                },
            }
        },
        {
            $project: {
                ...commonInclustion,
                offerPrice: {
                    $cond: {
                        if: { $ne: [{ $size: "$offerpricingitems" }, 0] }, then: { $first: "$offerpricingitems" }, else: []
                    }
                },
                englishProductVariantName: 1,
                arabicProductVariantName: 1,
                productVariantImages: 1,
                rating: 1,
                brandId: 1,
                sellerId: 1,
                productId: 1,
            }
        },
        {
            $match: { offerPrice: { $ne: [] } }
        },
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

    // return res.send({ count: productvariant.length, data: productvariant })
    const pvList = productvariant.length ? productvariant[0].paginatedResults : [];
    let totalCount = 0
    try {
        totalCount = productvariant[0].totalCount[0].count
    } catch (err) { }

    return res.send({
        totalCount: totalCount,
        count: pvList.length,
        data: pvList
    })
}

exports.sellerNewArrivalProducts = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    let { limit, page } = req.body;
    //pagination
    if (!limit) { limit = 10 }
    if (!page) { page = 1 }

    let perPage = parseInt(limit)
    let pageNo = Math.max(0, parseInt(page))

    if (pageNo > 0) {
        pageNo = pageNo - 1;
    } else if (pageNo < 0) {
        pageNo = 0;
    }
    const today = new Date();
    // today.setHours(0);
    // today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);
    let datetime = convertDateTime(today);
    let offerPricingFilter = {
        $expr: {
            $and: [
                { $eq: ["$active", true] },
                { $ne: [[], "$$offerId"] },
                { $eq: ["$offerpricingId", "$$offerId"] },
                { $eq: ["$productVariantId", "$$pvId"] },
            ]
        }
    }

    let offerFilter = {
        $expr: {
            $and: [
                { $eq: ["$sellerId", "$$sellerId"] },
                { $eq: ["$active", true] },
                { $lte: ["$startDate", datetime] },
                { $gt: ["$endDate", datetime] }
            ]
        }
    }

    let sellersProducts = await allModels.productVariant.aggregate([
        {
            $match: {
                sellerId: ObjectId(req.body.sellerId),
                active: true, adminApproval: true,
                productVariantImages: { $ne: [] }
            }
        },
        { $sort: { "indexNo": - 1 } },
        // Joining brands
        {
            $lookup: {
                from: "brands",
                localField: "brandId",
                foreignField: "_id",
                as: "brands"
            }
        },
        // Joining products
        {
            $lookup: {
                from: "products",
                localField: "productId",
                foreignField: "_id",
                as: "products"
            }
        },
        // Joining sellers
        {
            $lookup: {
                from: "sellers",
                localField: "sellerId",
                foreignField: "_id",
                as: "sellers"
            }
        },
        // Joining productvarientreviews
        {
            $lookup: {
                from: "productvarientreviews",
                localField: "_id",
                foreignField: "productVariantId",
                as: "productvarientreviews"
            }
        },

        // First Projection
        {
            $project: {
                ...commonInclustion,
                productNetPrice: {
                    $toDouble: "$productNetPrice"
                },
                englishProductVariantName: {
                    $arrayElemAt: ["$productVariantDetails.productVariantName", 0]
                },
                arabicProductVariantName: {
                    $arrayElemAt: ["$productVariantDetails.productVariantName", 1]
                },
                productVariantImages: {
                    $filter: {
                        input: "$productVariantImages",
                        as: "productVariantImage",
                        cond: {
                            $eq: ["$$productVariantImage.active", true],
                        }
                    }
                },

                rating: {
                    averageRate: {
                        $avg: "$productvarientreviews.rating"
                    },
                    totalReview: {
                        $size: "$productvarientreviews"
                    }
                },

                brandId: {
                    $first: "$brands",
                },
                sellerId: {
                    _id: {
                        $first: "$sellers._id",
                    },
                    nameOfBussinessEnglish: {
                        $first: "$sellers.nameOfBussinessEnglish",
                    },
                    nameOfBussinessArabic: {
                        $first: "$sellers.nameOfBussinessArabic",
                    },
                },
                productId: {
                    _id: {
                        $first: "$products._id",
                    },
                    productSpecifications: {
                        $first: "$products.productSpecifications",
                    },
                    productDetails: {
                        $first: "$products.productDetails",
                    },
                    active: {
                        $first: "$products.active",
                    },
                    productCategories: {
                        $first: "$products.productCategories",
                    },
                    productDate: {
                        $first: "$products.productDate",
                    },
                    productUpdateDate: {
                        $first: "$products.productUpdateDate",
                    },
                }
            }
        },
        // Second Projection
        {
            $project: {
                // productFinalPrice: 1,
                ...commonInclustion,
                englishProductVariantName: {
                    $toLower: "$englishProductVariantName"
                },
                arabicProductVariantName: {
                    $toLower: "$arabicProductVariantName"
                },
                productVariantImages: {
                    $map: {
                        input: "$productVariantImages",
                        as: "productVariantImage",
                        in: {
                            path: "$$productVariantImage.path",
                            image_id: "$$productVariantImage.image_id"
                        }
                    }
                },
                rating: 1,

                brandId: 1,
                sellerId: 1,
                productId: 1
            }
        },
        //new changes start
        // Joining offerpricingitems
        {
            $lookup: {
                from: "offerpricings",
                let: { sellerId: "$sellerId._id" },
                pipeline: [{ $match: offerFilter }],
                as: "offerpricings",
            }
        },
        { $unwind: { path: "$offerpricings", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "offerpricingitems",
                let: { pvId: "$_id", offerId: "$offerpricings._id" },
                pipeline: [{ $match: offerPricingFilter }],
                as: "offerpricingitems",
            },
        },
        {
            $group: {
                _id: "$_id",
                englishProductVariantName: { $first: "$englishProductVariantName" },
                arabicProductVariantName: { $first: "$arabicProductVariantName" },
                productVariantImages: { $first: "$productVariantImages" },
                rating: { $first: "$rating" },
                brandId: { $first: "$brandId" },
                sellerId: { $first: "$sellerId" },
                productId: { $first: "$productId" },
                offerpricings: { $push: "$offerpricings" },
                offerpricingitems: { $push: "$offerpricingitems" },
                productVariants: { $first: "$productVariants" },
                promotionVideo: { $first: "$promotionVideo" },
                adminId: { $first: "$adminId" },
                productVariantSpecifications: { $first: "$productVariantSpecifications" },
                productVariantDetails: { $first: "$productVariantDetails" },
                internationalShippingPrice: { $first: "$internationalShippingPrice" },
                domesticShippingPrice: { $first: "$domesticShippingPrice" },
                additionalCod: { $first: "$additionalCod" },
                adminApproval: { $first: "$adminApproval" },
                currency: { $first: "$currency" },
                productSKU: { $first: "$productSKU" },
                productGrossPrice: { $first: "$productGrossPrice" },
                productNetPrice: { $first: "$productNetPrice" },
                productTaxPercentage: { $first: "$productTaxPercentage" },
                productTaxPrice: { $first: "$productTaxPrice" },
                orderQuantityMax: { $first: "$orderQuantityMax" },
                orderQuantityMin: { $first: "$orderQuantityMin" },
                subscription: { $first: "$subscription" },
                subscriptionPrice: { $first: "$subscriptionPrice" },
                subscriptionPriceWithoutTax: { $first: "$subscriptionPriceWithoutTax" },
                subscriptionTaxAmount: { $first: "$subscriptionTaxAmount" },
                savingPercentage: { $first: "$savingPercentage" },
                codConveniencePrice: { $first: "$codConveniencePrice" },
                createdDate: { $first: "$createdDate" },
                updatedDate: { $first: "$updatedDate" },
                indexNo: { $first: "$indexNo" },
                tags: { $first: "$tags" },
                trending: { $first: "$trending" },
                active: { $first: "$active" },
            }
        },
        {
            $addFields: {
                offerpricingitems: {
                    $filter: {
                        input: "$offerpricingitems",
                        as: "offerpricingitem",
                        cond: { $ne: ["$$offerpricingitem", []] }
                    }
                },
            }
        },
        {
            $project: {
                ...commonInclustion,
                offerPrice: {
                    $map: {
                        input: "$offerpricingitems",
                        as: "offerpricingitem",
                        in: {
                            $cond: {
                                if: { $ne: ["$$offerpricingitem", []] },
                                then: {
                                    _id: { $first: "$$offerpricingitem._id" },
                                    offerPricingId: { $first: "$$offerpricingitem.offerpricingId" },
                                    discountType: { $first: "$$offerpricingitem.discountType" },
                                    discountValue: {
                                        $toDouble: { $first: "$$offerpricingitem.discountValue" }
                                    },
                                    offerPrice: {
                                        $toDouble: { $first: "$$offerpricingitem.offerPrice" }
                                    },
                                },
                                else: {}
                            }
                        }
                    }
                },
                englishProductVariantName: 1,
                arabicProductVariantName: 1,
                productVariantImages: 1,
                rating: 1,
                brandId: 1,
                sellerId: 1,
                productId: 1,
            }
        },
        //new changes end
        {
            $addFields: {
                productFinalPrice: {
                    $cond: {
                        if: {
                            $eq: ["$offerPrice", []]
                        },
                        then: { $toDouble: { $toString: "$productNetPrice" } },
                        else: { $toDouble: { $toString: { $first: "$offerPrice.offerPrice" } } }
                    }
                }
            }
        },


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

    // return res.send({ count: sellersProducts.length, data: sellersProducts })
    const pvList = sellersProducts.length ? sellersProducts[0].paginatedResults : [];
    let totalCount = 0
    try {
        totalCount = sellersProducts[0].totalCount[0].count
    } catch (err) { }

    return res.send({
        totalCount: totalCount,
        count: pvList.length,
        data: pvList
    })




}


exports.allSeller = async (req, res) => {
    let seller = await allModels.seller.find()
        .select(['sellerDetails', 'nameOfBussinessEnglish', 'nameOfBussinessArabic', 'bussinessCoverImage', 'profileImage'])

    return res.send({ count: seller.length, seller: seller })
}

exports.singleSeller = async (req, res) => {
    let sellerId = req.query.sellerId;
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    var valid = mongoose.Types.ObjectId.isValid(sellerId);
    if (!valid) {
        return res.status(402).send({ message: "There was no seller found with given information!" });
    }


    let brandSeller = await allModels.seller.find({ "_id": req.query.sellerId })
        .select(["-createdAt", "-updatedAt", "-__v", "-password"])

    return res.send({ d: brandSeller })

}

exports.sellerProductvariantBybrand = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    try {
        let sellerId = req.query.sellerId;
        var valid = mongoose.Types.ObjectId.isValid(sellerId);
        if (!valid) {
            return res.status(402).send({ message: "Invalid seller id" });
        }

        let productVariant = await allModels.productVariant.find({
            sellerId: sellerId
        }).populate({
            path: 'brandId',
            select: ["_id", "brandDetails"]
        }).select(['active']);

        for (let index = 0; index < productVariant.length; index++) {
            const element = productVariant[index]._id;
            productVariant[index].offerPrice = await allModels.offerPricingItem
                .find({ "productVariantId": element })
                .select(["offerPrice", "discount", "discountType", "discountValue"])
        }

        return res.send({ message: "data", count: productVariant.length, productVariant })
    }
    catch (error) {
        return error.message
    }
}

exports.productvariantsOfBrandsBySellerId = async (req, res) => {
    let sellerId = req.query.sellerId;
    var valid = mongoose.Types.ObjectId.isValid(sellerId);
    if (!valid) {
        return res.status(402).send({ message: "Invalid seller id" });
    }
    let brandId = req.query.brandId;
    var valid = mongoose.Types.ObjectId.isValid(brandId);
    if (!valid) {
        return res.status(402).send({ message: "Invalid brand id" });
    }
    let productVariant = await allModels.productVariant.find({
        sellerId: sellerId,
        brandId: brandId
    })
        .select(['productVariantDetails', 'productVariantImages', 'productGrossPrice', 'productNetPrice', 'productTaxPercentage',
            'productTaxPrice'])
        .lean()

    if (productVariant.length == 0) {
        return res.send({ count: 0, d: productVariant });
    }

    let temp = [];
    await getRating(productVariant, temp);

    for (let index = 0; index < productVariant.length; index++) {
        const element = productVariant[index]._id;
        productVariant[index].offerPrice = await allModels.offerPricingItem.find({ "productVariantId": element })
            .select(["offerPrice", "discount", "discountType", "discountValue"])
    }

    let RESPONSE_DATA = temp.filter(a => {
        return a['sellerId'] != null;
    });
    return res.send({ message: "data", count: productVariant.length, d: productVariant })
}

exports.productVariantsBySellerId = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    //---------------------------------------------------------------//


    let { sellerId, limit, page } = req.query
    //pagination
    if (!limit) { limit = 10 }
    if (!page) { page = 1 }

    let perPage = parseInt(limit)
    let pageNo = Math.max(0, parseInt(page))

    if (pageNo > 0) {
        pageNo = pageNo - 1;
    } else if (pageNo < 0) {
        pageNo = 0;
    }

    const today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);
    let datetime = convertDateTime(today);

    let seller = mongoose.Types.ObjectId(sellerId);

    let offerPricingFilter = {
        $expr: {
            $and: [
                { $eq: ["$active", true] },
                { $ne: [[], "$$offerId"] },
                { $eq: ["$offerpricingId", "$$offerId"] },
                { $eq: ["$productVariantId", "$$pvId"] },
            ]
        }
    }

    let offerFilter = {
        $expr: {
            $and: [
                { $eq: ["$sellerId", "$$sellerId"] },
                { $eq: ["$active", true] },
                { $lt: ["$startDate", datetime] },
                { $gt: ["$endDate", datetime] }
            ]
        }
    }

    let productvariant = await allModels.productVariant.aggregate([
        {
            $match: {
                $and: [
                    { adminApproval: true },
                    { active: true },
                    { sellerId: seller }
                ]

            }
        },
        {
            $lookup: {
                from: "offerpricings",
                let: {
                    sellerId: "$sellerId"
                },
                pipeline: [
                    {
                        $match: offerFilter
                    }
                ],
                as: "offerpricings",
            }
        },
        {
            $lookup: {
                from: "offerpricingitems",
                let: {
                    pvId: "$_id", offerId: { $first: "$offerpricings._id" }
                },
                pipeline: [
                    {
                        $match: offerPricingFilter
                    }
                ],
                as: "offerpricingitems",
            },
        },
        {
            $group: {
                _id: "$_id",
                "productVariantImages": { $first: "$productVariantImages" },
                "promotionVideo": { $first: "$promotionVideo" },
                "sellerId": { $first: "$sellerId" },
                "adminId": { $first: "$adminId" },
                "productVariantDetails": { $first: "$productVariantDetails" },
                "internationalShippingPrice": {
                    $first: "$internationalShippingPrice"
                },
                "domesticShippingPrice": { $first: "$domesticShippingPrice" },
                "additionalCod": { $first: "$additionalCod" },
                "active": { $first: "$active" },
                "currency": { $first: "$currency" },
                "productId": { $first: "$productId" },
                "brandId": { $first: "$brandId" },
                "productSKU": { $first: "$productSKU" },
                "productGrossPrice": { $first: "$productGrossPrice" },
                "productNetPrice": { $first: "$productNetPrice" },
                "productTaxPercentage": { $first: "$productTaxPercentage" },
                "productTaxPrice": { $first: "$productTaxPrice" },
                "orderQuantityMax": { $first: "$orderQuantityMax" },
                "orderQuantityMin": { $first: "$orderQuantityMin" },
                "inventoryQuantity": { $first: "$inventoryQuantity" },
                "inventoryReOrderLevel": { $first: "$inventoryReOrderLevel" },
                "inventoryReOrderQuantity": {
                    $first: "$inventoryReOrderQuantity"
                },
                "shipmentWidth": { $first: "$shipmentWidth" },
                "shipmentLength": { $first: "$shipmentLength" },
                "shipmentHeight": { $first: "$shipmentHeight" },
                "shipmentWeight": { $first: "$shipmentWeight" },
                "subscription": { $first: "$subscription" },
                "subscriptionPrice": {
                    $first: "$subscriptionPrice"
                },
                "subscriptionPriceWithoutTax": {
                    $first: "$subscriptionPriceWithoutTax"
                },
                "subscriptionTaxAmount": { $first: "$subscriptionTaxAmount" },
                "savingPercentage": { $first: "$savingPercentage" },
                "codConveniencePrice": { $first: "$codConveniencePrice" },
                "createdAt": { $first: "$createdAt" },
                "updatedAt": { $first: "$updatedAt" },
                "createdDate": { $first: "$createdDate" },
                "updatedDate": { $first: "$updatedDate" },
                "indexNo": { $first: "$indexNo" },
                "adminApproval": { $first: "$adminApproval" },
                "productVariantSpecifications": {
                    $first: "$productVariantSpecifications"
                },
                "offerprice": { $push: "$offerpricingitems" }

            }
        },
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
    ]);

    let productvariantList = productvariant.length ? productvariant[0].paginatedResults : [];
    if (productvariantList.length > 0) {
        let temp = [];
        await getRating(productvariantList, temp);
        productvariantList = temp;
    }

    let totalCount = 0
    try {
        totalCount = productvariant[0].totalCount[0].count
    } catch (err) { }
    return res.send({ totalCount: totalCount, count: productvariantList.length, d: productvariantList });

}

exports.newLaunchesProductsByBrandSeller = async (req, res) => {
    let sellerId = req.query.sellerId;
    var valid = mongoose.Types.ObjectId.isValid(sellerId);
    if (!valid) {
        return res.status(402).send({ message: "Invalid seller id" });
    }

    let productVariant = await allModels.productVariant.find({
        sellerId: sellerId
    }).
        sort([['createdAt', '-1']])
        .select(['productVariantDetails', 'productVariantImages', 'productGrossPrice', 'productNetPrice', 'productTaxPercentage',
            'productTaxPrice', 'sellerId']).lean()
    //console.log(productVariant)
    if (productVariant.length == 0) {
        return res.send({ count: 0, d: productVariant });
    }
    let temp = [];
    await getRating(productVariant, temp);


    for (let index = 0; index < productVariant.length; index++) {
        const element = productVariant[index]._id;
        productVariant[index].offerPrice = await allModels.offerPricingItem.find({ "productVariantId": element })
            .select(["offerPrice", "discount", "discountType", "discountValue"])
    }


    //console.log(temp)

    let RESPONSE_DATA = temp.filter(a => {
        return a['sellerId'] != null;
    });
    //console.log(RESPONSE_DATA)
    return res.send({ count: RESPONSE_DATA.length, d: RESPONSE_DATA })
    // res.send({ message: "data", count: productVariant.length, productVariant })
}

exports.allCategories = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let sellerId = req.query.sellerId;
    var valid = mongoose.Types.ObjectId.isValid(sellerId);

    if (!valid) {
        return res.status(402).send({ message: "Invalid seller id" });
    }

    let productVariant = await allModels.productVariant.aggregate([
        { $match: { sellerId: mongoose.Types.ObjectId(sellerId), active: true } },
        { $match: { adminApproval: true } },
        {
            $lookup: {
                from: "products",
                localField: "productId",
                foreignField: "_id",
                as: "products"
            }
        },
        { $match: { "products.active": true } },
        {
            $project: {
                "products.productCategories.categoryLevel1Id": 1
            }
        },
        { $unwind: { path: "$products" } },
        { $unwind: { path: "$products.productCategories" } },
        {
            $group: {
                _id: "$products.productCategories"
            }
        },
        {
            $lookup: {
                from: "categories",
                localField: "_id.categoryLevel1Id",
                foreignField: "_id",
                as: "category"
            }
        },
        { $match: { 'category.active': true } },
        { $unwind: { path: "$category" } }
    ]);
    return res.send({ data: productVariant })


}

exports.getSellerTopSelling = async (req, res) => {
    try {
        let sellerId = req.query.sellerId;
        var valid = mongoose.Types.ObjectId.isValid(sellerId);

        if (!valid) {
            return res.status(402).send({ message: "Invalid seller id" });
        }
        let { limit, page } = req.body;
        //pagination
        if (!limit) { limit = 10 }
        if (!page) { page = 1 }

        let perPage = parseInt(limit)
        let pageNo = Math.max(0, parseInt(page))

        if (pageNo > 0) {
            pageNo = pageNo - 1;
        } else if (pageNo < 0) {
            pageNo = 0;
        }


        const today = new Date();
        // today.setHours(0);
        // today.setMinutes(0);
        today.setSeconds(0);
        today.setMilliseconds(0);
        let datetime = convertDateTime(today);
        let offerPricingFilter = {
            $expr: {
                $and: [
                    { $eq: ["$active", true] },
                    { $ne: [[], "$$offerId"] },
                    { $eq: ["$offerpricingId", "$$offerId"] },
                    { $eq: ["$productVariantId", "$$pvId"] },
                ]
            }
        }

        let offerFilter = {
            $expr: {
                $and: [
                    { $eq: ["$sellerId", "$$sellerId"] },
                    { $eq: ["$active", true] },
                    { $lte: ["$startDate", datetime] },
                    { $gt: ["$endDate", datetime] }
                ]
            }
        }
        const orders = await allModels.orderItems.aggregate([
            { $match: { sellerId: mongoose.Types.ObjectId(sellerId) } },
            {
                $group: {
                    _id: "$productVariantId",
                    totalSales: { $sum: 1 },
                },
            },
            { $sort: { totalSales: -1 } },

            {
                $lookup: {
                    from: "productvariants",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productVariants",
                }
            },
            {
                $match: {
                    $and: [
                        // { "productVariants.productVariantImages": { $ne: [] } },
                        { "productVariants.adminApproval": true },
                        { "productVariants.active": true }
                    ]
                }
            },
            {
                $unwind: {
                    path: "$productVariants"
                }
            },
            // Joining products
            {
                $lookup: {
                    from: "products",
                    localField: "productVariants.productId",
                    foreignField: "_id",
                    as: "products"
                }
            },
            // Joining brands
            {
                $lookup: {
                    from: "brands",
                    localField: "products.brandId",
                    foreignField: "_id",
                    as: "brands"
                }
            },
            // Joining sellers
            {
                $lookup: {
                    from: "sellers",
                    localField: "productVariants.sellerId",
                    foreignField: "_id",
                    as: "sellers"
                }
            },
            // Joining productvarientreviews
            {
                $lookup: {
                    from: "productvarientreviews",
                    localField: "productVariants._id",
                    foreignField: "productVariantId",
                    as: "productvarientreviews"
                }
            },
            // First Projection
            {
                $project: {
                    ...commonInclustion,
                    productNetPrice: {
                        $toDouble: "$productVariantsproductNetPrice"
                    },
                    englishProductVariantName: {
                        $arrayElemAt: ["$productVariants.productVariantDetails.productVariantName", 0]
                    },
                    arabicProductVariantName: {
                        $arrayElemAt: ["$productVariants.productVariantDetails.productVariantName", 1]
                    },
                    productVariantImages: {
                        $filter: {
                            input: "$productVariants.productVariantImages",
                            as: "productVariantImage",
                            cond: {
                                $eq: ["$$productVariantImage.active", true],
                            }
                        }
                    },

                    rating: {
                        averageRate: {
                            $avg: "$productvarientreviews.rating"
                        },
                        totalReview: {
                            $size: "$productvarientreviews"
                        }
                    },

                    brandId: {
                        $first: "$brands",
                    },
                    sellerId: {
                        _id: {
                            $first: "$sellers._id",
                        },
                        nameOfBussinessEnglish: {
                            $first: "$sellers.nameOfBussinessEnglish",
                        },
                        nameOfBussinessArabic: {
                            $first: "$sellers.nameOfBussinessArabic",
                        },
                    },
                    productId: {
                        _id: {
                            $first: "$products._id",
                        },
                        productSpecifications: {
                            $first: "$products.productSpecifications",
                        },
                        productDetails: {
                            $first: "$products.productDetails",
                        },
                        active: {
                            $first: "$products.active",
                        },
                        productCategories: {
                            $first: "$products.productCategories",
                        },
                        productDate: {
                            $first: "$products.productDate",
                        },
                        productUpdateDate: {
                            $first: "$products.productUpdateDate",
                        },
                    }
                }
            },
            // Match
            // Second Projection
            {
                $project: {
                    // productFinalPrice: 1,
                    ...commonInclustion,
                    englishProductVariantName: {
                        $toLower: "$englishProductVariantName"
                    },
                    arabicProductVariantName: {
                        $toLower: "$arabicProductVariantName"
                    },
                    productVariantImages: {
                        $map: {
                            input: "$productVariantImages",
                            as: "productVariantImage",
                            in: {
                                path: "$$productVariantImage.path",
                                image_id: "$$productVariantImage.image_id"
                            }
                        }
                    },
                    rating: 1,

                    brandId: 1,
                    sellerId: 1,
                    productId: 1
                }
            },
            //new changes start
            // Joining offerpricingitems
            {
                $lookup: {
                    from: "offerpricings",
                    let: { sellerId: "$sellerId._id" },
                    pipeline: [{ $match: offerFilter }],
                    as: "offerpricings",
                }
            },
            { $unwind: { path: "$offerpricings", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "offerpricingitems",
                    let: { pvId: "$_id", offerId: "$offerpricings._id" },
                    pipeline: [{ $match: offerPricingFilter }],
                    as: "offerpricingitems",
                },
            },
            {
                $group: {
                    _id: "$_id",
                    englishProductVariantName: { $first: "$englishProductVariantName" },
                    arabicProductVariantName: { $first: "$arabicProductVariantName" },
                    productVariantImages: { $first: "$productVariantImages" },
                    rating: { $first: "$rating" },
                    brandId: { $first: "$brandId" },
                    sellerId: { $first: "$sellerId" },
                    productId: { $first: "$productId" },
                    offerpricings: { $push: "$offerpricings" },
                    offerpricingitems: { $push: "$offerpricingitems" },
                    productVariants: { $first: "$productVariants" },
                    promotionVideo: { $first: "$productVariants.promotionVideo" },
                    adminId: { $first: "$productVariants.adminId" },
                    productVariantSpecifications: { $first: "$productVariants.productVariantSpecifications" },
                    productVariantDetails: { $first: "$productVariants.productVariantDetails" },
                    internationalShippingPrice: { $first: "$productVariants.internationalShippingPrice" },
                    domesticShippingPrice: { $first: "$productVariants.domesticShippingPrice" },
                    additionalCod: { $first: "$productVariants.additionalCod" },
                    adminApproval: { $first: "$productVariants.adminApproval" },
                    currency: { $first: "$productVariants.currency" },
                    productSKU: { $first: "$productVariants.productSKU" },
                    productGrossPrice: { $first: "$productVariants.productGrossPrice" },
                    productNetPrice: { $first: "$productVariants.productNetPrice" },
                    productTaxPercentage: { $first: "$productVariants.productTaxPercentage" },
                    productTaxPrice: { $first: "$productVariants.productTaxPrice" },
                    orderQuantityMax: { $first: "$productVariants.orderQuantityMax" },
                    orderQuantityMin: { $first: "$productVariants.orderQuantityMin" },
                    subscription: { $first: "$productVariants.subscription" },
                    subscriptionPrice: { $first: "$productVariants.subscriptionPrice" },
                    subscriptionPriceWithoutTax: { $first: "$productVariants.subscriptionPriceWithoutTax" },
                    subscriptionTaxAmount: { $first: "$productVariants.subscriptionTaxAmount" },
                    savingPercentage: { $first: "$productVariants.savingPercentage" },
                    codConveniencePrice: { $first: "$productVariants.codConveniencePrice" },
                    createdDate: { $first: "$productVariants.createdDate" },
                    updatedDate: { $first: "$productVariants.updatedDate" },
                    indexNo: { $first: "$productVariants.indexNo" },
                    tags: { $first: "$productVariants.tags" },
                    trending: { $first: "$productVariants.trending" },
                    active: { $first: "$productVariants.active" },
                }
            },
            {
                $addFields: {
                    offerpricingitems: {
                        $filter: {
                            input: "$offerpricingitems",
                            as: "offerpricingitem",
                            cond: { $ne: ["$$offerpricingitem", []] }
                        }
                    },
                }
            },
            {
                $project: {
                    ...commonInclustion,
                    offerPrice: {
                        $map: {
                            input: "$offerpricingitems",
                            as: "offerpricingitem",
                            in: {
                                $cond: {
                                    if: { $ne: ["$$offerpricingitem", []] },
                                    then: {
                                        _id: { $first: "$$offerpricingitem._id" },
                                        offerPricingId: { $first: "$$offerpricingitem.offerpricingId" },
                                        discountType: { $first: "$$offerpricingitem.discountType" },
                                        discountValue: {
                                            $toDouble: { $first: "$$offerpricingitem.discountValue" }
                                        },
                                        offerPrice: {
                                            $toDouble: { $first: "$$offerpricingitem.offerPrice" }
                                        },
                                    },
                                    else: {}
                                }
                            }
                        }
                    },
                    englishProductVariantName: 1,
                    arabicProductVariantName: 1,
                    productVariantImages: 1,
                    rating: 1,
                    brandId: 1,
                    sellerId: 1,
                    productId: 1,
                }
            },
            //new changes end
            {
                $addFields: {
                    productFinalPrice: {
                        $cond: {
                            if: {
                                $eq: ["$offerPrice", []]
                            },
                            then: { $toDouble: { $toString: "$productNetPrice" } },
                            else: { $toDouble: { $toString: { $first: "$offerPrice.offerPrice" } } }
                        }
                    }
                }
            },
            // { $sort: { totalSales: -1 } },

            {
                $limit: 20,
            },
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
        const pvList = orders.length ? orders[0].paginatedResults : [];
        let totalCount = 0
        try {
            totalCount = orders[0].totalCount[0].count
        } catch (err) { }

        return res.send({
            totalCount: totalCount,
            count: pvList.length,
            data: pvList
        })

        // return res.send({ count: orders.length, data: orders })
        //return res.send({ count: filter.length, result: filter });
    } catch (error) {
        return res.status(403).send({ message: error.message });
    }
};

exports.searchBrand = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    if (req.body.search.length > 2) {
        var search = req.body.search;
        allModels.seller.find({
            $or: [
                { "sellerAddress.companyName": new RegExp(search, "i") },

            ]
        }, async (err, data) => {
            if (err) { return res.status(403).send({ error: err }); }
            //var RESPONSE_DATA = [];

            if (data.length == 0) {
                return res.send({ d: data });
            }
            return res.send({ d: data });
        }).select(["_id", "sellerAddress"])
    } else {
        return res.send({ message: "Search string must be greater the 2 characters" });
    }
}


exports.sellerBrandNewArrivalPv = async (req, res, next) => {

    try {
        const validationError = validationResult(req);
        if (!validationError.isEmpty()) {
            return res.status(403).send({ message: validationError.array() });
        }
        let sellerId = req.query.sellerId;
        var valid = mongoose.Types.ObjectId.isValid(sellerId);
        let seller = mongoose.Types.ObjectId(sellerId);
        // const { findQuery = {}, sort = { indexNo: -1 } } = filter(req);

        let { limit, page } = req.body
        //pagination
        if (!limit) { limit = 10 }
        if (!page) { page = 1 }

        let perPage = parseInt(limit)
        let pageNo = Math.max(0, parseInt(page))

        if (pageNo > 0) {
            pageNo = pageNo - 1;
        } else if (pageNo < 0) {
            pageNo = 0;
        }



        const today = new Date();
        today.setHours(0);
        today.setMinutes(0);
        today.setSeconds(0);
        today.setMilliseconds(0);
        let datetime = convertDateTime(today);

        let newArrivals = await allModels.productVariant.aggregate([
            {
                $match: {
                    $and: [
                        { productVariantImages: { $ne: [] } },
                        { adminApproval: true },
                        { active: true },
                        { sellerId: seller },
                    ]
                }
            },
            // Joining brands
            {
                $lookup: {
                    from: "brands",
                    localField: "brandId",
                    foreignField: "_id",
                    as: "brands"
                }
            },
            // Joining products
            {
                $lookup: {
                    from: "products",
                    localField: "productId",
                    foreignField: "_id",
                    as: "products"
                }
            },
            // Joining sellers
            {
                $lookup: {
                    from: "sellers",
                    localField: "sellerId",
                    foreignField: "_id",
                    as: "sellers"
                }
            },
            // Joining productvarientreviews
            {
                $lookup: {
                    from: "productvarientreviews",
                    localField: "_id",
                    foreignField: "productVariantId",
                    as: "productvarientreviews"
                }
            },
            // Joining offerpricingitems
            {
                $lookup: {
                    from: "offerpricingitems",
                    localField: "_id",
                    foreignField: "productVariantId",
                    as: "offerpricingitems"
                }
            },
            // First Projection
            {
                $project: {
                    ...commonInclustion,
                    productNetPrice: {
                        $toDouble: "$productNetPrice"
                    },
                    englishProductVariantName: {
                        $arrayElemAt: ["$productVariantDetails.productVariantName", 0]
                    },
                    arabicProductVariantName: {
                        $arrayElemAt: ["$productVariantDetails.productVariantName", 1]
                    },
                    productVariantImages: {
                        $filter: {
                            input: "$productVariantImages",
                            as: "productVariantImage",
                            cond: {
                                $eq: ["$$productVariantImage.active", true],
                            }
                        }
                    },

                    rating: {
                        averageRate: {
                            $avg: "$productvarientreviews.rating"
                        },
                        totalReview: {
                            $size: "$productvarientreviews"
                        }
                    },
                    offerPrices: {
                        $filter: {
                            input: "$offerpricingitems",
                            as: "offerpricingitem",
                            cond: {
                                $eq: ["$$offerpricingitem.active", true]
                            }

                        }

                    },

                    brandId: {
                        $first: "$brands",
                    },
                    sellerId: {
                        _id: {
                            $first: "$sellers._id",
                        },
                        nameOfBussinessEnglish: {
                            $first: "$sellers.nameOfBussinessEnglish",
                        },
                        nameOfBussinessArabic: {
                            $first: "$sellers.nameOfBussinessArabic",
                        },
                    },
                    productId: {
                        _id: {
                            $first: "$products._id",
                        },
                        productSpecifications: {
                            $first: "$products.productSpecifications",
                        },
                        productDetails: {
                            $first: "$products.productDetails",
                        },
                        active: {
                            $first: "$products.active",
                        },
                        productCategories: {
                            $first: "$products.productCategories",
                        },
                        productDate: {
                            $first: "$products.productDate",
                        },
                        productUpdateDate: {
                            $first: "$products.productUpdateDate",
                        },
                    }
                }
            },

            // Second Projection
            {
                $project: {
                    ...commonInclustion,
                    englishProductVariantName: {
                        $toLower: "$englishProductVariantName"
                    },
                    arabicProductVariantName: {
                        $toLower: "$arabicProductVariantName"
                    },
                    productVariantImages: {
                        $map: {
                            input: "$productVariantImages",
                            as: "productVariantImage",
                            in: {
                                path: "$$productVariantImage.path",
                                image_id: "$$productVariantImage.image_id"
                            }
                        }
                    },
                    rating: 1,
                    offerPrice: {
                        $map: {
                            input: "$offerPrices",
                            as: "offerPrice",
                            in: {
                                _id: "$$offerPrice._id",
                                discountType: "$$offerPrice.discountType",
                                discountValue: {
                                    $toDouble: "$$offerPrice.discountValue"
                                },
                                offerPrice: {
                                    $toDouble: "$$offerPrice.offerPrice"
                                },
                            }

                        }

                    },

                    brandId: 1,
                    sellerId: 1,
                    productId: 1
                }
            },

            // { $match: findQuery },

            // // Sorting
            // { $sort: sort },
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

        ]);

        const pvList = newArrivals.length ? newArrivals[0].paginatedResults : [];
        let totalCount = 0
        try {
            totalCount = newArrivals[0].totalCount[0].count
        } catch (err) { }

        return res.send({
            totalCount: totalCount,
            count: pvList.length,
            data: pvList
        })


        // return res.send({

        //     count: newArrivals.length,

        //     d: newArrivals,
        // });


    } catch (error) {
        return res.status(403).send({ message: error.message });
    }

}// End of newArrivalProducts method
const convertDateTime = (createdAt) => {
    let date = createdAt;
    let year = date.getFullYear();
    let mnth = ("0" + (date.getMonth() + 1)).slice(-2);
    let day = ("0" + date.getDate()).slice(-2);
    let hr = ("0" + date.getHours()).slice(-2);
    let min = ("0" + date.getMinutes()).slice(-2);
    let sec = ("0" + date.getSeconds()).slice(-2);

    // this.orderDate = `${year}-${mnth}-${day}T${hr}:${min}:${sec}`
    return Number(`${year}${mnth}${day}${hr}${min}${sec}`)
}
