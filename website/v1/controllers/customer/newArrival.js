let allModels = require("../../../../utilities/allModels")
let { getRating } = require("../../../../common/productVariantReview")
let { getFilterCategories, getFilterBrands, getFilterPriceRange, getFilterColor, getAllcategories } = require("../../middlewares/filterOptions");
let mongoose = require("mongoose")
var arraySort = require('array-sort');

// Local modules
const { commonInclustion, filter } = require("../../../../utilities/filter_util");

exports.newArrivalProducts = async (req, res) => {

    try {
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

        let newArrivals = await allModels.productVariant.aggregate([
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



/**-------------------------- */
exports.filterOptions = async (req, res) => {
    try {
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

        let newArrivals = await allModels.productVariant.aggregate([
            // { $sort: { "indexNo": -1 } },
            // {$limit:20},
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
            { $unwind: { path: "$brands" } },

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
                    offerPrices: "$offerpricingitems",

                    brandId: {
                        // $first: "$brands",
                        indexNo: "$brands.indexNo",
                        _id: "$brands._id",
                        brandDetails: "$brands.brandDetails",
                        brandEnglish: { $arrayElemAt: ["$brands.brandDetails.brandName", 0] },
                        brandArabic: { $arrayElemAt: ["$brands.brandDetails.brandName", 1] },
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
            },
        ]);

        newArrivals[0].brands = arraySort(newArrivals[0].brands, "brandEnglish");

        return res.send({ count: newArrivals.length, data: newArrivals })

    }
    catch (error) {
        return res.status(403).send({ message: error.message });

    }


}