let allModels = require("../../../../utilities/allModels");
let mongoose = require("mongoose")
const { validationResult } = require('express-validator');
let { getAverageRating, getRating } = require('./../../../../common/productVariantReview');
const { commonInclustion, filter } = require("../../../../utilities/filter_util");
const ObjectId = mongoose.Types.ObjectId;


exports.sameSpecsProducts = async (req, res) => {

    let productSpecs = await allModels.productVariant.aggregate([
        { $match: { active: true, adminApproval: true } },
        {
            $match: {
                $and: [
                    { "sellerId": ObjectId(req.body.sellerId) },
                    { productVariantSpecifications: { $ne: [] } },
                    { "productVariantSpecifications": { $ne: null } },
                    { "productId": ObjectId(req.body.productId) }
                ]
            }
        },
        { $unwind: "$productVariantSpecifications" },
        {
            $match: {
                productVariantSpecifications: {
                    $elemMatch: {
                        'showOnProductPage': true,
                    }
                }
            }
        },
        {
            $group: {
                _id: "$_id",
                sellerId: { $first: "$sellerId" },
                productId: { $first: "$productId" },
                productVariantDetails: { $first: "$productVariantDetails" },
                specifications: {
                    $addToSet: {
                        field: { $first: "$productVariantSpecifications.field" },
                        value: { $first: "$productVariantSpecifications.value" }
                    }
                },
                // productVariantSpecifications: { $push: "$productVariantSpecifications" }
            }
        },
        {
            $project: {
                sellerId: 1,
                specifications: 1,
                productId: 1,

                // productVariantSpecifications: 1,
                productVariantDetails: 1

            }
        }

    ]);



    return res.send({ count: productSpecs.length, data: productSpecs })


}

