let allModels = require("../../../utilities/allModels")
const { validationResult } = require('express-validator')
let mongoose = require("mongoose")
let { getRating } = require('../../../common/productVariantReview');

exports.globalSearch = async (req, res) => {

    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let { search, category, brands, limit, page } = req.body;

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

            { "parentcategories.categoryDetails.categoryName": regexp },
            { "products.productDetails.productName": regexp },
            { "brands.brandDetails.brandName": regexp },
            { "productNetPrice": regexp },
            {
                "tags.list": { $regex: regexp }
            }
        ];


        if (category || brands) {
            filter["$and"] = [];
        }
        if (category) {
            filter["$and"].push({ "parentcategories.categoryDetails.categoryName": { $in: category } });
        }
        if (brands) {
            filter["$and"].push({ "brands.brandDetails.brandName": { $in: brands } });
        }

        //offer filter
        const today = new Date();
        today.setHours(0);
        today.setMinutes(0);
        today.setSeconds(0);
        today.setMilliseconds(0);
        let datetime = convertDateTime(today);

        let offerFilter = {
            $expr: {
                $and: [
                    { $lt: [datetime, "$startDate"] },
                    { $gt: [datetime, "$endDate"] },
                    { $eq: ["$offerPrice.offerpricingId", "$id"] }
                ]
            }
        }

        let productVarints = await allModels.productVariant.aggregate([
            { $match: { active: true, adminApproval: true } },
            {
                $lookup: {
                    from: 'products', localField: 'productId',
                    foreignField: '_id', as: 'products'
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "products.productCategories.categoryLevel1Id",
                    foreignField: "_id",
                    as: "categories",

                },
            },
            {
                $lookup: {
                    from: "brands",
                    localField: "brandId",
                    foreignField: "_id",
                    as: "brands",

                },
            },
            {
                $lookup: {
                    from: 'offerpricingitems',
                    localField: '_id',
                    foreignField: 'productVariantId',
                    as: 'offerPrice'
                }
            },
            {
                $lookup: {
                    from: 'offerpricings',
                    localField: 'offerPrice.offerpricingId',
                    foreignField: '_id',
                    as: 'offerPricing',

                    /*  let: { startDate: "$startDate", endDate: "$endDate", id: "$_id" },
                     pipeline: [
                         { $match: offerFilter }
                     ] */
                }
            },
            {
                $project: {
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

        if (productVarints.length) {
            for (let i = 0; i < productVarints[0].paginatedResults.length; i++) {
                const ele = productVarints[0].paginatedResults[i];
                if (!(ele.offerPricing.length > 0 && ele.offerPricing[0].startDate < datetime && ele.offerPricing[0].endDate > datetime)) {
                    ele.offerPricing = [];
                    ele.offerPrice = [];
                }
            }

            if (productVarints[0].paginatedResults.length > 0) {
                let temp = [];
                await getRating(productVarints[0].paginatedResults, temp);
                productVarints[0].paginatedResults = temp;
            }
        }

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