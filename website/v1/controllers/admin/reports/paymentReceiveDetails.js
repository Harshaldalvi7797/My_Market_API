const { createDirectories } = require('./../../../middlewares/checkCreateFolder');
var XLSX = require("xlsx");
const ALL_MODELS = require("../../../../../utilities/allModels");



exports.paymentReceiveDetails = async (req, res) => {
    let {
        search, limit, page
    } = req.body;

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

    if (search) {
        const regexp = new RegExp(search, "i");
        filter["$or"] = [
            { "seller": regexp }
        ];
        if (parseFloat(search).toString().toLowerCase() != 'nan') {
            filter["$or"].push({ "paymentHeldWithMerchant": parseFloat(search) });
            filter["$or"].push({ "totalOrderValue": parseFloat(search) });
            filter["$or"].push({ "myMarketWalletTransactionsHeldWIthMM": parseFloat(search) });
            filter["$or"].push({ "cashTansactionHelWithMyarket": parseFloat(search) });
            filter["$or"].push({ "tapTransactionHeldWithMyMarket": parseFloat(search) });
        }
    }

    let merchantPayment = await ALL_MODELS.orderItems.aggregate([
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
                let: { sellerId: "$sellerId", orderId: "$orderId" },
                pipeline: [{
                    $match: {
                        $expr: {
                            $and: [
                                { $eq: ["$$sellerId", "$sellerId"] },
                                { $eq: ["$$orderId", "$orderId"] }
                            ]
                        }
                    }
                }],
                as: "ordershippings",
            }
        },
        { $unwind: "$ordershippings" },
        {
            $group: {
                _id: "$sellerId",
                // paymentType: { $first: "$order.paymentMethod" },
                seller: { $first: "$seller.nameOfBussinessEnglish" },
                sellerIndexNo: { $first: "$seller.indexNo" },
                paymentHeldWithMerchant: {
                    $sum: {
                        $cond: [
                            //Condition for money held with merchant
                            { $and: [{ $eq: ["$order.paymentMethod", "CASH"] }, { $eq: ["$ordershippings.shippingMethod", "Self Delivery"] },] },
                            {
                                $add: [{ $toDouble: { $toString: "$ordershippings.shippingPrice" } }, {
                                    $multiply: [{ $toDouble: { $toString: "$totalUnitPrice" } }, { $toDouble: { $toString: "$quantity" } }]
                                }]
                            },
                            0
                        ]
                    }
                },
                totalOrderValue: { $sum: { $multiply: [{ $toDouble: { $toString: "$totalUnitPrice" } }, { $toDouble: { $toString: "$quantity" } }] } },
                cashTansactionHelWithMyarket: {
                    $sum: {
                        $cond: [
                            //Condition for cash transaction held with My Market
                            { $and: [{ $eq: ["$order.paymentMethod", "CASH"] }, { $eq: ["$ordershippings.shippingMethod", "MM Drive"] },] },
                            {
                                $add: [{ $toDouble: { $toString: "$ordershippings.shippingPrice" } }, {
                                    $multiply: [{ $toDouble: { $toString: "$totalUnitPrice" } }, { $toDouble: { $toString: "$quantity" } }]
                                }]
                            },
                            0
                        ]
                    }
                },
                tapTransactionHeldWithMyMarket: {
                    $sum: {
                        $cond: [
                            //Condition for cash transaction held with My Market
                            { $eq: ["$order.paymentMethod", "ONLINE"] },
                            {
                                $add: [{ $toDouble: { $toString: "$ordershippings.shippingPrice" } }, {
                                    $multiply: [{ $toDouble: { $toString: "$totalUnitPrice" } }, { $toDouble: { $toString: "$quantity" } }]
                                }]
                            },
                            0
                        ]
                    }
                },
                myMarketWalletTransactionsHeldWIthMM:
                {
                    $sum: {
                        $cond: [
                            //Condition for cash transaction held with My Market
                            { $eq: ["$order.paymentMethod", "MY_MARKET_WALLET"] },
                            {
                                $add: [{ $toDouble: { $toString: "$ordershippings.shippingPrice" } }, {
                                    $multiply: [{ $toDouble: { $toString: "$totalUnitPrice" } }, { $toDouble: { $toString: "$quantity" } }]
                                }]
                            },
                            0
                        ]
                    }
                },

                // shippingPrice: { $push: "$ordershippings.shippingPrice" },
                // grandTotal: { $push: "$grandTotal" },
                // paymentType: { $push: "$order.paymentMethod" },
                // orderList: { $push: "$order.indexNo" },
            }
        },

        { $sort: { sellerIndexNo: 1 } },
        { $match: filter },
        {
            $facet: {
                paginatedResults: [
                    {
                        $skip: perPage * pageNo,
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
    const merchantPaymentList = merchantPayment.length ? merchantPayment[0].paginatedResults : [];
    let totalCount = 0;
    try {
        totalCount = merchantPayment[0].totalCount[0].count;
    } catch (err) { }

    return res.send({
        totalCount: totalCount,
        data: merchantPaymentList,
        count: merchantPaymentList.length,
    });
}
    // return res.send({ count: merchantPayment.length, data: merchantPayment })




