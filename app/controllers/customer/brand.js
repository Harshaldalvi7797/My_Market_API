// Third party package
const expressPaginationHelper = require("express-pagination-helper");

let allModels = require("../../../utilities/allModels");
const { validationResult } = require('express-validator')
let mongoose = require("mongoose")
let { getRating } = require('../../../common/productVariantReview');
const { ObjectId } = mongoose.Types;
const { commonInclustion, filter } = require("../../utilities/filter_util");

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
    today.setHours(0);
    today.setMinutes(0);
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
                { $lt: ["$startDate", datetime] },
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
        {
            $lookup: {
                from: "offerpricings",
                let: { sellerId: "$sellerId" },
                pipeline: [{ $match: offerFilter }],
                as: "offerpricings",
            }
        },
        { $sort: { "offerpricings.endDateTime": -1 } },
        {
            $lookup: {
                from: "offerpricingitems",
                let: { pvId: "$_id", offerId: { $first: "$offerpricings._id" } },
                pipeline: [{ $match: offerPricingFilter }],
                as: "offerpricingitems",
            },
        },
        { $unwind: "$offerpricings" },
        { $unwind: "$offerpricingitems" },
        {
            $lookup: {
                from: "sellers",
                localField: "sellerId",
                foreignField: "_id",
                as: "sellers"
            }
        },
        {
            $group: {
                _id: "$_id",


            }
        },
    ])

    // return res.send({ count: productvariant.length, data: productvariant })
    let offerProducts = await allModels.productVariant.aggregate([
        { $match: { "_id": { $in: productvariant.map(data => data._id) } } },
        {
            $match: {
                $and: [
                    { productVariantImages: { $ne: [] } },
                    { adminApproval: true },
                    { active: true }
                ]
            }
        },
        // Joining offerpricingitems
        {
            $lookup: {
                from: "offerpricings",
                let: { sellerId: "$sellerId" },
                pipeline: [{ $match: offerFilter }],
                as: "offerpricings",
            }
        },
        {
            $lookup: {
                from: "offerpricingitems",
                let: { pvId: "$_id", offerId: { $first: "$offerpricings._id" } },
                pipeline: [{ $match: offerPricingFilter }],
                as: "offerpricingitems",
            },
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

                offer: "$offerpricings",
                offerPrices: "$offerpricingitems",
                brandId: {
                    $first: "$brands",
                },
                sellerId: {
                    _id: {
                        $first: "$sellers._id",
                    },
                    nameOfBussiness: {
                        $first: "$sellers.nameOfBussinessEnglish",
                    }
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

                offerPricing: {
                    $map: {
                        input: "$offerPrices",
                        as: "offerPrice",
                        in: {
                            $cond: {
                                if: { $in: ["$$offerPrice.offerpricingId", "$offer._id"] },
                                then: {
                                    _id: "$$offerPrice._id",
                                    offerPricingId: "$$offerPrice.offerpricingId",
                                    discountType: "$$offerPrice.discountType",
                                    discountValue: {
                                        $toDouble: "$$offerPrice.discountValue"
                                    },
                                    offerPrice: {
                                        $toDouble: "$$offerPrice.offerPrice"
                                    },
                                },
                                else: {}
                            }
                        }
                    }
                },
                brandId: 1,
                sellerId: 1,
                productId: 1
            }
        },
        // Third Projection
        {
            $project: {
                ...commonInclustion,
                englishProductVariantName: 1,
                arabicProductVariantName: 1,
                productVariantImages: 1,
                rating: 1,
                offerPrice: {
                    // $push: {
                    // $first: {
                    $filter: {
                        input: "$offerPricing",
                        as: "offerPricing",
                        cond: { $ne: ["$$offerPricing", {}] }
                    }
                    // }
                    // }
                },
                brandId: 1,
                sellerId: 1,
                productId: 1
            }
        },
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

        // Sorting
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


    ])
    const offerProductsList = offerProducts.length ? offerProducts[0].paginatedResults : [];
    let totalCount = 0
    try {
        totalCount = offerProducts[0].totalCount[0].count
    } catch (err) { }
    return res.send({ totalCount: totalCount, count: offerProductsList.length, data: offerProductsList })




    // return res.send({ count: productvariant.length, data: productvariant })
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
    try {
        let seller = await allModels.seller.find()
            .collation({ 'locale': 'en' })
            .select(['sellerDetails', 'nameOfBussinessEnglish', 'nameOfBussinessArabic', 'profileImage', 'bussinessCoverImage'])
            .sort([['nameOfBussinessEnglish', '1']])

        return res.send({ message: "data", count: seller.length, seller })
    }
    catch (error) {
        return error.message

    }
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
            productVariant[index].offerPrice = await allModels.offerPricingItem.find({ "productVariantId": element })
                .select(["offerPrice", "discount", "discountType", "discountValue"])
        }

        return res.send({ message: "data", count: productVariant.length, productVariant })
    }
    catch (error) {
        return error.message
    }
}

