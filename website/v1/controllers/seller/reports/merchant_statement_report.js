const path = require("path");
var XLSX = require('xlsx');
const { ObjectId } = require("mongoose").Types;
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');
const ALL_MODELS = require("../../../../../utilities/allModels");

exports.merchantStatementReport = async (req, res) => {
    let {
        start_date, end_date
    } = req.body;
    const sellerId = ObjectId(req.userId);
    let filter = {};
    if (start_date || end_date) {
        filter["$and"] = [];
    }
    const defaultDate = new Date();
    defaultDate.setHours(00); defaultDate.setMinutes(00); defaultDate.setSeconds(00);
    defaultDate.setMonth(defaultDate.getMonth() - 1);

    if (start_date) {
        start_date = new Date(start_date)
        start_date.setHours(0); start_date.setMinutes(0); start_date.setSeconds(0);
        start_date.setDate(start_date.getDate() - 1)
        let dt = convertDateTime(start_date);
        filter['$and'].push({ "order.createdDate": { $gt: dt } })
    }
    if (end_date) {
        end_date = new Date(end_date)
        end_date.setHours(0); end_date.setMinutes(0); end_date.setSeconds(0);
        // end_date.setDate(end_date.getDate() + 1)
        let dt = convertDateTime(end_date);
        filter['$and'].push({ "order.createdDate": { $lt: dt } })
    }

    // Going to apply defalult 1 month date filter
    if (!start_date) {
        let dt = convertDateTime(defaultDate);
        if (!filter['$and']) { filter['$and'] = []; }
        filter['$and'].push({ "order.createdDate": { $gte: dt } })
    }

    // console.log(JSON.stringify(filter));

    let merchantStatement = await ALL_MODELS.orderItems.aggregate([
        { $match: { sellerId: sellerId } },
        {
            $lookup: {
                from: "orders",
                localField: "orderId",
                foreignField: "_id",
                as: "order",
            },
        },
        { $unwind: "$order" },
        { $match: filter },
        {
            $lookup: {
                from: "sellers",
                localField: "sellerId",
                foreignField: "_id",
                as: "seller",
            },
        },
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
        { $unwind: "$seller" },
        { $unwind: "$ordershippings" },
        {
            $addFields: {
                RefundedAmount: {
                    $cond: {
                        if: {
                            $and: [
                                { $eq: ["$Refunded", true] },
                                { $eq: ["$RefundChargesPaidBy", "Seller"] },
                            ]
                        }, then: { $toDouble: "$RefundedAmount" }, else: 0
                    },
                }
            }
        },
        {
            $group: {
                _id: "$orderId",
                // fromDate: { $first: "$order.createdAt" },
                orderDate: { $last: "$order.createdAt" },
                orderAmount: { $sum: { $multiply: [{ $toDouble: "$retailPrice" }, { $toDouble: { $toString: "$quantity" } }] } },
                offerDiscount: { $sum: "$offerDiscount" },
                couponDiscount: { $sum: "$couponDiscount" },
                // totalNetSale: { $sum: { $multiply: [{ $toDouble: { $toString: "$totalUnitPrice" } }, { $toDouble: { $toString: "$quantity" } }] } },
                totalNetSale: { $sum: { $toDouble: { $toString: "$grandTotal" } } },
                //totalShippingAmount: { $sum: { $toDouble: { $toString: "$ordershippings.shippingPrice" } } },
                paymentType: { $first: "$order.paymentMethod" },
                seller: { $first: "$seller" },
                sellerName: { $first: "$seller.nameOfBussinessEnglish" },
                refundedAmount: { $sum: "$RefundedAmount" },
                moneyHeldWithMerchant: {
                    $sum: {
                        $cond: [
                            //Condition for money held with merchant
                            //Total of COD amount with the Merchant (Self-Delivery)
                            { $and: [{ $eq: ["$order.paymentMethod", "CASH"] }, { $eq: ["$ordershippings.shippingMethod", "Self Delivery"] },] },
                            {
                                // $toDouble: { $toString: "$ordershippings.shippingPrice" }
                                // $add: [{ $toDouble: { $toString: "$ordershippings.shippingPrice" } }, {
                                $multiply: [{ $toDouble: { $toString: "$totalUnitPrice" } }, { $toDouble: { $toString: "$quantity" } }]
                                // }]
                            },
                            0
                        ]
                    }
                },
                cashTansactionHelWithMyarket: {
                    $sum: {
                        $cond: [
                            //Condition for cash transaction held with My Market
                            { $and: [{ $eq: ["$order.paymentMethod", "CASH"] }, { $eq: ["$ordershippings.shippingMethod", "MM Drive"] },] },
                            {
                                // $multiply: [{ $toDouble: { $toString: "$totalUnitPrice" } }, { $toDouble: { $toString: "$quantity" } }]
                                $toDouble: { $toString: "$grandTotal" }
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
                                // $multiply: [{ $toDouble: { $toString: "$totalUnitPrice" } }, { $toDouble: { $toString: "$quantity" } }]
                                $toDouble: { $toString: "$grandTotal" }
                            },
                            0
                        ]
                    }
                },
                myMarketWalletTransactionsHeldWIthMM: {
                    $sum: {
                        $cond: [
                            //Condition for cash transaction held with My Market
                            { $eq: ["$order.paymentMethod", "MY_MARKET_WALLET"] },
                            {
                                $multiply: [{ $toDouble: { $toString: "$totalUnitPrice" } }, { $toDouble: { $toString: "$quantity" } }]
                            },
                            0
                        ]
                    }
                }
            }
        },
        { $sort: { _id: 1 } },
        {
            $group: {
                _id: "",
                totalNetSales: { $sum: "$totalNetSale" },
                couponDiscount: { $sum: "$couponDiscount" },
                offerDiscount: { $sum: "$offerDiscount" },
                orderCount: { $sum: 1 },
                orderAmount: { $sum: "$orderAmount" },
                seller: { $first: "$seller" },
                moneyHeldWithMerchant: { $sum: "$moneyHeldWithMerchant" },
                cashTansactionHelWithMyarket: { $sum: "$cashTansactionHelWithMyarket" },
                tapTransactionHeldWithMyMarket: { $sum: "$tapTransactionHeldWithMyMarket" },
                myMarketWalletTransactionsHeldWIthMM: { $sum: "$myMarketWalletTransactionsHeldWIthMM" },
                refundedAmount: { $sum: "$refundedAmount" },
                fromDate: { $first: "$orderDate" },
                toDate: { $last: "$orderDate" }
            }
        },
        {
            $project: {
                fromDate: 1,
                toDate: 1,
                statementDate: "$$NOW",
                totalNetSales: 1,
                orderCount: 1,
                orderAmount: 1,
                // totalNetSale: { $add: ["$totalNetSale", "$couponDiscount", "$offerDiscount"] },
                couponDiscount: 1,
                offerDiscount: 1,
                seller: 1,
                moneyHeldWithMerchant: 1,
                cashTansactionHelWithMyarket: 1,
                tapTransactionHeldWithMyMarket: 1,
                myMarketWalletTransactionsHeldWIthMM: 1,
                refundedAmount: 1,
                paymentSummaryTotal: {
                    $add: ["$moneyHeldWithMerchant", "$cashTansactionHelWithMyarket", "$tapTransactionHeldWithMyMarket",
                        "$myMarketWalletTransactionsHeldWIthMM"
                    ]
                },
                totalMoneyHeldWithMyMarket: {
                    $subtract: [{
                        $add: ["$moneyHeldWithMerchant", "$cashTansactionHelWithMyarket", "$tapTransactionHeldWithMyMarket",
                            "$myMarketWalletTransactionsHeldWIthMM"
                        ]
                    }, "$moneyHeldWithMerchant"]
                },

                promotionDiscount: { $toInt: 0 },
                commissionOnTotalNetSales: { $divide: [{ $toInt: { $toString: "$seller.commissionPercentage" } }, 100] }
            }
        },
        {
            $addFields: {
                netMoney: { $subtract: ["$totalMoneyHeldWithMyMarket", "$promotionDiscount"] },
            }
        },
        {
            $addFields: {
                commissionOnTotalNetSales: { $multiply: ["$netMoney", "$commissionOnTotalNetSales"] },
            }
        },
        {
            $addFields: {
                netAmountToBePaidByMerchant: { $subtract: ["$netMoney", { $add: ["$commissionOnTotalNetSales", "$refundedAmount"] }] },
            }
        },
        {
            $project: {
                "seller.otp": 0,
                'seller.adminVerified': 0,
                'seller.bussinessCoverImage': 0,
                'seller.createdAt': 0,
                'seller.expireOtp': 0,
                'seller.indexNo': 0,
                'seller.password': 0,
                'seller.profileImage': 0,
                'seller.resetpasswordtoken': 0,
                'seller.resetpasswordexpire': 0,
            }
        }



    ])


    return res.send({ count: merchantStatement.length, data: merchantStatement })




}
const convertDateTime = (createdAt) => {
    let date = createdAt;
    let year = date.getFullYear();
    let mnth = ("0" + (date.getMonth() + 1)).slice(-2);
    let day = ("0" + date.getDate()).slice(-2);
    let hr = ("0" + date.getHours()).slice(-2);
    let min = ("0" + date.getMinutes()).slice(-2);
    let sec = ("0" + date.getSeconds()).slice(-2);
    return Number(`${year}${mnth}${day}${hr}${min}${sec}`);
};







