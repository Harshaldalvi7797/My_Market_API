let allModels = require("../../../utilities/allModels");
const { validationResult } = require('express-validator');
const mongoose = require("mongoose");
let { getRating } = require("../../../common/productVariantReview");
const { commonInclustion, filter } = require("../../utilities/filter_util");
const ObjectId = mongoose.Types.ObjectId;

exports.parentCategories = async (req, res) => {

    try {
        let parentCategories = await allModels.category.aggregate([
            {
                $match: {
                    $and: [
                        { categoryLevel: "1" },
                        { active: true },
                        { adminApproval: true }
                    ]
                }
            },
            { $sort: { "homePageOrder": 1 } },
        ])

        return res.send({ count: parentCategories.length, data: parentCategories })
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }

}

exports.secondlevelCategories = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    let category = await allModels.category.aggregate([
        {
            $match: {
                $and: [
                    { "parentCategoryId": mongoose.Types.ObjectId(req.query.categoryId) },
                    { active: true },
                    { adminApproval: true }
                ]
            }
        },
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: 'productCategories.categoryLevel2Id',
                as: 'productList'
            }
        },
        {
            $match: {
                $and: [
                    { "productList.active": true },
                    { "productList.adminApproval": true }
                ]
            }
        },
        {
            $lookup: {
                from: 'productvariants',
                localField: 'productList._id',
                foreignField: 'productId',
                as: 'productvariantList'
            }
        },
        {
            $match: {
                $and: [
                    { "productvariantList.active": true },
                    { "productvariantList.adminApproval": true }
                ]
            }
        },
        {
            $project: {
                _id: 1,
                categoryDetails: 1,
                active: 1,
                adminApproval: 1
            }
        }
    ])

    return res.send({ count: category.length, data: category });
}

exports.thirdlevelCategories = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    let category = await allModels.category.aggregate([
        {
            $match: {
                $and: [
                    { "parentCategoryId": mongoose.Types.ObjectId(req.query.categoryId) },
                    { active: true },
                    { adminApproval: true }
                ]
            }
        },
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: 'productCategories.categoryLevel3Id',
                as: 'productList'
            }
        },
        {
            $match: {
                $and: [

                    { "productList.active": true },
                    { "productList.adminApproval": true }
                ]
            }
        },

        {
            $lookup: {
                from: 'productvariants',
                localField: 'productList._id',
                foreignField: 'productId',
                as: 'productvariantList'
            }
        },
        {
            $match: {
                $and: [
                    { "productvariantList.active": true },
                    { "productvariantList.adminApproval": true }
                ]
            }
        },
        {
            $project: {
                _id: 1,
                categoryDetails: 1,
                active: 1,
                adminApproval: 1
            }
        }
    ])

    return res.send({ count: category.length, data: category })

}

exports.getAllcategories = async (req, res, next) => {

    let a = await allModels.category.find({
        active: true
    }).populate({
        path: "products.productCategories.categoryId"
    });

    let list = [];
    //finding main parent and inserting
    let parent = a.filter(f => {
        return f['parentCategoryId'] == null
    });

    let findChild = (parent, array, output) => {
        parent.forEach(p => {
            let filter = array.filter(f => {
                try {
                    return f.parentCategoryId.equals(p._id)
                } catch (error) {
                    return false;
                }
            })

            let search = output.filter(o => {
                return o._id.equals(p._id);
            })

            if (search.length > 0 && filter.length > 0) {
                filter.forEach(el => {
                    if (deepSearch(output, '_id', (k, v) => v.equals(el._id)) == null) {
                        search[0].child.push({
                            _id: el._id, name: el.categoryDetails,
                            categoryThumbnailImage: el.categoryThumbnailImage,
                            //categoryCoverImage: el.categoryCoverImage,
                            child: []
                        })
                        //console.log(JSON.stringify(search[0]));
                    }

                    let check = array.filter(c => {
                        return el._id.equals(c.parentCategoryId)
                    })

                    if (check.length > 0) {
                        findChild(search[0].child, array, search[0].child);
                    }
                })
            }

        })
    }

    parent.forEach((p, index) => {
        list.push({
            _id: p._id, name: p.categoryDetails,
            categoryThumbnailImage: p.categoryThumbnailImage,
            categoryCoverImage: p.categoryCoverImage,
            child: []
        })

        if (index == (parent.length - 1)) {
            //find child upto lowest level
            findChild(parent, a, list);
        }
    });
    return res.send({ count: list.length, data: list });
}

exports.fetchSinglecategory = async (req, res, next) => {

    let category = null;
    try {
        category = await allModels.category.findById(req.params.id);
    } catch (error) {
        allModels.log.writeLog(req, error);
    }
    if (!category) {
        return res.status(404).send({ message: "Invalid category Id" });
    }

    return res.send({ message: "Category get", data: category });
}

let deepSearch = (object, key, predicate) => {
    if (object.hasOwnProperty(key) && predicate(key, object[key]) === true) return object

    for (let i = 0; i < Object.keys(object).length; i++) {
        let value = object[Object.keys(object)[i]];
        if (typeof value === "object" && value != null) {
            let o = deepSearch(object[Object.keys(object)[i]], key, predicate)
            if (o != null) return o
        }
    }
    return null
}

// new api with filter but half

exports.fetchProductVariantByCategory = async (req, res) => {
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
        active: true,
        $or: [
            { "productCategories.categoryLevel1Id": mongoose.Types.ObjectId(req.body.categoryId) },
            { "productCategories.categoryLevel2Id": mongoose.Types.ObjectId(req.body.categoryId) },
            { "productCategories.categoryLevel3Id": mongoose.Types.ObjectId(req.body.categoryId) },
        ]
    }).select(["_id"])
    // console.log("hi", product)
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
    // return res.send({ count: categoryProducts.length, data: categoryProducts })
}

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