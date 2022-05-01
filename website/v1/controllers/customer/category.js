let allModels = require("../../../../utilities/allModels");
const { validationResult } = require('express-validator')
let mongoose = require("mongoose")
let { getRating } = require('./../../../../common/productVariantReview');
// Local modules
const { commonInclustion, filter } = require("../../../../utilities/filter_util");


exports.parentCategories = async (req, res) => {

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
        // { $match: { "parentCategoryId": mongoose.Types.ObjectId(req.query.categoryId) } },
        // { $match: { active: { $eq: true } } },
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
        // { $match: { productvariantList: { $ne: [] } } },
        {
            $project: {
                _id: 1,
                categoryDetails: 1,
                active: 1,
                adminApproval: 1
                //'productList._id': 1,
                //'productList.productDetails': 1,
                //productvariantList: 1
            }
        }
    ])

    return res.send({ count: category.length, data: category })

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