exports.fetchProductVariantByCategory = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
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
    const { findQuery = {}, sort = { _id: -1 } } = filter(req);
    const today = new Date();
    // today.setHours(0);
    // today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);
    let datetime = convertDateTime(today);


    // console.log(datetime)
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
    let categoryName = await allModels.category.findOne({ "_id": req.body.categoryId })
        .select(["_id", "categoryDetails"])
    //console.log("categoryName", categoryName)
    let product = await allModels.product.find({
        active: true,
        $or: [
            { "productCategories.categoryLevel1Id": req.body.categoryId },
            { "productCategories.categoryLevel2Id": req.body.categoryId },
            { "productCategories.categoryLevel3Id": req.body.categoryId },
        ]
    }).select(["_id"])
    // console.log("hi")
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
    try {
        let categoryProducts = await allModels.productVariant.aggregate([
            { $match: { "productId": { $in: product.map(data => data._id) } } },
            {
                $match: {
                    $and: [
                        { productVariantImages: { $ne: [] } },
                        { adminApproval: true },
                        { active: true }
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
            // First Projection
            {
                $project: {
                    ..._commonInclustion,
                    productNetPrice: {
                        $toDouble: "$productNetPrice"
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
                        nameOfBussinessArabic: {
                            $first: "$sellers.nameOfBussinessArabic",
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
                    ..._commonInclustion,
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
            // match
            {
                $match: {
                    ...findQuery
                }
            },
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
        const categoryProductsList = categoryProducts.length ? categoryProducts[0].paginatedResults : [];
        let totalCount = 0
        try {
            totalCount = categoryProducts[0].totalCount[0].count
        } catch (err) { }
        return res.send({ categoryName: categoryName, totalCount: totalCount, count: categoryProductsList.length, d: categoryProductsList })
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }
}

exports.categoryproductsFilter = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }


    try {
        let filter = {};
        let { category, categoryId } = req.query
        if (category && !mongoose.Types.ObjectId.isValid(category)) {
            return res.status(403).send({ message: "Invalid category id" });
        }
        if (category && mongoose.Types.ObjectId.isValid(category)) {
            filter = {
                $or: [
                    { 'categories._id': mongoose.Types.ObjectId(category) },
                    { 'categoriesLevel2._id': mongoose.Types.ObjectId(category) },
                    { 'categoriesLevel3._id': mongoose.Types.ObjectId(category) }
                ]
            }
        }
        let product = await allModels.product.find({
            active: true,
            $or: [
                { "productCategories.categoryLevel1Id": req.query.categoryId },
                { "productCategories.categoryLevel2Id": req.query.categoryId },
                { "productCategories.categoryLevel3Id": req.query.categoryId },
            ]
        }).select(["_id"])
        // console.log("hi")
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
        let categoryProducts = await allModels.productVariant.aggregate([
            { $match: { "productId": { $in: product.map(data => data._id) } } },
            {
                $match: {
                    $and: [
                        { productVariantImages: { $ne: [] } },
                        { adminApproval: true },
                        { active: true }
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
            { $match: filter },
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
                    ..._commonInclustion,
                    productNetPrice: {
                        $toDouble: "$productNetPrice"
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
                    ..._commonInclustion,
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

                    sellerId: 1,
                    productId: 1,
                    categoryLevel1Id: 1,
                    categoryLevel2Id: 1,
                    categoryLevel3Id: 1,
                    brandId: 1,
                }
            },

            {
                $group: {
                    _id: null,
                    products: { $addToSet: { $first: "$products" } },
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

        return res.send({ count: categoryProducts.length, d: categoryProducts })
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }

}

exports.getProductVariants = async (req, res, next) => {
    let productVariant = await allModels.productVariant.find()
        .populate([
            {
                path: 'productId',
                select: ["_id", "productDetails", "brandId", "productCategories"],
                populate: [
                    {
                        path: 'brandId',
                        select: ["_id", "brandDetails"]
                    },
                    {
                        path: 'productCategories.categoryId',
                        select: ["_id", "categoryDetails"]
                    }
                ]
            },
            {
                path: 'sellerId',
                select: ["_id", "nameOfBussinessEnglish", "nameOfBussinessArabic"]
            },
        ]).select(["-createdAt", "-__v", "-updatedAt"])
        .lean()

    if (productVariant.length == 0) {
        return res.send({ count: 0, d: productVariant });
    }

    let temp = [];
    await getRating(productVariant, temp);

    let RESPONSE_DATA = temp.filter(a => {
        return a['sellerId'] != null;
    });
    for (let index = 0; index < productVariant.length; index++) {
        const element = productVariant[index]._id;
        productVariant[index].offerPrice = await allModels.offerPricingItem.find({ "productVariantId": element })
            .select(["offerPrice", "discount", "discountType", "discountValue"])
    }


    return res.send({ count: RESPONSE_DATA.length, d: RESPONSE_DATA })
}

exports.getProductVariantsBybrand = async (req, res, next) => {
    let brandId = req.query.brandId;
    var valid = mongoose.Types.ObjectId.isValid(brandId);

    if (!valid) {
        return res.status(402).send({ message: "Invalid brand id" });
    }
    let productVariant = await allModels.productVariant.find({
        brandId: brandId,
    }).populate([{
        path: 'productId',
        select: ["_id", "productDetails", "brandId", "productCategories"],
        populate: [
            {
                path: 'brandId',
                select: ["_id", "brandDetails"]
            },
            {
                path: 'productCategories.categoryId',
                select: ["_id", "categoryDetails"]
            }],
    },

    {
        path: 'sellerId',
        select: ["_id", "nameOfBussinessEnglish", "nameOfBussinessArabic"]
    }
    ]
    )
        .select(["-__v", "-createdAt", "-updatedAt", "-active", "-subscription"])
        .lean()
    //console.log(productVariant)

    if (productVariant.length == 0) {
        return res.send({ message: "There was no product found with given information!" })
    }
    let temp = [];
    await getRating(productVariant, temp);
    let RESPONSE_DATA = temp.filter(a => {
        return a['sellerId'] != null;
    });

    for (let index = 0; index < productVariant.length; index++) {
        const element = productVariant[index]._id;
        productVariant[index].offerPrice = await allModels.offerPricingItem.find({ "productVariantId": element })
            .select(["offerPrice", "discount", "discountType", "discountValue"])
    }
    return res.send({ count: RESPONSE_DATA.length, d: RESPONSE_DATA })
    //return res.send({ count: productVariant.length, data: productVariant })
}

exports.singleProductvariant = async (req, res, next) => {
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
        inventoryQuantity: 1,
        inventoryReOrderQuantity: 1,
        inventoryReOrderQuantity: 1,
        shipmentWidth: 1,
        shipmentLength: 1,
        shipmentHeight: 1,
        shipmentWeight: 1,
        trending: 1
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

    try {
        let products = await allModels.productVariant.aggregate([
            { $match: { "_id": mongoose.Types.ObjectId(req.params.id) } },
            { $match: { active: true, adminApproval: true } },
            // Joining brands
            {
                $lookup: {
                    from: "brands",
                    localField: "brandId",
                    foreignField: "_id",
                    as: "brands"
                }
            },
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
                    localField: "products.productCategories.categoryLevel2Id",
                    foreignField: "_id",
                    as: "categories"
                }
            },
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
            // First Projection
            {
                $project: {
                    ..._commonInclustion,
                    productNetPrice: {
                        $toDouble: "$productNetPrice"
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
                    },
                    categoryIdLevel2:
                    {
                        _id: {
                            $first: "$categories._id",
                        },

                        productDetails: {
                            $first: "$categories.categoryDetails",
                        },
                        active: {
                            $first: "$products.active",
                        },
                    }
                }
            },
            {
                $project: {
                    ..._commonInclustion,
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
                    productId: 1,
                    categoryIdLevel2: 1,
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
                    inventoryQuantity: { $first: "$inventoryQuantity" },
                    inventoryReOrderQuantity: { $first: "$inventoryReOrderQuantity" },
                    categoryIdLevel2: { $first: "$categoryIdLevel2" },
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
                    shipmentWidth: { $first: "$shipmentWidth" },
                    shipmentLength: { $first: "$shipmentLength" },
                    shipmentHeight: { $first: "$shipmentHeight" },
                    shipmentWeight: { $first: "$shipmentWeight" },
                    active: { $first: "$active" },
                }
            },
            {
                $addFields: {
                    offerPrice: {
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
                    ..._commonInclustion,
                    productVariantImages: 1,
                    rating: 1,
                    offerPrice:{$first:"$offerPrice"},
                    brandId: 1,
                    sellerId: 1,
                    productId: 1,
                    productId: 1,
                    categoryIdLevel2: 1,
                }
            },
        ])

        if (products.length <= 0) {
            return res.status(403).send({ message: "Product not found" });
        }
        return res.send({ data: products });
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }

}
// {
//     $lookup: {
//         from: "brands",
//         localField: "brandId",
//         foreignField: "_id",
//         as: "brands"
//     }
// },
// {
//     $lookup: {
//         from: "products",
//         localField: "productId",
//         foreignField: "_id",
//         as: "products"
//     }
// },
// {
//     $lookup: {
//         from: "categories",
//         localField: "products.productCategories.categoryLevel2Id",
//         foreignField: "_id",
//         as: "categories"
//     }
// },
// {
//     $lookup: {
//         from: "sellers",
//         localField: "sellerId",
//         foreignField: "_id",
//         as: "sellers"
//     }
// },
// {
//     $lookup: {
//         from: "productvarientreviews",
//         localField: "_id",
//         foreignField: "productVariantId",
//         as: "productvarientreviews"
//     }
// },
// {
//     $lookup: {
//         from: "offerpricings",
//         let: { sellerId: "$sellerId" },
//         pipeline: [{ $match: offerFilter }],
//         as: "offerPricing",
//     }
// },
// {
//     $lookup: {
//         from: "offerpricingitems",
//         let: { pvId: "$_id", offerId: { $first: "$offerPricing._id" } },
//         pipeline: [{ $match: offerPricingFilter }],
//         as: "offerpricingitems",
//     },
// },
// {
//     $project: {
//         ..._commonInclustion,
//         productNetPrice: {
//             $toDouble: "$productNetPrice"
//         },

//         productVariantImages: {
//             $filter: {
//                 input: "$productVariantImages",
//                 as: "productVariantImage",
//                 cond: {
//                     $eq: ["$$productVariantImage.active", true],
//                 }
//             }
//         },


//         rating: {
//             averageRate: {
//                 $avg: "$productvarientreviews.rating"
//             },
//             totalReview: {
//                 $size: "$productvarientreviews"
//             }
//         },
//         offer: "$offerPricing",
//         offerPrices: "$offerpricingitems",

//         brandId: {
//             $first: "$brands",
//         },
//         sellerId: {
//             _id: {
//                 $first: "$sellers._id",
//             },
//             nameOfBussinessEnglish: {
//                 $first: "$sellers.nameOfBussinessEnglish",
//             },
//             nameOfBussinessArabic: {
//                 $first: "$sellers.nameOfBussinessArabic",
//             },
//         },
//         productId: {
//             _id: {
//                 $first: "$products._id",
//             },
//             productSpecifications: {
//                 $first: "$products.productSpecifications",
//             },
//             productDetails: {
//                 $first: "$products.productDetails",
//             },
//             active: {
//                 $first: "$products.active",
//             },
//             productCategories: {
//                 $first: "$products.productCategories",
//             },
//             productDate: {
//                 $first: "$products.productDate",
//             },
//             productUpdateDate: {
//                 $first: "$products.productUpdateDate",
//             },
//         },
//         categoryIdLevel2:
//         {
//             _id: {
//                 $first: "$categories._id",
//             },

//             productDetails: {
//                 $first: "$categories.categoryDetails",
//             },
//             active: {
//                 $first: "$products.active",
//             },
//         }
//     }
// },
// {
//     $project: {
//         ..._commonInclustion,
//         productVariantImages: {
//             $map: {
//                 input: "$productVariantImages",
//                 as: "productVariantImage",
//                 in: {
//                     path: "$$productVariantImage.path",
//                     image_id: "$$productVariantImage.image_id"
//                 }
//             }
//         },
//         rating: 1,
//         offerPricing: {
//             $map: {
//                 input: "$offerPrices",
//                 as: "offerPrice",
//                 in: {
//                     $cond: {
//                         if: { $in: ["$$offerPrice.offerpricingId", "$offer._id"] },
//                         then: {
//                             _id: "$$offerPrice._id",
//                             offerPricingId: "$$offerPrice.offerpricingId",
//                             discountType: "$$offerPrice.discountType",
//                             discountValue: {
//                                 $toDouble: "$$offerPrice.discountValue"
//                             },
//                             offerPrice: {
//                                 $toDouble: "$$offerPrice.offerPrice"
//                             },
//                         },
//                         else: {}
//                     }
//                 }
//             }
//         },

//         brandId: 1,
//         sellerId: 1,
//         productId: 1,
//         categoryIdLevel2: 1,
//     }
// },
// {
//     $project: {
//         ..._commonInclustion,
//         productVariantImages: 1,
//         rating: 1,
//         offerPrice: {
//             // $push: {
//             // $first: {
//             $filter: {
//                 input: "$offerPricing",
//                 as: "offerPricing",
//                 cond: { $ne: ["$$offerPricing", {}] }
//             }
//             // }
//             // }
//         },
//         brandId: 1,
//         sellerId: 1,
//         productId: 1,
//         productId: 1,
//         categoryIdLevel2: 1,
//     }
// },
exports.getProductVariantByCategory = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {
        let categoryId = req.query.id;
        var valid = mongoose.Types.ObjectId.isValid(categoryId);

        if (!valid) {
            return res.status(402).send({ message: "Invalid category id" });
        }
        let category = await allModels.category.findOne({
            "_id": categoryId
        }).select(["_id", "categoryDetails.c_language", "categoryDetails.categoryName"]);

        //console.log(category);

        let product = await allModels.product.find({
            "productCategories.categoryId": categoryId
        }).select(["_id"])

        let pvarinat = await allModels.productVariant.find({ productId: product })
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
                    path: "sellerId", select: ["nameOfBussinessEnglish", "nameOfBussinessArabic", "_id"]
                }])
            .select(["-__v", "-createdAt", "-updatedAt"]).lean()



        if (pvarinat.length == 0) {
            return res.send({ count: 0, d: pvarinat });
        }

        let temp = [];
        await getRating(pvarinat, temp);

        let RESPONSE_DATA = temp.filter(a => {
            return a['sellerId'] != null;
        });

        for (let index = 0; index < pvarinat.length; index++) {
            const element = pvarinat[index]._id;
            pvarinat[index].offerPrice = await allModels.offerPricingItem.find({ "productVariantId": element })
                .select(["offerPrice", "discount", "discountType", "discountValue"])
        }

        return res.send({ count: RESPONSE_DATA.length, d: RESPONSE_DATA, categoryName: category['categoryDetails'] })

    }

    catch (error) {
        return res.status(403).send({ message: error.message });

    }

}

exports.getProductVariantBySellerAndCategory = async (req, res) => {

    let brandid = req.params.brandid;
    const isValid = mongoose.Types.ObjectId.isValid(brandid);

    if (!isValid) {
        return res.status(402).send({ message: "Invalid brand id" });
    } else {
        brandid = mongoose.Types.ObjectId(brandid);
    }

    let { limit, page, categoryId, productId } = req.body;
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

    let sort = { indexNo: -1 };

    let findQuery = {
        "productId.active": true
    };

    if (categoryId) {
        categoryId = mongoose.Types.ObjectId(categoryId)
        findQuery['productCategories'] = {
            $elemMatch: { "categoryLevel1Id": categoryId }
        }
        /* [
                    { "productCategories.categoryLevel1Id": {$in:[categoryId]} }
                ] */
    }

    if (productId) {
        productId = mongoose.Types.ObjectId(productId)
        findQuery['productId._id'] = productId

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

    let product = await allModels.productVariant.find({
        $and: [
            { productVariantImages: { $ne: [] } },
            { active: true },
            { sellerId: brandid }
        ]
    }).select(["productId"])
        .distinct("productId");

    let categoryList = await allModels.product.find({ _id: product, active: true })
        .select(["productId"])
        .populate([{ path: "_id", select: ["productCategories"] }])
        .distinct("productCategories.categoryLevel1Id");

    let category = await allModels.category.find({ _id: categoryList, active: true })
        .select(["categoryDetails", "categoryThumbnailImage", "indexNo"]);


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
                { $lt: ["$startDate", datetime] },
                { $gt: ["$endDate", datetime] }
            ]
        }
    }

    let pv = await allModels.productVariant.aggregate([
        {
            $match: {
                $and: [
                    { productVariantImages: { $ne: [] } },
                    { active: true },
                    { adminApproval: true },
                    { sellerId: brandid }
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

        // First Projection
        {
            $project: {
                ..._commonInclustion,
                productNetPrice: {
                    $toDouble: "$productNetPrice"
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
                    nameOfBussinessEnglish: {
                        $first: "$sellers.nameOfBussinessEnglish",
                    },
                    nameOfBussinessArabic: {
                        $first: "$sellers.nameOfBussinessArabic",
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
                },
                productCategories: {
                    $first: "$products.productCategories",
                },
            }
        },

        // Second Projection
        {
            $project: {
                ..._commonInclustion,
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
                productId: 1,
                productCategories: 1
            }
        },

        // Third Projection
        {
            $project: {
                ..._commonInclustion,
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
                productId: 1,
                productCategories: 1
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

    //console.log(pv[0].paginatedResults);
    const pvList = pv.length ? pv[0].paginatedResults : [];
    let totalCount = 0
    try {
        totalCount = pv[0].totalCount[0].count
    } catch (err) { }

    return res.send({
        totalCount: totalCount,
        count: pvList.length,
        data: pvList,
        categoryList: category,
    })

}

const convertDateTime = (createdAt) => {
    let date = createdAt;
    let year = date.getFullYear();
    let mnth = ("0" + (date.getMonth() + 1)).slice(-2);
    let day = ("0" + date.getDate()).slice(-2);
    let hr = ("0" + date.getHours()).slice(-2);
    let min = ("0" + date.getMinutes()).slice(-2);
    let sec = ("0" + date.getSeconds()).slice(-2);

    return Number(`${year}${mnth}${day}${hr}${min}${sec}`)
}

exports.allOfferproducts = async (req, res, next) => {

    try {
        const validationError = validationResult(req);
        if (!validationError.isEmpty()) {
            return res.status(403).send({ message: validationError.array() });
        }

        let { sellerId, limit, page } = req.body
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

        let seller = mongoose.Types.ObjectId(sellerId);

        const today = new Date();
        today.setHours(0);
        today.setMinutes(0);
        today.setSeconds(0);
        today.setMilliseconds(0);
        let datetime = convertDateTime(today);

        // console.log(datetime)
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
                    "productVariantImages": { $first: "$productVariantImages" },
                    "promotionVideo": { $first: "$promotionVideo" },
                    "sellerId": { $first: "$sellerId" },
                    "sellerDetails": { $first: "$sellerDetails" },
                    // "sellerId": { $first: "$sellerId" },

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
                    "offerPrice": { $push: "$offerpricingitems" }

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
        return res.send({ totalCount: totalCount, count: productvariantList.length, data: productvariantList });


    } catch (error) {
        return res.status(403).send({ message: error.message })
    }

}
// End of offerproducts method

exports.offerProducts = async (req, res) => {
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
    const { findQuery = {}, sort = { _id: -1 } } = filter(req);
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
                $and: [
                    { productVariantImages: { $ne: [] } },
                    { adminApproval: true },
                    { active: true }
                ]

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
    let offerProducts = await allModels.productVariant.aggregate([
        { $match: { "_id": { $in: productvariant.map(data => data._id) } } },
        {
            $match: {
                $and: [
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
    const offerProductsList = offerProducts.length ? offerProducts[0].paginatedResults : [];
    let totalCount = 0
    try {
        totalCount = offerProducts[0].totalCount[0].count
    } catch (err) { }
    return res.send({ totalCount: totalCount, count: offerProductsList.length, d: offerProductsList })

    // return res.send({ count: offerProducts.length, data: offerProducts })
}

exports.offerSalesproductFilter = async (req, res) => {
    const _commonInclustion = {
        active: 1,
        adminApproval: 1,
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
        inventoryQuantity: 1,
        inventoryReOrderQuantity: 1,
        inventoryReOrderQuantity: 1,
        shipmentWidth: 1,
        shipmentLength: 1,
        shipmentHeight: 1,
        shipmentWeight: 1,
        trending: 1
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
                $and: [
                    { productVariantImages: { $ne: [] } },
                    { adminApproval: true },
                    { active: true }
                ]

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
    let filter = {};
    let { category } = req.query
    if (category && !mongoose.Types.ObjectId.isValid(category)) {
        return res.status(403).send({ message: "Invalid category id" });
    }
    if (category && mongoose.Types.ObjectId.isValid(category)) {
        filter = {
            $or: [
                { 'categories._id': mongoose.Types.ObjectId(category) },
                { 'categoriesLevel2._id': mongoose.Types.ObjectId(category) },
                { 'categoriesLevel3._id': mongoose.Types.ObjectId(category) }
            ]
        }
    }

    let offerProducts = await allModels.productVariant.aggregate([
        { $match: { "_id": { $in: productvariant.map(data => data._id) } } },
        {
            $match: {
                $and: [
                    { adminApproval: true },
                    { active: true }
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
        { $match: filter },
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
                ..._commonInclustion,
                productNetPrice: {
                    $toDouble: "$productNetPrice"
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
                ..._commonInclustion,
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
                brandId: 1,
                // productFinalPrice: 1
            }
        },
        {
            $group: {
                _id: null,
                products: { $addToSet: { $first: "$products" } },
                categoryLevel1: { $addToSet: "$categoryLevel1Id" },
                categoryLevel2: { $addToSet: "$categoryLevel2Id" },
                categoryLevel3: { $addToSet: "$categoryLevel3Id" },
                brands: { $addToSet: "$brandId" },
                //  categories: { $addToSet: "$productId.productCategories.categoryLevel1Id" },
                price: { $addToSet: "$productNetPrice" },
                // productFinalPrice: { $addToSet: "$productFinalPrice" }
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
                },

            },
        }

    ])
    return res.send({ count: offerProducts.length, data: offerProducts })
}
