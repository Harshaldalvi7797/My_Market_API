let allModels = require("../../../../utilities/allModels")
const { validationResult } = require('express-validator')
let { getRating } = require("../../../../common/productVariantReview");
let { getFilterCategories, getFilterBrands, getFilterPriceRange, getFilterColor } = require("../../middlewares/filterOptions");
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

exports.webSimilarProducts = async (req, res) => {
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
    let product = await allModels.product.find({
        "active": true,
        "productCategories.categoryLevel2Id": req.body.categoryId
    })
    const today = new Date();
    // today.setHours(0);
    // today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);
    let datetime = convertDateTime(today);
    //.select(["_id"])
    //console.log("hi",typeof product)
    // return res.send({ count: product.length, data: product })
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
    let categoryProducts = await allModels.productVariant.aggregate([
        { $match: { "productId": { $in: product.map(data => data._id) } } },
        {
            $match: {
                $and: [
                    { productVariantImages: { $ne: [] } },
                    { active: true },
                    { adminApproval: true },
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

    const categoryProductsList = categoryProducts.length ? categoryProducts[0].paginatedResults : [];
    let totalCount = 0
    try {
        totalCount = categoryProducts[0].totalCount[0].count
    } catch (err) { }
    return res.send({ totalCount: totalCount, count: categoryProductsList.length, d: categoryProductsList })


}