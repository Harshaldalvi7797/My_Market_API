let allModels = require("../../../../utilities/allModels")
const { validationResult } = require('express-validator')
let mongoose = require("mongoose")
let { getRating } = require('../../../../common/productVariantReview');

/* exports.globalSearch = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    if (req.body.search.length > 2) {
        var search = req.body.search;

        let regExSearch = new RegExp(search, "i");
        allModels.productVariant.find({
            $or: [
                { "productVariantDetails.productVariantName": regExSearch },
                { "productVariantDetails.productVariantDescription": regExSearch },
                { "tags.list": { $regex: regExSearch } }
            ]
        }, async (err, data) => {
            if (err) { return res.status(403).send({ error: err }); }
            var RESPONSE_DATA = [];

            if (data.length == 0) {
                return res.send({ count: data.length, d: RESPONSE_DATA });
            }
            let filter = [];
            if (reqData.category.toLowerCase() == 'all') {
                filter = data;
            } else {
                filter = data.filter(a => {
                    if (JSON.stringify(a['productId'].productCategories).indexOf(reqData.category.toString()) == -1) {
                        return false;
                    } else {
                        return true
                    }
                })
            }
            RESPONSE_DATA = filter.filter(a => {
                return a['sellerId'] != null;
            });
            return res.send({ count: RESPONSE_DATA.length, d: RESPONSE_DATA });
        }).select(["-__v", "-createdAt", "-updatedAt"])
            .populate([
                { path: 'brandId', select: ["-active", "-photoCover", "-photoThumbnail"] },
                {
                    path: "productId", select: ["productDetails", "productCategories"],
                    populate: [
                        { path: "productCategories.categoryId", select: ['-isParent', '-active'] },
                    ]
                },
                {
                    path: 'sellerId',
                    select: ["_id", "nameOfBussinessEnglish"]
                },
            ])
        let reqData = req.body
        if (reqData.isSearch) {
            let newSearch = new allModels.searchModel({
                customerId: req.userId || null,
                deviceIdentifier: reqData.deviceIdentifier,
                searchKeyWord: reqData.search
            })
            //console.log(newSearch)
            await newSearch.save()
        }
    } else {
        return res.send({ message: "Search string must be greater the 2 characters" });
    }
}

exports.getSearchHistoryBycustomer = async (req, res) => {
    let search = null;
    if (!req.userId) {
        search = await allModels.searchModel.find({
            deviceIdentifier: req.params.deviceIdentifier
        }).sort([['createdAt', '-1']]).select(["searchKeyWord"]).limit(5)
        //console.log(checkCart)
    } else {
        //console.log(req.userId);
        search = await allModels.searchModel.find({
            customerId: req.userId
        }).select(["searchKeyWord"]).sort([['createdAt', '-1']]).select(["searchKeyWord"]).limit(5)
    }
    if (!search) {
        return res.send({ message: 'Your search  is empty' });
    }
    return res.send({ count: search.length, data: search })
} */


