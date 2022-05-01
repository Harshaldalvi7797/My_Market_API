const ALL_MODELS = require("../../../../../utilities/allModels");
var XLSX = require('xlsx');
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');


exports.deliveryChargesMyMarket = async (req, res, next) => {


    let deliveryCharges = await ALL_MODELS.orderItems.aggregate([
        {
            $lookup: {
                from: "orders",
                localField: "orderId",
                foreignField: "_id",
                as: "order",
            },
        },
        { $unwind: "$order" },
        {
            $lookup: {
                from: "sellers",
                localField: "sellerId",
                foreignField: "_id",
                as: "seller",
            },
        },
        { $unwind: "$seller" },

        {
            $lookup: {
                from: "ordershippings",
                localField: "orderId",
                foreignField: "orderId",
                as: "ordershippings",
            },
        },
        { $unwind: "$ordershippings" },
        {
            $group: {
                _id: { $concat: [{ $toString: "$seller.indexNo" }, "_", { $toString: "$order.indexNo" }] },
                seller: { $first: "$seller.nameOfBussinessEnglish" },
                totalShippingAmount: { $sum: "$ordershippings.shippingPrice" },
                deliveryInvoiceNo: { $first: "not added" },
                invoiceDate: { $first: "$order.createdAt" },
                vat: { $first: 0 }

            }
        },
        {
            $addFields:
            {
                total: { $add: ["$totalShippingAmount","$vat"] }
            }
        }


    ])


    return res.send({ count: deliveryCharges.length, data: deliveryCharges })


}