exports.productvariantsOfBrandsBySellerId = async (req, res) => {
    try {
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
        // .select(['productVariantDetails', 'productVariantImages', 'productGrossPrice', 'productNetPrice', 'productTaxPercentage',
        //     'productTaxPrice'])
        // console.log(productVariant)

        for (let index = 0; index < productVariant.length; index++) {
            const element = productVariant[index]._id;
            productVariant[index].offerPrice = await allModels.offerPricingItem.find({ "productVariantId": element })
                .select(["offerPrice", "discount", "discountType", "discountValue"])
        }
        return res.send({ message: "data", count: productVariant.length, d: productVariant })
    }
    catch (error) {
        return error
    }
}

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



exports.getTopSelling = async (req, res) => {
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
        // const orders = await allModels.orderItems.aggregate([
        //     { $match: { sellerId: mongoose.Types.ObjectId(sellerId) } },
        //     {
        //         $group: {
        //             _id: "$productVariantId",
        //             totalSales: { $sum: 1 },
        //         },
        //     },
        //     { $sort: { totalSales: -1 } },
        //     {
        //         $lookup: {
        //             from: "productvariants",
        //             localField: "_id",
        //             foreignField: "_id",
        //             as: "productVariant",
        //         }
        //     },
        //     {
        //         $match: {
        //             $and: [

        //                 { "productVariant.adminApproval": true },
        //                 { "productVariant.active": true }
        //             ]
        //         }
        //     },
        //     { $unwind: { path: "$productVariant" } },
        //     {
        //         $lookup: {
        //             from: "offerpricings",
        //             let: {
        //                 sellerId: "$productVariant.sellerId"
        //             },
        //             pipeline: [
        //                 {
        //                     $match: offerFilter
        //                 }
        //             ],
        //             as: "offerpricings",
        //         }
        //     },
        //     {
        //         $lookup: {
        //             from: "offerpricingitems",
        //             let: {
        //                 pvId: "$productVariant._id", offerId: { $first: "$offerpricings._id" }
        //             },
        //             pipeline: [
        //                 {
        //                     $match: offerPricingFilter
        //                 }
        //             ],
        //             as: "offerpricingitems",
        //         },
        //     },
        //     {
        //         $lookup: {
        //             from: "productvarientreviews",
        //             localField: "_id",
        //             foreignField: "productVariantId",
        //             as: "reviews",
        //         }
        //     },
        //     {
        //         $addFields: {
        //             "productVariant.offer": "$offerpricingitems",
        //             "productVariant.rating": {
        //                 "averageRate": { $avg: "$reviews.rating" },
        //                 "totalReview": { $size: "$reviews" }
        //             }
        //         }
        //     },
        //     {
        //         $project: {
        //             _id: 1,
        //             productVariant: 1,
        //         }
        //     },
        //     {
        //         $project: {
        //             "productVariant.offer.__v": 0,
        //             "productVariant.offer._id": 0,
        //             "productVariant.offer.active": 0,
        //             "productVariant.offer.offerpricingId": 0,
        //             "productVariant.offer.productVariantId": 0,
        //             "productVariant.offer.createdAt": 0,
        //             "productVariant.offer.updatedAt": 0,
        //             "productVariant.offer.createdDate": 0,
        //             "productVariant.offer.updatedDate": 0,
        //         }
        //     },
        //     {
        //         $limit: 20,
        //     },
        //     {
        //         $facet: {
        //             paginatedResults: [
        //                 {
        //                     $skip: (perPage * pageNo),
        //                 },
        //                 {
        //                     $limit: perPage,
        //                 },
        //             ],
        //             totalCount: [
        //                 {
        //                     $count: "count",
        //                 },
        //             ],
        //         },
        //     },

        // ])
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
    // try {
    //     let sellerId = req.query.sellerId;
    //     var valid = mongoose.Types.ObjectId.isValid(sellerId);

    //     if (!valid) {
    //         return res.status(402).send({ message: "Invalid seller id" });
    //     }
    //     const orders = await allModels.orderItems.aggregate([
    //         {
    //             $match: {
    //                 $and: [
    //                     { "sellerId": mongoose.Types.ObjectId(sellerId) }
    //                 ]
    //             }
    //         },
    //         {
    //             $group: {
    //                 _id: "$productVariantId",
    //                 totalSales: { $sum: 1 },
    //             },
    //         },
    //         { $sort: { totalSales: -1 } },
    //         {
    //             $limit:
    //                 !req.query.limit || req.query.limit == 0
    //                     ? 5
    //                     : parseInt(req.query.limit),
    //         },

    //     ]);

    //     let result = await allModels.productVariant
    //         .populate(orders, {
    //             path: "_id"
    //         })

    //     if (result.length == 0) {
    //         return res.send({ count: 0, d: result });
    //     }

    //     let temp = [];
    //     await getRating(result, temp);


    //     for (let index = 0; index < temp.length; index++) {
    //         const element = temp[index]._id;
    //         temp[index].offerPrice = await allModels.offerPricingItem.find({ "productVariantId": element })
    //             .select(["offerPrice", "discount", "discountType", "discountValue"])
    //     }
    //     //console.log(temp)
    //     let RESPONSE_DATA = temp
    //     // console.log(temp)
    //     return res.send({ count: RESPONSE_DATA.length, result: RESPONSE_DATA })
    //     //return res.send({ count: filter.length, result: filter });
    // } catch (error) {
    //     return res.status(500).send({ message: error.message });
    // }
};