exports.globalSearch = async (req, res) => {

    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let { search, category, limit, page } = req.body;

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

    let filter = {};

    if (search.length > 2) {
        const regexp = new RegExp(search, "i");
        //  regexp = new RegExp(category, "i");
        filter["$or"] = [
            { "productVariantDetails.productVariantName": regexp },
            { "productVariantDetails.productVariantDescription": regexp },

            { "parentCategoryEnglish": regexp },
            { "parentCategoryArabic": regexp },

            { "products.productDetails.productName": regexp },
            { "products.productDetails.productDescription": regexp },

            { "brands.brandDetails.brandName": regexp },
            { "productNetPrice": regexp },
            { "tags.list": { $regex: regexp } }
        ];


        if (category && typeof category == 'string') {
            filter["$and"] = [];
        }
        
        if (category && typeof category == 'string') {
            filter["$and"].push({ categoryId: mongoose.Types.ObjectId(category) });
        }//"categories.categoryDetails.categoryName": { $in: category }
        // console.log("category", category)
        //offer filter
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
                    { $lt: ["$startDate", datetime] },
                    { $gt: ["$endDate", datetime] }
                ]
            }
        }
        // console.log("filter", filter)

        let productVarints = await allModels.productVariant.aggregate([
            { $match: { active: true, adminApproval: true } },
            {
                $lookup: {
                    from: 'products', localField: 'productId',
                    foreignField: '_id', as: 'products'
                }
            },
            { $unwind: { path: "$products" } },
            {
                $lookup: {
                    from: "categories",
                    localField: "products.productCategories.categoryLevel1Id",
                    foreignField: "_id",
                    as: "categories",
                },
            },
            {
                $addFields: {
                    categoryId: { $first: "$categories._id" },
                    parentCategoryEnglish: {
                        $first: {
                            $map: {
                                input: "$categories",
                                as: "categories",
                                in: { $first: "$$categories.categoryDetails.categoryName" }
                            }
                        }
                    },
                    parentCategoryArabic: {
                        $first: {
                            $map: {
                                input: "$categories",
                                as: "categories",
                                in: { $last: "$$categories.categoryDetails.categoryName" }
                            }
                        }
                    },
                }
            },
            {
                $lookup: {
                    from: "brands",
                    localField: "brandId",
                    foreignField: "_id",
                    as: "brands",
                },
            },
            { $unwind: { path: "$brands" } },
            {
                $lookup: {
                    from: "offerpricings",
                    let: { sellerId: "$sellerId" },
                    pipeline: [{ $match: offerFilter }],
                    as: "offerPricing",
                }
            },
            {
                $lookup: {
                    from: "offerpricingitems",
                    let: { pvId: "$_id", offerId: { $first: "$offerPricing._id" } },
                    pipeline: [{ $match: offerPricingFilter }],
                    as: "offerPrice",
                },
            },
            {
                $project: {
                    offerPricing: 0,
                    "offerPrice._id": 0,
                    "offerPrice.active": 0,
                    "offerPrice.offerPriceAmount": 0,

                    "offerPrice.offerPriceAmount": 0,
                    "offerPrice.offerpricingId": 0,
                    "offerPrice.productVariantId": 0,
                    "offerPrice.createdAt": 0,
                    "offerPrice.updatedAt": 0,
                    "offerPrice.createdDate": 0,
                    "offerPrice.updatedDate": 0,
                    "offerPrice.__v": 0,

                }
            },
            { $match: filter },
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

        const productVarintsList = productVarints.length ? productVarints[0].paginatedResults : [];
        let totalCount = 0
        try {
            totalCount = productVarints[0].totalCount[0].count
        } catch (err) { }

        return res.send({ totalCount: totalCount, count: productVarintsList.length, data: productVarintsList });

    } else {
        return res.send({ message: "Search string must be greater the 2 characters" });
    }

}

exports.saveSearch = async (req, res) => {

    let { deviceIdentifier, search } = req.body;
    let newSearch = new allModels.searchModel({
        customerId: req.userId || null,
        deviceIdentifier: deviceIdentifier,
        searchKeyWord: search
    })
    //console.log(newSearch)
    await newSearch.save()
    return res.send({ message: "Your searched " + search });
}

exports.getSearchHistoryBycustomer = async (req, res) => {
    let search = null;
    if (!req.userId) {
        // console.log(req.params.deviceIdentifier);
        search = await allModels.searchModel.find({
            deviceIdentifier: req.params.deviceIdentifier
        })
            .sort([['createdAt', '-1']]).select(["searchKeyWord"]).limit(5)
        //console.log(checkCart)
    } else {
        //console.log(req.userId);
        search = await allModels.searchModel.find({
            customerId: req.userId
        }).select(["searchKeyWord"]).sort([['createdAt', '-1']]).select(["searchKeyWord"]).limit(5)
    }
    if (!search) {
        return res.send({ message: 'Your search  is empty' });
    }
    return res.send({ count: search.length, data: search })
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