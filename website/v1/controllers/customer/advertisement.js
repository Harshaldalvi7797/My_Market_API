let allModels = require("../../../../utilities/allModels");
const { trim } = require('lodash');
const { validationResult } = require('express-validator');
let mongoose = require("mongoose");
let { getRating } = require("../../../../common/productVariantReview")
const { commonInclustion, filter } = require("../../../../utilities/filter_util");

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

exports.advertisement = async (req, res) => {
    try {
        const today = new Date();
        // today.setHours(0);
        // today.setMinutes(0);
        today.setSeconds(0);
        today.setMilliseconds(0);

        let datetime = convertDateTime(today);

        let regexSearch = new RegExp(req.query.advertisingType, "i");
        let filter = {
            '$and': [
                { "active": true },
                { "adminApproval": true },
                { "startDateTime1": { $lte: datetime } },
                { "endDateTime1": { $gte: datetime } },
                { "advertisingpricings.advertisingType": regexSearch },
                // { "tapPaymentDetails._id": { $ne: null } },
                {
                    $or: [
                        { "tapPaymentDetails._id": { $ne: null } },
                        { adminId: { $ne: null } }
                    ]
                }
            ]
        }
        // console.log(JSON.stringify(filter))

        let lookUpandConditions = [
            {
                $lookup: {
                    from: "advertisingpricings",
                    localField: "typeOfAdvertisement",
                    foreignField: "_id",
                    as: "advertisingpricings"
                }
            },
            { $match: filter }
        ];

        let advertiseCount = await allModels.advertisementCampaign.aggregate(lookUpandConditions)
        let advertise = await allModels.advertisementCampaign.aggregate([
            ...lookUpandConditions,
            { $sample: { size: advertiseCount.length } },
            // {
            //     $project: {
            //         indexNo: 1
            //     }
            // }
        ])

        return res.send({ count: advertise.length, data: advertise })
    }
    catch (error) {
        return res.status(422).send({ error: error.message });
    }

}

