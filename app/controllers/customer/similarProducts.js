let allModels = require("../../utilities/allModels")
const mongoose = require("mongoose");
let { getRating } = require("../../../common/productVariantReview");
const { commonInclustion, filter } = require("../../utilities/filter_util");
const { validationResult } = require('express-validator');

exports.similarProducts = async (req, res) => {
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
































    // const validationError = validationResult(req);
    // if (!validationError.isEmpty()) {
    //     return res.status(403).send({ message: validationError.array() });
    // }
    // try {
    //     let similarPV = await mongoose.connection.collection("categoryproductvariants").findOne({
    //         "_id": mongoose.Types.ObjectId(req.query.categoryId)
    //     })

    //     let temp = [];
    //     if (similarPV.productvariantList.length > 0) {
    //         //console.log(similarPV.offerPrice)
    //         for (let index = 0; index < similarPV.productvariantList.length; index++) {
    //             const el = similarPV.productvariantList[index];
    //             let offerIndex = similarPV.offerPrice.findIndex(obj => obj.productVariantId.toString() == el._id.toString());
    //             if (offerIndex != -1) {
    //                 //console.log(offerIndex);
    //                 let offerPrice = {
    //                     "discountType": similarPV.offerPrice[offerIndex].discountType,
    //                     "discountValue": similarPV.offerPrice[offerIndex].discountValue,
    //                     "offerPrice": similarPV.offerPrice[offerIndex].offerPrice
    //                 }
    //                 el.offerPrice = [offerPrice]
    //             } else {
    //                 el.offerPrice = null
    //             }
    //         }
    //         await getRating(similarPV.productvariantList, temp, false);
    //         //console.log('checkpoint 2');
    //         similarPV['productvariantList'] = temp
    //         // return res.send({ count: checkWishlist['productVariants'].length, d: checkWishlist })
    //     }


    //     return res.send({ count: similarPV.productvariantList.length, d: similarPV.productvariantList })
    // }
    // catch (error) {
    //     return error
    // }
}