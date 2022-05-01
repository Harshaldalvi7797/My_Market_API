let allModels = require("../../../../../utilities/allModels")
const { validationResult } = require('express-validator');
let mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;


exports.getdashboardInventorydata = async (req, res) => {
    let stocksummary = await stockSummary(req)
    let categorysummary = await categorySummary(req)
    return res.send({
        stockSummary: stocksummary, categorySummary: categorysummary
    })
}

stockSummary = async (req, res) => {
    let productvarint = await allModels.productVariant.aggregate([
        { $match: { "sellerId": mongoose.Types.ObjectId(req.userId) } },
    ])
    let stockSum = {
        InStock: null,
        LowStock: null,
        OutofStock: null
    }

    let InStock = []
    let LowStock = []
    let OutofStock = []
    for (let index = 0; index < productvarint.length; index++) {
        const element = productvarint[index];

        if (element.inventoryQuantity > element.inventoryReOrderLevel) {
            InStock.push(element)
        }
        if (element.inventoryQuantity < element.inventoryReOrderLevel) {
            LowStock.push(element)
        }
        if (element.inventoryQuantity == "0") {
            OutofStock.push(element)
        }
        // console.log(element.inventoryReOrderQuantity)
    }
    stockSum.InStock = InStock.length
    stockSum.LowStock = LowStock.length
    stockSum.OutofStock = OutofStock.length
    // stockSum.push(inStock.length)
    // stockSum.push(lowStock)
    // stockSum.push(outofStock)
    // console.log("instock", inStock.length)
    // console.log("lowstock", lowStock.length)
    // console.log("outofStock", outofStock.length)

    // return res.send({data: stockSum })
    return stockSum
}

categorySummary = async (req, res) => {
    const sellerId = mongoose.Types.ObjectId(req.userId);

    let category = await allModels.category.aggregate([
        { $match: { "parentCategoryId": mongoose.Types.ObjectId(req.query.categoryId) } },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "productCategories.categoryLevel2Id",
                as: "products",
            },
        },
        {
            $lookup: {
                from: "productvariants",
                localField: "products._id",
                foreignField: "productId",
                as: "productvariants",
            },
        },
        { $unwind: "$productvariants" },
        //{ $match: { "productvariants.sellerId": mongoose.Types.ObjectId(req.userId) } },

        {
            $match: {
                $and: [
                    { "productvariants.sellerId": sellerId }
                ]
            }
        },

        // {
        //     $project:{
        //         "_id":1,
        //         "categoryDetails":1,
        //         "productvariants":1,
        //         total:{$sum:"$productvariants._id"}

        //     }
        // }
        {
            $group: {
                _id: "$_id",
                categoryName: { "$first": "$categoryDetails" },
                pvId: { "$first": "$productvariants" },
                products: { $push: "$$ROOT" },
                totalItems: {
                    $sum: 1
                }
            },
        },
        {
            $project:
            {
                _id: 1,
                categoryName: 1,
                // products: 1,
                totalItems: 1
            }
        }
    ])

    // return res.send({ count: category.length, data: category })
    return category
}

exports.parentcategories = async (req, res) => {
    const sellerId = mongoose.Types.ObjectId(req.userId);
    let parentcategories = await allModels.category.aggregate([
        { $match: { "categoryLevel": "1", active: true, adminApproval: true } },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "productCategories.categoryLevel1Id",
                as: "products",
            },
        },
        {
            $lookup: {
                from: "productvariants",
                localField: "products._id",
                foreignField: "productId",
                as: "productvariants",
            },
        },
        { $unwind: "$productvariants" },
        {
            $match: {
                $and: [
                    { "productvariants.sellerId": sellerId }
                ]
            }
        },
        {
            $group: {
                _id: "$_id",
                categoryName: { "$first": "$categoryDetails" },
                pvId: { "$first": "$productvariants" },
                products: { $push: "$$ROOT" },
                /* totalItems: {
                    $sum: 1
                } */
            },
        },
        {
            $project:
            {
                _id: 1,
                categoryName: 1,
            }
        },
    ])

    return res.send({ count: parentcategories.length, d: parentcategories })
}