exports.followedBrand = async (req, res, next) => {

    const followedBrand = await allModels.customer_seller_follow.aggregate([
        { $match: { customerId: ObjectId(req.userId) } },

        {
            $lookup: {
                from: "sellers",
                localField: "sellerId",
                foreignField: "_id",
                as: "seller"
            }
        },
        {
            $project: {
                customerId: 1, sellerId: 1,
                sellerDetails: { $first: { $first: "$seller.sellerDetails" } },
            },
        },
        {
            $project: {
                customerId: 1, sellerId: 1,
                sellerDetails: {
                    name: { $concat: ["$sellerDetails.sellerfName", " ", "$sellerDetails.sellerfName"] },
                    sellerVatCertified: "$sellerDetails.sellerVatCertified"
                },
            }
        }
    ]);

    return res.status(followedBrand.length ? 200 : 204).json({ data: followedBrand });
}

exports.allCategories = async (req, res) => {
    let sellerId = req.query.sellerId;
    var valid = mongoose.Types.ObjectId.isValid(sellerId);

    if (!valid) {
        return res.status(402).send({ message: "Invalid seller id" });
    }

    let productVariant = await allModels.productVariant.find({ sellerId: sellerId })
        .select(["productId"])
        .populate({
            path: "productId",
            select: ["productCategories"],
            populate: [
                { path: "productCategories.categoryId", select: ['-isParent', '-active', '-__v'] },
            ]
        });

    // console.log(productVariant)
    let data = [];
    productVariant.forEach((e, index) => {
        if (e['productId'].productCategories.length > 0) {
            //console.log(e);
            e['productId'].productCategories.forEach(cat => {
                //console.log(JSON.stringify(cat.categoryId));
                let value = cat.categoryId.categoryDetails[0].categoryName;
                if (JSON.stringify(data).indexOf(value) == -1) {
                    data.push(cat.categoryId);
                }
            })
        }

        if (index == (productVariant.length - 1)) {
            return res.send({ count: data.length, data: data })
        }
    })
}

