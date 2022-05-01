let allModels = require("../../../utilities/allModels")
let { getRating } = require("../../../common/productVariantReview")
let mongoose = require("mongoose")
const { commonInclustion, filter } = require("../../utilities/filter_util");
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


exports.recommendedProducts = async (req, res) => {
    const { findQuery = {}, sort = { _id: -1 } } = filter(req);
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
    let recommended = [];
    // if (!req.userId) {
    recommended = await allModels.searchModel.find({
        customerId: req.userId
    }).select(["-_id", "searchKeyWord"]);
    //}

    let check = recommended.filter((li, idx, self) => self.map(itm => itm['searchKeyWord']).indexOf(li['searchKeyWord']) === idx);
    var temp = [];
    let RESPONSE_DATA = [];

    for (let index = 0; index < check.length; index++) {
        const el = check[index];
        let data = await allModels.productVariant.find({
            $or: [
                { "productVariantDetails.productVariantName": new RegExp(el['searchKeyWord'], "i") },
                //{ "productVariantDetails.productVariantDescription": new RegExp(el['searchKeyWord'], "i") }
            ]
        })
        temp = [...temp, ...data];
    }

    //console.log(check.length);
    RESPONSE_DATA = temp.filter((li, idx, self) => self.map(itm => itm._id).indexOf(li._id) === idx);

    let wishlistData = await allModels.wishlistModel.findOne({ customerId: req.userId })
    if (!wishlistData) {
        wishlistData = { productVariants: [] }
    } else {
        for (let index = 0; index < wishlistData['productVariants'].length; index++) {
            const el = wishlistData['productVariants'][index];
            wishlistData['productVariants'][index] = el['productVariantId']
        }
    }
    RESPONSE_DATA = [...RESPONSE_DATA, ...wishlistData['productVariants']];
    // RESPONSE.push(wishlistData['productVariants'])
    // console.log("RESPONSE", RESPONSE_DATA)

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


    let recommendedProducts = await allModels.productVariant.aggregate([
        { $match: { "_id": { $in: RESPONSE_DATA.map(data => data._id) } } },
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
    // return res.send({ count: recommendedProducts.length, data: recommendedProducts })
    const recommendedProductsList = recommendedProducts.length ? recommendedProducts[0].paginatedResults : [];
    let totalCount = 0
    try {
        totalCount = recommendedProducts[0].totalCount[0].count
    } catch (err) { }
    return res.send({ totalCount: totalCount, count: recommendedProductsList.length, data: recommendedProductsList })
}
exports.recommendedProductsFilter = async (req, res) => {
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
    let recommended = [];
    // if (!req.userId) {
    recommended = await allModels.searchModel.find({
        customerId: req.userId
    }).select(["-_id", "searchKeyWord"]);
    //}

    let check = recommended.filter((li, idx, self) => self.map(itm => itm['searchKeyWord']).indexOf(li['searchKeyWord']) === idx);
    var temp = [];
    let RESPONSE_DATA = [];

    for (let index = 0; index < check.length; index++) {
        const el = check[index];
        let data = await allModels.productVariant.find({
            $or: [
                { "productVariantDetails.productVariantName": new RegExp(el['searchKeyWord'], "i") },
                //{ "productVariantDetails.productVariantDescription": new RegExp(el['searchKeyWord'], "i") }
            ]
        })
        temp = [...temp, ...data];
    }

    //console.log(check.length);
    RESPONSE_DATA = temp.filter((li, idx, self) => self.map(itm =>
        itm._id).indexOf(li._id) === idx);

    let wishlistData = await allModels.wishlistModel.findOne({ customerId: req.userId })
    if (!wishlistData) {
        wishlistData = { productVariants: [] }
    } else {
        for (let index = 0; index < wishlistData['productVariants'].length; index++) {
            const el = wishlistData['productVariants'][index];
            wishlistData['productVariants'][index] = el['productVariantId']
        }
    }
    RESPONSE_DATA = [...RESPONSE_DATA, ...wishlistData['productVariants']];
    // RESPONSE.push(wishlistData['productVariants'])
    // console.log("RESPONSE", RESPONSE_DATA)
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
    let recommendedProducts = await allModels.productVariant.aggregate([
        { $match: { "_id": { $in: RESPONSE_DATA.map(data => data._id) } } },
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

    return res.send({ count: recommendedProducts.length, data: recommendedProducts })
}






// exports.recommendedProducts = async (req, res) => {
    
//     let recommended = [];
//     if (!req.userId) {
//         recommended = await allModels.searchModel.find({
//             deviceIdentifier: req.query.deviceIdentifier
//         }).select(["-_id", "searchKeyWord"]);
//     } else {
//         recommended = await allModels.searchModel.find({
//             customerId: req.userId
//         }).select(["-__v", "-createdAt", "-updatedAt", "-status"]).lean()
//     }

//     let check = recommended.filter((li, idx, self) => self.map(itm => itm['searchKeyWord']).indexOf(li['searchKeyWord']) === idx);


//     var temp = [];
//     let RESPONSE_DATA = [];

//     for (let index = 0; index < check.length; index++) {
//         const el = check[index];
//         let data = await allModels.productVariant.find({
//             $or: [
//                 { "productVariantDetails.productVariantName": new RegExp(el['searchKeyWord'], "i") },
//                 { "productVariantDetails.productVariantDescription": new RegExp(el['searchKeyWord'], "i") }
//             ]
//         }).populate([{
//             path: 'brandId',
//             select: ["-updatedAt", "-createdAt", "-active", "-__v", "-tags"]
//         },
//         {
//             path: 'productId',
//             select: ["-productCategories._id", "-productCategories.active", "-updatedAt", "-createdAt", "-active", "-__v", "-tags", "-adminApproval", "-activeWeb", "-activeSeller", "-brandId"],
//             populate: [
//                 {
//                     path: 'productCategories.categoryId',
//                     select: ["-active", "-__v", "-isParent", "-parentCategoryId"]
//                 }
//             ]
//         },
//         {
//             path: 'sellerId',
//             select: ["_id", "nameOfBussinessEnglish"]
//         },
//         ]).lean()

//         temp = [...temp, ...data];

//     }


//     RESPONSE_DATA = temp.filter((li, idx, self) => self.map(itm =>
//         itm._id).indexOf(li._id) === idx);


//     let wishlistData = await allModels.wishlistModel.findOne({ customerId: req.userId })
//         .populate({
//             path: 'productVariants.productVariantId',
//             select: ["-updatedAt", "-createdAt", "-active", "-shipmentWeight",
//                 "-shipmentHeight", "-shipmentLength", "-shipmentWidth",
//                 "-subscription"],
//             populate: [
//                 {
//                     path: 'brandId',
//                     select: ["-updatedAt", "-createdAt", "-active", "-__v", "-tags"]
//                 },
//                 {
//                     path: 'productId',
//                     select: ["-productCategories._id", "-productCategories.active", "-updatedAt", "-createdAt", "-active", "-__v", "-tags", "-adminApproval", "-activeWeb", "-activeSeller", "-brandId"],
//                     populate: [
//                         {
//                             path: 'productCategories.categoryId',
//                             select: ["-active", "-__v", "-isParent", "-parentCategoryId"]
//                         }
//                     ]
//                 },
//                 {
//                     path: 'sellerId',
//                     select: ["_id", "nameOfBussinessEnglish"]
//                 },
//             ]
//         }).select(["-__v", "-createdAt", "-updatedAt", "-status"]).lean()


//     if (!wishlistData) {
//         wishlistData = { productVariants: [] }
//     } else {
//         for (let index = 0; index < wishlistData['productVariants'].length; index++) {
//             const el = wishlistData['productVariants'][index];
//             wishlistData['productVariants'][index] = el['productVariantId']
//         }
//     }
//     RESPONSE_DATA = [...RESPONSE_DATA, ...wishlistData['productVariants']];

//     if (RESPONSE_DATA.length == 0) {
//         return res.status(404).send({ message: "Data not Found" })
//     }

//     let b = RESPONSE_DATA.filter(fil => {
//         return fil != null;
//     });
//     let check1 = b.filter((li, idx, self) => self.map(itm => itm['_id'].toString()).indexOf(li['_id'].toString()) === idx);
//     if (check1.length == 0) {
//         return res.status(404).send({ message: "Data not Found" })
//     }

//     for (let index = 0; index < check1.length; index++) {
//         const element = check1[index]._id;
//         check1[index].offerPrice = await allModels.offerPricingItem.find({ "productVariantId": element })
//             .select(["offerPrice", "discount", "discountType", "discountValue"])
//     }

//     let temp1 = [];
//     await getRating(check1, temp1);

//     RESPONSE_DATA = temp1.filter(a => {
//         return a['sellerId'] != null;
//     });

//     return res.send({
//         count: RESPONSE_DATA.length,
//         d: RESPONSE_DATA
//     });


// }

