let allModels = require("../../utilities/allModels")
let mongoose = require("mongoose")
const { commonInclustion, filter } = require("../../utilities/filter_util");

exports.trendingProducts = async (req, res, next) => {
    try {
        const { findQuery = {}, sort = { indexNo: -1 } } = filter(req);

        if (sort['_id']) {
            delete sort['_id'];
        }
        sort["trending.serialNo"] = 1;

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

        let topSelling = await topSellingProducts();
        // console.log(topSelling.map(data => data._id));

        const today = new Date();
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

        // console.log(JSON.stringify(sort))
        // console.log("=======================")
        // console.log(JSON.stringify(findQuery))

        const trendingProducts = await allModels.productVariant.aggregate([
            { $match: { active: true, adminApproval: true } },
            // match
            {
                $match: {
                    $or: [
                        { _id: { $in: topSelling.map(data => data._id) } }, // data from orderItem
                        { "trending.isTrending": true } //added by admin
                    ]
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

            // Match
            {
                $match: {
                    productVariantImages: { $ne: [] },
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

        ]);
        let pvList = trendingProducts.length ? trendingProducts[0].paginatedResults : [];
        let totalCount = 0
        try {
            totalCount = trendingProducts[0].totalCount[0].count
        } catch (err) { }

        return res.send({
            totalCount: totalCount,
            count: pvList.length,
            data: pvList
        })

    } catch (error) {
        return res.status(403).send({ message: error.message });
    }

    // try {
    //     const { findQuery = {}, sort = { indexNo: -1 } } = filter(req);

    //     if (sort['_id']) {
    //         delete sort['_id'];
    //     }
    //     sort["trending.serialNo"] = 1;

    //     let { limit, page } = req.body;
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

    //     let topSelling = await topSellingProducts();
    //     // console.log(topSelling.map(data => data._id));

    //     const today = new Date();
    //     //today.setHours(0);
    //     //today.setMinutes(0);
    //     today.setSeconds(0);
    //     today.setMilliseconds(0);
    //     let datetime = convertDateTime(today);

    //     let offerPricingFilter = {
    //         $expr: {
    //             $and: [
    //                 { $eq: ["$active", true] },
    //                 { $ne: [[], "$$offerId"] },
    //                 { $eq: ["$offerpricingId", "$$offerId"] },
    //                 { $eq: ["$productVariantId", "$$pvId"] },
    //             ]
    //         }
    //     }

    //     let offerFilter = {
    //         $expr: {
    //             $and: [
    //                 { $eq: ["$sellerId", "$$sellerId"] },
    //                 { $eq: ["$active", true] },
    //                 { $lt: ["$startDate", datetime] },
    //                 { $gt: ["$endDate", datetime] }
    //             ]
    //         }
    //     }
    //     console.log(JSON.stringify(sort))
    //     console.log("=======================")
    //     console.log(JSON.stringify(findQuery))

    //     const trendingProducts = await allModels.productVariant.aggregate([
    //         { $match: { active: true, adminApproval: true } },
    //         // match
    //         {
    //             $match: {
    //                 $or: [
    //                     { _id: { $in: topSelling.map(data => data._id) } }, // data from orderItem
    //                     { "trending.isTrending": true } //added by admin
    //                 ]
    //             }
    //         },
    //         // Joining products
    //         {
    //             $lookup: {
    //                 from: "products",
    //                 localField: "productId",
    //                 foreignField: "_id",
    //                 as: "products"
    //             }
    //         },
    //         // Joining brands
    //         {
    //             $lookup: {
    //                 from: "brands",
    //                 localField: "products.brandId",
    //                 foreignField: "_id",
    //                 as: "brands"
    //             }
    //         },
    //         // Joining sellers
    //         {
    //             $lookup: {
    //                 from: "sellers",
    //                 localField: "sellerId",
    //                 foreignField: "_id",
    //                 as: "sellers"
    //             }
    //         },
    //         // Joining productvarientreviews
    //         {
    //             $lookup: {
    //                 from: "productvarientreviews",
    //                 localField: "_id",
    //                 foreignField: "productVariantId",
    //                 as: "productvarientreviews"
    //             }
    //         },
    //         // Joining offerpricingitems
    //         {
    //             $lookup: {
    //                 from: "offerpricings",
    //                 let: {
    //                     sellerId: "$sellerId"
    //                 },
    //                 pipeline: [
    //                     {
    //                         $match: offerFilter
    //                     }
    //                 ],
    //                 as: "offerPricing",
    //             }
    //         },
    //         {
    //             $lookup: {
    //                 from: "offerpricingitems",
    //                 let: {
    //                     pvId: "$_id", offerId: { $first: "$offerPricing._id" }
    //                 },
    //                 pipeline: [
    //                     {
    //                         $match: offerPricingFilter
    //                     }
    //                 ],
    //                 as: "offerpricingitems",
    //             },
    //         },
    //         // First Projection
    //         {
    //             $project: {
    //                 ...commonInclustion,
    //                 productNetPrice: {
    //                     $toDouble: "$productNetPrice"
    //                 },
    //                 englishProductVariantName: {
    //                     $arrayElemAt: ["$productVariantDetails.productVariantName", 0]
    //                 },
    //                 arabicProductVariantName: {
    //                     $arrayElemAt: ["$productVariantDetails.productVariantName", 1]
    //                 },
    //                 productVariantImages: {
    //                     $filter: {
    //                         input: "$productVariantImages",
    //                         as: "productVariantImage",
    //                         cond: {
    //                             $eq: ["$$productVariantImage.active", true],
    //                         }
    //                     }
    //                 },
    //                 tags: { $first: "$productVariants.tags" },

    //                 rating: {
    //                     averageRate: {
    //                         $avg: "$productvarientreviews.rating"
    //                     },
    //                     totalReview: {
    //                         $size: "$productvarientreviews"
    //                     }
    //                 },

    //                 offer: "$offerPricing",
    //                 offerPrices: "$offerpricingitems",

    //                 brandId: {
    //                     $first: "$brands",
    //                 },
    //                 sellerId: {
    //                     _id: {
    //                         $first: "$sellers._id",
    //                     },
    //                     nameOfBussiness: {
    //                         $first: "$sellers.nameOfBussinessEnglish",
    //                     }
    //                 },
    //                 productId: {
    //                     _id: {
    //                         $first: "$products._id",
    //                     },
    //                     productSpecifications: {
    //                         $first: "$products.productSpecifications",
    //                     },
    //                     productDetails: {
    //                         $first: "$products.productDetails",
    //                     },
    //                     active: {
    //                         $first: "$products.active",
    //                     },
    //                     productCategories: {
    //                         $first: "$products.productCategories",
    //                     },
    //                     productDate: {
    //                         $first: "$products.productDate",
    //                     },
    //                     productUpdateDate: {
    //                         $first: "$products.productUpdateDate",
    //                     },
    //                 }
    //             }
    //         },
    //         // Second Projection
    //         {
    //             $project: {
    //                 ...commonInclustion,
    //                 englishProductVariantName: {
    //                     $toLower: "$englishProductVariantName"
    //                 },
    //                 arabicProductVariantName: {
    //                     $toLower: "$arabicProductVariantName"
    //                 },
    //                 productVariantImages: {
    //                     $map: {
    //                         input: "$productVariantImages",
    //                         as: "productVariantImage",
    //                         in: {
    //                             path: "$$productVariantImage.path",
    //                             image_id: "$$productVariantImage.image_id"
    //                         }
    //                     }
    //                 },
    //                 rating: 1,
    //                 offerPrice: {
    //                     $map: {
    //                         input: "$offerPrices",
    //                         as: "offerPrice",
    //                         in: {
    //                             $cond: {
    //                                 if: { $in: ["$$offerPrice.offerpricingId", "$offer._id"] },
    //                                 then: {
    //                                     _id: "$$offerPrice._id",
    //                                     offerPricingId: "$$offerPrice.offerpricingId",
    //                                     discountType: "$$offerPrice.discountType",
    //                                     discountValue: {
    //                                         $toDouble: "$$offerPrice.discountValue"
    //                                     },
    //                                     offerPrice: {
    //                                         $toDouble: "$$offerPrice.offerPrice"
    //                                     },
    //                                 },
    //                                 else: {}
    //                             }
    //                         }
    //                     }
    //                 },
    //                 brandId: 1,
    //                 sellerId: 1,
    //                 productId: 1
    //             }
    //         },
    //         // Third Projection
    //         {
    //             $project: {
    //                 ...commonInclustion,
    //                 englishProductVariantName: 1,
    //                 arabicProductVariantName: 1,
    //                 productVariantImages: 1,
    //                 rating: 1,
    //                 offerPrice: {
    //                     // $push: {
    //                     // $first: {
    //                     $filter: {
    //                         input: "$offerPricing",
    //                         as: "offerPricing",
    //                         cond: { $ne: ["$$offerPricing", {}] }
    //                     }
    //                     // }
    //                     // }
    //                 },
    //                 brandId: 1,
    //                 sellerId: 1,
    //                 productId: 1
    //             }
    //         },
    //         {
    //             $addFields: {
    //                 productFinalPrice: {
    //                     $cond: {
    //                         if: {
    //                             $eq: ["$offerPrice", []]
    //                         },
    //                         then: { $toDouble: { $toString: "$productNetPrice" } },
    //                         else: { $toDouble: { $toString: { $first: "$offerPrice.offerPrice" } } }
    //                     }
    //                 }
    //             }
    //         },
    //         // Match
    //         {
    //             $match: {
    //                 productVariantImages: { $ne: [] },
    //                 ...findQuery
    //             }
    //         },
    //         // Sorting
    //         { $sort: sort },
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
    //     let pvList = trendingProducts.length ? trendingProducts[0].paginatedResults : [];
    //     let totalCount = 0
    //     try {
    //         totalCount = trendingProducts[0].totalCount[0].count
    //     } catch (err) { }

    //     return res.send({
    //         totalCount: totalCount,
    //         count: pvList.length,
    //         data: pvList
    //     })

    // } catch (error) {
    //     return res.status(403).send({ message: error.message });
    // }

}// End of trendingProducts method

const topSellingProducts = async () => {

    let weekDate = new Date();
    weekDate.setDate(weekDate.getDate() - 7);
    let datetime = convertDateTime(weekDate);

    const sort = { totalSales: -1 };
    let sellingProducts = await allModels.orderItems.aggregate([
        { $match: { createdDate: { $gt: datetime } } },
        {
            $lookup: {
                from: "productvariants",
                localField: "productVariantId",
                foreignField: "_id",
                as: "productvariants",
            },
        },

        {
            $group: {
                _id: "$productVariantId",
                totalSales: { $sum: "$quantity" },
                productName: { "$first": "$productvariants.productVariantDetails" }
                // itemsSold: { $push:  { item: "$item", quantity: "$quantity" } }
            },
        },
        { $sort: sort },
    ])
    return sellingProducts;

}

exports.trendingFilter = async (req, res) => {

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



    let topSelling = await topSellingProducts();
    //console.log(topSelling.map(data => data._id));

    let trendingProducts = await allModels.productVariant.aggregate([
        { $match: { active: true, adminApproval: true } },
        // match
        {
            $match: {
                $or: [
                    { _id: { $in: topSelling.map(data => data._id) } }, // data from orderItem
                    { "trending.isTrending": true } //added by admin
                ]
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
        // Joining brands
        {
            $lookup: {
                from: "brands",
                localField: "products.brandId",
                foreignField: "_id",
                as: "brands"
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


    ]);


    return res.send({ count: trendingProducts.length, data: trendingProducts })
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