exports.advertisementProductList = async (req, res) => {

    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let advertiseId = req.body.advertiseId;
    var valid = mongoose.Types.ObjectId.isValid(advertiseId);

    if (!valid) {
        return res.status(402).send({ message: "There was no advertise found with given information!" });
    }

    let advertise = await allModels.advertisementCampaign.findOne({
        _id: req.body.advertiseId
    }).populate([
        { path: 'whatToPromote.promotionType', select: ['name', "isId"] },
        { path: 'typeOfAdvertisement' },
    ]).select(["whatToPromote", "typeOfAdvertisement", "sellerId", "name"]);

    //console.log(products.whatToPromote)
    if (!advertise) {
        return res.send({ message: "There was no advertise found with given information!" })
    }


    let totalCount = 0

    const today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);
    let datetime = convertDateTime(today);

    // console.log(products.whatToPromote.promotionType.name.toUpperCase(), products.typeOfAdvertisement);
    // console.log(products.whatToPromote.id)

    let whatToPromoteId = advertise.whatToPromote.id;
    let RESPONSE = []


    if (advertise.whatToPromote.promotionType.name.toUpperCase() == 'CATEGORY' && whatToPromoteId) {

        let category = await allModels.category.findOne({ "_id": whatToPromoteId })
        if (!category) {
            return res.status(403).send({ message: "Advertisement category not found" });
        }
        const today = new Date();
        today.setHours(0);
        today.setMinutes(0);
        today.setSeconds(0);
        today.setMilliseconds(0);
        let product = await allModels.product.find({
            active: true,
            $or: [
                { "productCategories.categoryLevel1Id": category._id },
                { "productCategories.categoryLevel2Id": category._id },
                { "productCategories.categoryLevel3Id": category._id },
            ]
        }).select(["_id"])
        let offerPricingFilter = {
            $expr: {
                $and: [
                    { $eq: ["$active", true] },
                    { $eq: ["$offerpricingId", "$$offerId"] },
                    { $ne: [[], "$$offerId"] },
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
        const { findQuery = {}, sort = { indexNo: -1 } } = filter(req);

        let { limit, page, search } = req.body;
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
        let categoryProducts = await allModels.productVariant.aggregate([
            { $match: { "productId": { $in: product.map(data => data._id) } } },
            { $match: { active: true, adminApproval: true } },
            {
                $match: {
                    $and: [
                        { productVariantImages: { $ne: [] } },
                        { sellerId: advertise.sellerId }
                        // { "sellerId": advertise.sellerId }

                    ]
                }
            },
            // Joining offerpricingitems
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

                    offerPrices: {
                        $cond: {
                            if: {
                                $eq: ["$offerpricingitems.offerPriceAmount", []]
                            },
                            then: [],
                            else: {
                                $cond: {
                                    if: {
                                        $eq: [{ $first: "$offerpricingitems.discountType" }, "flat"]
                                    },
                                    then: [{
                                        offerPriceAmount: { $first: "$offerpricingitems.offerPriceAmount" },
                                        discountType: { $first: "$offerpricingitems.discountType" },
                                        discountValue: { $toDouble: { $first: "$offerpricingitems.discountValue" } },
                                        offerPrice: { $first: "$offerpricingitems.offerPrice" },
                                        discountPercentage: {
                                            $divide: [
                                                {
                                                    $multiply: [{ $toDouble: { $first: "$offerpricingitems.discountValue" } }, 100]
                                                },
                                                { $sum: [{ $toDouble: { $first: "$offerpricingitems.offerPrice" } }, { $toDouble: { $first: "$offerpricingitems.offerPriceAmount" } }] }
                                            ]
                                        }
                                    }],
                                    else: [{
                                        offerPriceAmount: { $first: "$offerpricingitems.offerPriceAmount" },
                                        discountType: { $first: "$offerpricingitems.discountType" },
                                        discountValue: { $toDouble: { $first: "$offerpricingitems.discountValue" } },
                                        offerPrice: { $first: "$offerpricingitems.offerPrice" },
                                        discountPercentage: { $toDouble: { $first: "$offerpricingitems.discountValue" } }
                                    }]
                                }
                            }
                        }
                    },
                    productFinalPrice: {
                        $cond: {
                            if: {
                                $eq: ["$offerpricingitems.offerPriceAmount", []]
                            },
                            then: { $toDouble: "$productNetPrice" },
                            else: { $toDouble: { $first: "$offerpricingitems.offerPrice" } }
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
                        nameOfBussinessArabic:{
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
                    productFinalPrice: 1,
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
            { $match: findQuery },
            // Sorting
            { $sort: sort },
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
        const pvList = categoryProducts.length ? categoryProducts[0].paginatedResults : [];
        let totalCount = 0
        try {
            totalCount = categoryProducts[0].totalCount[0].count
        } catch (err) { }

        return res.send({
            totalCount: totalCount,
            count: pvList.length,
            data: pvList
        })

    } else if (advertise.whatToPromote.promotionType.name.toUpperCase() == 'OFFERS') {



        let offer = await allModels.offerPricing.findOne({ "_id": whatToPromoteId })
        if (!offer) {
            return res.status(403).send({ message: "Advertisement offer not found" });
        }

        let offerItem = await allModels.offerPricingItem.find({ "offerpricingId": offer._id })
            .select(["productVariantId"])

        //  return res.send({ count: offerItem.length, data: offerItem })

        let offerPricingFilter = {
            $expr: {
                $and: [
                    { $eq: ["$active", true] },
                    { $eq: ["$offerpricingId", "$$offerId"] },
                    { $ne: [[], "$$offerId"] },
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
        const { findQuery = {}, sort = { indexNo: -1 } } = filter(req);

        let { limit, page, search } = req.body;
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


        let categoryProducts = await allModels.productVariant.aggregate([
            { $match: { "_id": { $in: offerItem.map(data => data.productVariantId) } } },
            { $match: { active: true, adminApproval: true } },
            {
                $match: {
                    $and: [
                        { productVariantImages: { $ne: [] } },
                        { sellerId: advertise.sellerId }
                        // { "sellerId": advertise.sellerId }

                    ]
                }
            },
            // Joining offerpricingitems
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

                    offerPrices: {
                        $cond: {
                            if: {
                                $eq: ["$offerpricingitems.offerPriceAmount", []]
                            },
                            then: [],
                            else: {
                                $cond: {
                                    if: {
                                        $eq: [{ $first: "$offerpricingitems.discountType" }, "flat"]
                                    },
                                    then: [{
                                        offerPriceAmount: { $first: "$offerpricingitems.offerPriceAmount" },
                                        discountType: { $first: "$offerpricingitems.discountType" },
                                        discountValue: { $toDouble: { $first: "$offerpricingitems.discountValue" } },
                                        offerPrice: { $first: "$offerpricingitems.offerPrice" },
                                        discountPercentage: {
                                            $divide: [
                                                {
                                                    $multiply: [{ $toDouble: { $first: "$offerpricingitems.discountValue" } }, 100]
                                                },
                                                { $sum: [{ $toDouble: { $first: "$offerpricingitems.offerPrice" } }, { $toDouble: { $first: "$offerpricingitems.offerPriceAmount" } }] }
                                            ]
                                        }
                                    }],
                                    else: [{
                                        offerPriceAmount: { $first: "$offerpricingitems.offerPriceAmount" },
                                        discountType: { $first: "$offerpricingitems.discountType" },
                                        discountValue: { $toDouble: { $first: "$offerpricingitems.discountValue" } },
                                        offerPrice: { $first: "$offerpricingitems.offerPrice" },
                                        discountPercentage: { $toDouble: { $first: "$offerpricingitems.discountValue" } }
                                    }]
                                }
                            }
                        }
                    },
                    productFinalPrice: {
                        $cond: {
                            if: {
                                $eq: ["$offerpricingitems.offerPriceAmount", []]
                            },
                            then: { $toDouble: "$productNetPrice" },
                            else: { $toDouble: { $first: "$offerpricingitems.offerPrice" } }
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
                        nameOfBussinessArabic:{
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
                    productFinalPrice: 1,
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

            { $match: findQuery },
            // Sorting
            { $sort: sort },
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
        const pvList = categoryProducts.length ? categoryProducts[0].paginatedResults : [];
        let totalCount = 0
        try {
            totalCount = categoryProducts[0].totalCount[0].count
        } catch (err) { }

        return res.send({
            totalCount: totalCount,
            count: pvList.length,
            data: pvList
        })






    }




}

exports.advertisementProductFilterData = async (req, res) => {

    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let advertiseId = req.query.advertiseId;
    var valid = mongoose.Types.ObjectId.isValid(advertiseId);

    if (!valid) {
        return res.status(402).send({ message: "There was no advertise found with given information!" });
    }

    let advertise = await allModels.advertisementCampaign.findOne({
        _id: req.query.advertiseId
    }).populate([
        { path: 'whatToPromote.promotionType', select: ['name', "isId"] },
        { path: 'typeOfAdvertisement' },
    ]).select(["whatToPromote", "typeOfAdvertisement", "sellerId", "name"]);

    //console.log(products.whatToPromote)
    if (!advertise) {
        return res.send({ message: "There was no advertise found with given information!" })
    }


    let totalCount = 0

    const today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);
    let datetime = convertDateTime(today);



    let whatToPromoteId = advertise.whatToPromote.id;



    if (advertise.whatToPromote.promotionType.name.toUpperCase() == 'CATEGORY' && whatToPromoteId) {

        let adCategory = await allModels.category.findOne({ "_id": whatToPromoteId })
        if (!adCategory) {
            return res.status(403).send({ message: "Advertisement category not found" });
        }
        const today = new Date();
        today.setHours(0);
        today.setMinutes(0);
        today.setSeconds(0);
        today.setMilliseconds(0);
        let product = await allModels.product.find({
            active: true,
            $or: [
                { "productCategories.categoryLevel1Id": adCategory._id },
                { "productCategories.categoryLevel2Id": adCategory._id },
                { "productCategories.categoryLevel3Id": adCategory._id },
            ]
        }).select(["_id"])
        let offerPricingFilter = {
            $expr: {
                $and: [
                    { $eq: ["$active", true] },
                    { $eq: ["$offerpricingId", "$$offerId"] },
                    { $ne: [[], "$$offerId"] },
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



        let filter1 = {};
        let { category } = req.query
        if (category && !mongoose.Types.ObjectId.isValid(category)) {
            return res.status(403).send({ message: "Invalid category id" });
        }
        if (category && mongoose.Types.ObjectId.isValid(category)) {
            filter1 = {
                $or: [
                    { 'categories._id': mongoose.Types.ObjectId(category) },
                    { 'categoriesLevel2._id': mongoose.Types.ObjectId(category) },
                    { 'categoriesLevel3._id': mongoose.Types.ObjectId(category) }
                ]
            }
        }

        let categoryProducts = await allModels.productVariant.aggregate([
            { $match: { "productId": { $in: product.map(data => data._id) } } },
            { $match: { active: true, adminApproval: true } },
            {
                $match: {
                    $and: [
                        { productVariantImages: { $ne: [] } },
                        { sellerId: advertise.sellerId }
                        // { "sellerId": advertise.sellerId }

                    ]
                }
            },
            // Joining offerpricingitems
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
            // Joining products
            {
                $lookup: {
                    from: "products",
                    localField: "productId",
                    foreignField: "_id",
                    as: "products"
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "products.productCategories.categoryLevel1Id",
                    foreignField: "_id",
                    as: "categories"
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "products.productCategories.categoryLevel2Id",
                    foreignField: "_id",
                    as: "categoriesLevel2"
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "products.productCategories.categoryLevel3Id",
                    foreignField: "_id",
                    as: "categoriesLevel3"
                }
            },
            { $match: filter1 },
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
                    productNetPrice: {
                        $toDouble: "$productNetPrice"
                    },
                    tags: "$tags",
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
                        nameOfBussinessArabic:{
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
                    },
                    categoryLevel1Id:
                    {
                        _id: {
                            $first: "$categories._id",
                        },
                        categoryDetails: {
                            $first: "$categories.categoryDetails",
                        },
                    },
                    categoryLevel2Id:
                    {
                        _id: {
                            $first: "$categoriesLevel2._id",
                        },
                        categoryDetails: {
                            $first: "$categoriesLevel2.categoryDetails",
                        },
                    },
                    categoryLevel3Id:
                    {
                        _id: {
                            $first: "$categoriesLevel3._id",
                        },
                        categoryDetails: {
                            $first: "$categoriesLevel3.categoryDetails",
                        },
                    },
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
                    productId: 1,
                    categoryLevel1Id: 1,
                    categoryLevel2Id: 1,
                    categoryLevel3Id: 1,
                }
            },
            {
                $group: {
                    _id: null,
                    // products: { $addToSet: { $first: "$products" } },
                    categoryLevel1: { $addToSet: "$categoryLevel1Id" },
                    categoryLevel2: { $addToSet: "$categoryLevel2Id" },
                    categoryLevel3: { $addToSet: "$categoryLevel3Id" },
                    brands: { $addToSet: "$brandId" },
                    //  categories: { $addToSet: "$productId.productCategories.categoryLevel1Id" },
                    price: { $addToSet: "$productNetPrice" }
                }
            },
            {
                $project: {
                    // products: 1,
                    brands: 1,
                    categoryLevel1: {
                        $filter: {
                            input: "$categoryLevel1",
                            as: "categoryLevel1",
                            cond: { $ne: ["$$categoryLevel1", {}] }
                        }
                    },
                    categoryLevel2: {
                        $filter: {
                            input: "$categoryLevel2",
                            as: "categoryLevel2",
                            cond: { $ne: ["$$categoryLevel2", {}] }
                        }
                    },
                    categoryLevel3: {
                        $filter: {
                            input: "$categoryLevel3",
                            as: "categoryLevel3",
                            cond: { $ne: ["$$categoryLevel3", {}] }
                        }
                    },
                    pricing: {
                        min: { $min: "$price" },
                        max: { $max: "$price" }
                    }
                },
            }


        ])

        return res.send({ count: categoryProducts.length, data: categoryProducts })


    }
    else if (advertise.whatToPromote.promotionType.name.toUpperCase() == 'OFFERS') {

        let filter1 = {};
        let { category } = req.query
        if (category && !mongoose.Types.ObjectId.isValid(category)) {
            return res.status(403).send({ message: "Invalid category id" });
        }
        if (category && mongoose.Types.ObjectId.isValid(category)) {
            filter1 = {
                $or: [
                    { 'categories._id': mongoose.Types.ObjectId(category) },
                    { 'categoriesLevel2._id': mongoose.Types.ObjectId(category) },
                    { 'categoriesLevel3._id': mongoose.Types.ObjectId(category) }
                ]
            }
        }
        let offer = await allModels.offerPricing.findOne({ "_id": whatToPromoteId })
        if (!offer) {
            return res.status(403).send({ message: "Advertisement offer not found" });
        }

        let offerItem = await allModels.offerPricingItem.find({ "offerpricingId": offer._id })
            .select(["productVariantId"])


        let offerPricingFilter = {
            $expr: {
                $and: [
                    { $eq: ["$active", true] },
                    { $eq: ["$offerpricingId", "$$offerId"] },
                    { $ne: [[], "$$offerId"] },
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

        let categoryProducts = await allModels.productVariant.aggregate([
            { $match: { "_id": { $in: offerItem.map(data => data.productVariantId) } } },
            { $match: { active: true, adminApproval: true } },
            {
                $match: {
                    $and: [
                        { productVariantImages: { $ne: [] } },
                        { sellerId: advertise.sellerId }
                        // { "sellerId": advertise.sellerId }

                    ]
                }
            },
            // Joining offerpricingitems
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
            {
                $lookup: {
                    from: "categories",
                    localField: "products.productCategories.categoryLevel1Id",
                    foreignField: "_id",
                    as: "categories"
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "products.productCategories.categoryLevel2Id",
                    foreignField: "_id",
                    as: "categoriesLevel2"
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "products.productCategories.categoryLevel3Id",
                    foreignField: "_id",
                    as: "categoriesLevel3"
                }
            },
            { $match: filter1 },
            // Joining sellers
            {
                $lookup: {
                    from: "sellers",
                    localField: "sellerId",
                    foreignField: "_id",
                    as: "sellers"
                }
            },
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
                    productNetPrice: {
                        $toDouble: "$productNetPrice"
                    },
                    tags: "$tags",
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
                        nameOfBussinessArabic:{
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
                    },
                    categoryLevel1Id:
                    {
                        _id: {
                            $first: "$categories._id",
                        },
                        categoryDetails: {
                            $first: "$categories.categoryDetails",
                        },
                    },
                    categoryLevel2Id:
                    {
                        _id: {
                            $first: "$categoriesLevel2._id",
                        },
                        categoryDetails: {
                            $first: "$categoriesLevel2.categoryDetails",
                        },
                    },
                    categoryLevel3Id:
                    {
                        _id: {
                            $first: "$categoriesLevel3._id",
                        },
                        categoryDetails: {
                            $first: "$categoriesLevel3.categoryDetails",
                        },
                    },
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
                    productId: 1,
                    categoryLevel1Id: 1,
                    categoryLevel2Id: 1,
                    categoryLevel3Id: 1,
                }
            },
            {
                $group: {
                    _id: null,
                    // products: { $addToSet: { $first: "$products" } },
                    categoryLevel1: { $addToSet: "$categoryLevel1Id" },
                    categoryLevel2: { $addToSet: "$categoryLevel2Id" },
                    categoryLevel3: { $addToSet: "$categoryLevel3Id" },
                    brands: { $addToSet: "$brandId" },
                    //  categories: { $addToSet: "$productId.productCategories.categoryLevel1Id" },
                    price: { $addToSet: "$productNetPrice" }
                }
            },
            {
                $project: {
                    // products: 1,
                    brands: 1,
                    categoryLevel1: {
                        $filter: {
                            input: "$categoryLevel1",
                            as: "categoryLevel1",
                            cond: { $ne: ["$$categoryLevel1", {}] }
                        }
                    },
                    categoryLevel2: {
                        $filter: {
                            input: "$categoryLevel2",
                            as: "categoryLevel2",
                            cond: { $ne: ["$$categoryLevel2", {}] }
                        }
                    },
                    categoryLevel3: {
                        $filter: {
                            input: "$categoryLevel3",
                            as: "categoryLevel3",
                            cond: { $ne: ["$$categoryLevel3", {}] }
                        }
                    },
                    pricing: {
                        min: { $min: "$price" },
                        max: { $max: "$price" }
                    }
                },
            }

        ])
        return res.send({ count: categoryProducts.length, data: categoryProducts })
    }
}

exports.advertiseProductFilter = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let advertiseId = req.body.advertiseId;
    var valid = mongoose.Types.ObjectId.isValid(advertiseId);

    if (!valid) {
        return res.status(402).send({ message: "There was no advertise found with given information!" });
    }

    let products = await allModels.advertisementCampaign.findOne({
        _id: req.body.advertiseId
    }).populate([
        { path: 'whatToPromote.promotionType', select: ['name', "isId"] },
        { path: 'typeOfAdvertisement' },
    ]).select(["whatToPromote", "typeOfAdvertisement", "sellerId", "name"]);

    //console.log(products.whatToPromote)
    if (!products) {
        return res.send({ message: "There was no advertise found with given information!" })
    }


    let totalCount = 0

    const today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);
    let datetime = convertDateTime(today);

    // console.log(products.whatToPromote.promotionType.name.toUpperCase(), products.typeOfAdvertisement);
    // console.log(products.whatToPromote.id)

    let whatToPromoteId = products.whatToPromote.id;
    let RESPONSE = []
    if (products.whatToPromote.promotionType.name.toUpperCase() == 'PRODUCT' && whatToPromoteId) {//productvariant

        // console.log(whatToPromoteId, products.sellerId);
        let productvariant = await allModels.productVariant.aggregate([
            {
                $match: {
                    $and: [
                        { _id: whatToPromoteId },
                        { sellerId: products.sellerId, }
                    ]

                }
            },
            { $match: { active: true, adminApproval: true } },
            {
                $lookup: {
                    from: "offerpricings",
                    localField: "sellerId",
                    foreignField: "sellerId",
                    as: "offerpricings",
                }
            },
            {
                $lookup: {
                    from: "offerpricingitems",
                    localField: "offerpricings._id",
                    foreignField: "offerpricingId",
                    as: "offerpricingitems",
                }
            },
            // { $unwind: "$offerpricingitems" },
            {
                $match: {
                    $and: [
                        { "offerpricingitems.active": true },
                        { "offerpricings.startDate": { $lt: datetime } },
                        { "offerpricings.endDate": { $gt: datetime } }
                    ]
                }
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
                    "offerPrice": { $first: "$offerpricingitems" },
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
        if (!productvariant) {
            return res.status(403).send({ message: "Advertisement product not found" });
        }
        // console.log(productvariant);
        if (productvariant.length > 0) {
            let temp = [];
            await getRating(productvariant, temp);
            productvariant = temp;
        }
        // try {
        //     totalCount = productvariant[0].totalCount[0].count
        // } catch (err) { }


        RESPONSE = productvariant

    } else if (products.whatToPromote.promotionType.name.toUpperCase() == 'BRAND' && whatToPromoteId) {

        let seller = await allModels.seller.findOne({ "_id": whatToPromoteId });
        //console.log(seller._id);
        if (!seller) {
            return res.status(403).send({ message: "Advertisement brand not found" });
        }

        let productvariant = await allModels.productVariant.aggregate([
            {
                $match: {
                    $and: [
                        { status: true },
                        { adminApproval: true },
                        { sellerId: seller._id, }
                    ]

                }
            },
            {
                $lookup: {
                    from: "offerpricings",
                    localField: "sellerId",
                    foreignField: "sellerId",
                    as: "offerpricings",
                }
            },
            {
                $lookup: {
                    from: "offerpricingitems",
                    localField: "offerpricings._id",
                    foreignField: "offerpricingId",
                    as: "offerpricingitems",
                }
            },
            // { $unwind: "$offerpricingitems" },
            {
                $match: {
                    $and: [
                        { "offerpricingitems.active": true },
                        { "offerpricings.startDate": { $lt: datetime } },
                        { "offerpricings.endDate": { $gt: datetime } }
                    ]
                }
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
                    "offerPrice": { $first: "$offerpricingitems" },
                }
            }
        ]);

        if (productvariant.length > 0) {
            let temp = [];
            await getRating(productvariant, temp);
            productvariant = temp;
        }
        // console.log(productvariant)
        RESPONSE = productvariant

    } else if (products.whatToPromote.promotionType.name.toUpperCase() == 'CATEGORY' && whatToPromoteId) {

        let category = await allModels.category.findOne({ "_id": whatToPromoteId })
        if (!category) {
            return res.status(403).send({ message: "Advertisement category not found" });
        }
        // console.log(category)
        let products = await allModels.product.aggregate([
            {
                $match: {
                    active: true,
                    $or: [
                        { "productCategories.categoryLevel1Id": category._id },
                        { "productCategories.categoryLevel2Id": category._id },
                        { "productCategories.categoryLevel3Id": category._id },
                    ]
                }
            },
            {
                $lookup: {
                    from: "productvariants",
                    localField: "_id",
                    foreignField: "productId",
                    as: "productVariants",
                }
            },
            { $unwind: "$productVariants" },
            {
                $lookup: {
                    from: "offerpricings",
                    localField: "productVariants.sellerId",
                    foreignField: "sellerId",
                    as: "offerpricings",
                }
            },
            {
                $lookup: {
                    from: "offerpricingitems",
                    localField: "offerpricings._id",
                    foreignField: "offerpricingId",
                    as: "offerpricingitems",
                }
            },
            // { $unwind: "$offerpricingitems" },
            {
                $match: {
                    $and: [
                        { "productVariants.active": true },
                        { "offerpricingitems.active": true },
                        { "offerpricings.startDate": { $lt: datetime } },
                        { "offerpricings.endDate": { $gt: datetime } }
                    ]
                }
            },
            {
                $group: {
                    _id: "$productVariants._id",
                    "productVariantImages": { $first: "$productVariants.productVariantImages" },
                    "promotionVideo": { $first: "$productVariants.promotionVideo" },
                    "sellerId": { $first: "$productVariants.sellerId" },
                    "adminId": { $first: "$productVariants.adminId" },
                    "productVariantDetails": { $first: "$productVariants.productVariantDetails" },
                    "internationalShippingPrice": { $first: "$productVariants.internationalShippingPrice" },
                    "domesticShippingPrice": { $first: "$productVariants.domesticShippingPrice" },
                    "additionalCod": { $first: "$productVariants.additionalCod" },
                    "active": { $first: "$productVariants.active" },
                    "currency": { $first: "$productVariants.currency" },
                    "productId": { $first: "$productVariants.productId" },
                    "brandId": { $first: "$productVariants.brandId" },
                    "productSKU": { $first: "$productVariants.productSKU" },
                    "productGrossPrice": { $first: "$productVariants.productGrossPrice" },
                    "productNetPrice": { $first: "$productVariants.productNetPrice" },
                    "productTaxPercentage": { $first: "$productVariants.productTaxPercentage" },
                    "productTaxPrice": { $first: "$productVariants.productTaxPrice" },
                    "orderQuantityMax": { $first: "$productVariants.orderQuantityMax" },
                    "orderQuantityMin": { $first: "$productVariants.orderQuantityMin" },
                    "inventoryQuantity": { $first: "$productVariants.inventoryQuantity" },
                    "inventoryReOrderLevel": { $first: "$productVariants.inventoryReOrderLevel" },
                    "inventoryReOrderQuantity": { $first: "$productVariants.inventoryReOrderQuantity" },
                    "shipmentWidth": { $first: "$productVariants.shipmentWidth" },
                    "shipmentLength": { $first: "$productVariants.shipmentLength" },
                    "shipmentHeight": { $first: "$productVariants.shipmentHeight" },
                    "shipmentWeight": { $first: "$productVariants.shipmentWeight" },
                    "subscription": { $first: "$productVariants.subscription" },
                    "subscriptionPrice": { $first: "$productVariants.subscriptionPrice" },
                    "subscriptionPriceWithoutTax": { $first: "$productVariants.subscriptionPriceWithoutTax" },
                    "subscriptionTaxAmount": { $first: "$productVariants.subscriptionTaxAmount" },
                    "savingPercentage": { $first: "$productVariants.savingPercentage" },
                    "codConveniencePrice": { $first: "$productVariants.codConveniencePrice" },
                    "createdAt": { $first: "$productVariants.createdAt" },
                    "updatedAt": { $first: "$productVariants.updatedAt" },
                    "createdDate": { $first: "$productVariants.createdDate" },
                    "updatedDate": { $first: "$productVariants.updatedDate" },
                    "indexNo": { $first: "$productVariants.indexNo" },
                    "adminApproval": { $first: "$productVariants.adminApproval" },
                    "productVariantSpecifications": { $first: "$productVariants.productVariantSpecifications" },
                    "offerPrice": { $first: "$offerpricingitems" },
                }
            }
        ]);

        // console.log(products);
        if (products.length > 0) {
            let temp = [];
            await getRating(products, temp);
            products = temp;
        }

        RESPONSE = products;

    } else if (products.whatToPromote.promotionType.name.toUpperCase() == 'OFFERS') {
        let offer = await allModels.offerPricing.findOne({ "_id": whatToPromoteId })
        if (!offer) {
            return res.status(403).send({ message: "Advertisement offer not found" });
        }

        let offerItem = await allModels.offerPricingItem.find({ "offerpricingId": offer._id })
        if (offerItem.length == 0) {
            RESPONSE = [];
        } else {
            let products = await allModels.productVariant.aggregate([
                {
                    $match: {
                        $and: [
                            { active: true }, { adminApproval: true },
                            { _id: { $in: offerItem.map(data => data.productVariantId) } }
                        ]

                    }
                },

                {
                    $lookup: {
                        from: "offerpricings",
                        localField: "sellerId",
                        foreignField: "sellerId",
                        as: "offerpricings",
                    }
                },
                {
                    $lookup: {
                        from: "offerpricingitems",
                        localField: "offerpricings._id",
                        foreignField: "offerpricingId",
                        as: "offerpricingitems",
                    }
                },
                // { $unwind: "$offerpricingitems" },
                {
                    $match: {
                        $and: [
                            { "offerpricingitems.active": true },
                            { "offerpricings.startDate": { $lt: datetime } },
                            { "offerpricings.endDate": { $gt: datetime } }
                        ]
                    }
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
                        "offerPrice": { $first: "$offerpricingitems" },
                    }
                }
            ]).catch(err => {
                console.log(err.message);
            });

            if (products.length > 0) {
                let temp = [];
                await getRating(products, temp);
                products = temp;
            }

            RESPONSE = products;
        }
    } else if (products.whatToPromote.promotionType.name.toUpperCase() == 'NEW ARRIVAL') {
        let seller = await allModels.seller
            .findOne({ "_id": whatToPromoteId })
        if (!seller) {
            return res.status(403).send({ message: "Invalid brand selected for new arrival" });
        }
        RESPONSE = { brand: seller._id }
    }

    const pvList = RESPONSE.length ? RESPONSE[0].paginatedResults : [];


    // return res.send({
    //     totalCount: totalCount,
    //      count: pvList.length,
    //     data: pvList
    // })

    return res.send({ count: RESPONSE.length, data: RESPONSE })


}