exports.offerproducts = async (req, res, next) => {

    try {
        const { page_number = 1, data_per_page = 10 } = req.query;

        const offset = (+page_number - 1) * +data_per_page;

        const { findQuery = {}, sort = { _id: -1 } } = filter(req);

        const today = new Date();
        today.setHours(0);
        today.setMinutes(0);
        today.setSeconds(0);
        today.setMilliseconds(0);

        const datetime = convertDateTime(today);

        const offerPricingItem = await allModels.offerPricingItem.aggregate([
            // match
            {
                $match: { active: true }
            },
            // lookup offerpricings
            {
                $lookup: {
                    from: "offerpricings",
                    localField: "offerpricingId",
                    foreignField: "_id",
                    as: "offerPricings"
                }
            },
            // project
            {
                $project: {
                    productVariantId: 1, discountType: 1,
                    discountValue: { $toDouble: "$discountValue" },
                    offerPrice: { $toDouble: "$offerPrice" },
                    offerPricings: {
                        $filter: {
                            input: "$offerPricings",
                            as: "offerPricing",
                            cond: {
                                $and: [
                                    { $eq: ["$$offerPricing.active", true] },
                                    { $lt: ["$$offerPricing.startDate", datetime] },
                                    { $gt: ["$$offerPricing.endDate", datetime] },
                                ]
                            }
                        }
                    }
                }
            },
            // match
            {
                $match: {
                    offerPricings: { $ne: [] }
                }
            },
            // lookup productvariants
            {
                $lookup: {
                    from: "productvariants",
                    localField: "productVariantId",
                    foreignField: "_id",
                    as: "productVariants"
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
                    active: { $first: "$productVariants.active" },
                    productNetPrice: {
                        $toDouble: { $first: "$productVariants.productNetPrice" }
                    },
                    englishProductVariantName: {
                        $arrayElemAt: [{ $first: "$productVariants.productVariantDetails.productVariantName" }, 0]
                    },
                    arabicProductVariantName: {
                        $arrayElemAt: [{ $first: "$productVariants.productVariantDetails.productVariantName" }, 1]
                    },
                    productVariantImages: {
                        $filter: {
                            input: { $first: "$productVariants.productVariantImages" },
                            as: "productVariantImage",
                            cond: {
                                $eq: ["$$productVariantImage.active", true],
                            }
                        }
                    },
                    tags: {
                        $first: "$productVariants.tags"
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
                        discountType: "$discountType",
                        discountValue: "$discountValue",
                        offerPrice: "$offerPrice",
                    },
                    brandId: {
                        $first: "$brands",
                    },
                    sellerId: {
                        _id: {
                            $first: "$sellers._id",
                        },
                        nameOfBussiness: {
                            $first: "$sellers.nameOfBussinessEnglish",
                        }
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
                    offerPrice: "$offerPrices",
                    brandId: 1,
                    sellerId: 1,
                    productId: 1
                }
            },
            // Match
            {
                $match: {
                    productVariantImages: { $ne: [] },
                    ...findQuery
                }
            },
            // Sorting
            { $sort: sort },
            // facet
            {
                $facet: {
                    metadata: [{ $count: 'total' }],
                    data: [
                        { $skip: offset },
                        { $limit: +(data_per_page) || 10 }
                    ]
                },
            },
            // Third Project
            {
                $project: {
                    total_data_count: {
                        $first: "$metadata.total"
                    },
                    data: 1,
                }
            },

        ]);

        const { total_data_count = 0, data = [] } = offerPricingItem[0] || {};

        const pagination = expressPaginationHelper({
            req: req,
            total_data_count,
            page_number: page_number,
            data_per_page
        });

        return res.json({
            totalCount: total_data_count,
            count: data.length,
            pagination,
            data: data
        });


    } catch (error) {
        return res.status(403).send({ message: error.message })
    }

}// End of offerproducts method


// exports.sellerOfferProducts = async (req, res, next) => {
//     const validationError = validationResult(req);
//     if (!validationError.isEmpty()) {
//         return res.status(403).send({ message: validationError.array() });
//     }

//     let { sellerId, limit, page } = req.query
//     //pagination
//     if (!limit) { limit = 10 }
//     if (!page) { page = 1 }

//     let perPage = parseInt(limit)
//     let pageNo = Math.max(0, parseInt(page))

//     if (pageNo > 0) {
//         pageNo = pageNo - 1;
//     } else if (pageNo < 0) {
//         pageNo = 0;
//     }

//     const today = new Date();
//     today.setHours(0);
//     today.setMinutes(0);
//     today.setSeconds(0);
//     today.setMilliseconds(0);
//     let datetime = convertDateTime(today);

//     let seller = mongoose.Types.ObjectId(sellerId);

//     let productvariant = await allModels.productVariant.aggregate([
//         {
//             $match: {
//                 $and: [
//                     { active: true },
//                     { adminApproval: true },
//                     { sellerId: seller }
//                 ]

//             }
//         },
//         {
//             $lookup: {
//                 from: "offerpricingitems",
//                 localField: "_id",
//                 foreignField: "productVariantId",
//                 as: "offerpricingitems",
//             }
//         },
//         {
//             $lookup: {
//                 from: "offerpricings",
//                 localField: "offerpricingitems.offerpricingId",
//                 foreignField: "_id",
//                 as: "offerpricings",
//             }
//         },
//         { $unwind: "$offerpricings" },
//         { $unwind: "$offerpricingitems" },
//         {
//             $match: {
//                 $and: [
//                     { "offerpricingitems.active": true },
//                     { "offerpricings.active": true },
//                     { "offerpricings.startDate": { $lt: datetime } },
//                     { "offerpricings.endDate": { $gt: datetime } }
//                 ]
//             }
//         },
//         {
//             $group: {
//                 _id: "$_id",
//                 "productVariantImages": { $first: "$productVariantImages" },
//                 "promotionVideo": { $first: "$promotionVideo" },
//                 "sellerId": { $first: "$sellerId" },
//                 "adminId": { $first: "$adminId" },
//                 "productVariantDetails": { $first: "$productVariantDetails" },
//                 "internationalShippingPrice": {
//                     $first: "$internationalShippingPrice"
//                 },
//                 "domesticShippingPrice": { $first: "$domesticShippingPrice" },
//                 "additionalCod": { $first: "$additionalCod" },
//                 "active": { $first: "$active" },
//                 "currency": { $first: "$currency" },
//                 "productId": { $first: "$productId" },
//                 "brandId": { $first: "$brandId" },
//                 "productSKU": { $first: "$productSKU" },
//                 "productGrossPrice": { $first: "$productGrossPrice" },
//                 "productNetPrice": { $first: "$productNetPrice" },
//                 "productTaxPercentage": { $first: "$productTaxPercentage" },
//                 "productTaxPrice": { $first: "$productTaxPrice" },
//                 "orderQuantityMax": { $first: "$orderQuantityMax" },
//                 "orderQuantityMin": { $first: "$orderQuantityMin" },
//                 "inventoryQuantity": { $first: "$inventoryQuantity" },
//                 "inventoryReOrderLevel": { $first: "$inventoryReOrderLevel" },
//                 "inventoryReOrderQuantity": {
//                     $first: "$inventoryReOrderQuantity"
//                 },
//                 "shipmentWidth": { $first: "$shipmentWidth" },
//                 "shipmentLength": { $first: "$shipmentLength" },
//                 "shipmentHeight": { $first: "$shipmentHeight" },
//                 "shipmentWeight": { $first: "$shipmentWeight" },
//                 "subscription": { $first: "$subscription" },
//                 "subscriptionPrice": {
//                     $first: "$subscriptionPrice"
//                 },
//                 "subscriptionPriceWithoutTax": {
//                     $first: "$subscriptionPriceWithoutTax"
//                 },
//                 "subscriptionTaxAmount": { $first: "$subscriptionTaxAmount" },
//                 "savingPercentage": { $first: "$savingPercentage" },
//                 "codConveniencePrice": { $first: "$codConveniencePrice" },
//                 "createdAt": { $first: "$createdAt" },
//                 "updatedAt": { $first: "$updatedAt" },
//                 "createdDate": { $first: "$createdDate" },
//                 "updatedDate": { $first: "$updatedDate" },
//                 "indexNo": { $first: "$indexNo" },
//                 "adminApproval": { $first: "$adminApproval" },
//                 "productVariantSpecifications": {
//                     $first: "$productVariantSpecifications"
//                 },
//                 "offerprice": { $push: "$offerpricingitems" }

//             }
//         },
//         {
//             $facet: {
//                 paginatedResults: [
//                     {
//                         $skip: (perPage * pageNo),
//                     },
//                     {
//                         $limit: perPage,
//                     },
//                 ],
//                 totalCount: [
//                     {
//                         $count: "count",
//                     },
//                 ],
//             },
//         },
//     ]);

//     let productvariantList = productvariant.length ? productvariant[0].paginatedResults : [];
//     if (productvariantList.length > 0) {
//         let temp = [];
//         await getRating(productvariantList, temp);
//         productvariantList = temp;
//     }

//     let totalCount = 0
//     try {
//         totalCount = productvariant[0].totalCount[0].count
//     } catch (err) { }
//     return res.send({ totalCount: totalCount, count: productvariantList.length, data: productvariantList });
// }

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
