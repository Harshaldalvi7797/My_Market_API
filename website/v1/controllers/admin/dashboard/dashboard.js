const allModels = require("../../../../../utilities/allModels");
let mongoose = require("mongoose");
const { validationResult } = require('express-validator');
const ObjectId = mongoose.Types.ObjectId;
var arraySort = require('array-sort');

const dates = [
    { type: "week", days: 7 },
    { type: "month", days: 30 },
    { type: "year", days: 365 },
]

const convertDateTime = (createdAt) => {
    let date = new Date(createdAt.toString());
    let year = date.getFullYear();
    let mnth = ("0" + (date.getMonth() + 1)).slice(-2);
    let day = ("0" + date.getDate()).slice(-2);
    let hr = ("0" + date.getHours()).slice(-2);
    let min = ("0" + date.getMinutes()).slice(-2);
    let sec = ("0" + date.getSeconds()).slice(-2);
    // this.orderDate = `${year}-${mnth}-${day}T${hr}:${min}:${sec}`
    return Number(`${year}${mnth}${day}${hr}${min}${sec}`)
}


Date.prototype.monthDays = function () {
    var d = new Date(this.getFullYear(), this.getMonth() + 1, 0);
    return d.getDate();
}

Date.prototype.getWeek = function (dowOffset) {

    dowOffset = typeof (dowOffset) == 'number' ? dowOffset : 0; //default dowOffset to zero
    var newYear = new Date(this.getFullYear(), 0, 1);
    var day = newYear.getDay() - dowOffset; //the day of week the year begins on
    day = (day >= 0 ? day : day + 7);
    var daynum = Math.floor((this.getTime() - newYear.getTime() -
        (this.getTimezoneOffset() - newYear.getTimezoneOffset()) * 60000) / 86400000) + 1;
    var weeknum;
    //if the year starts before the middle of a week
    if (day < 4) {
        weeknum = Math.floor((daynum + day - 1) / 7) + 1;
        if (weeknum > 52) {
            nYear = new Date(this.getFullYear() + 1, 0, 1);
            nday = nYear.getDay() - dowOffset;
            nday = nday >= 0 ? nday : nday + 7;
            /*if the next year starts before the middle of
              the week, it is week #1 of that year*/
            weeknum = nday < 4 ? 1 : 53;
        }
    }
    else {
        weeknum = Math.floor((daynum + day - 1) / 7);
    }
    return weeknum;
};

const setTime = function (req) {
    var startDate = new Date(); // get current date
    var endDate = new Date(); // get current date

    let days = 0;
    var last = 0;
    var first = 0;
    req.body.date_filter = { $and: [] };

    if (req.body.duration_type === "week") {
        days = dates.filter(f => f.type == req.body.duration_type);
        last = endDate;
        startDate.setDate(startDate.getDate() - days[0].days);
        first = startDate;
    } else if (req.body.duration_type === "month") {
        last = endDate;
        startDate.setDate(1)
        first = startDate;
    } else if (req.body.duration_type === "year") {
        last = endDate;
        startDate.setMonth(0);
        startDate.setDate(1);
        first = startDate;
    } else if (req.body.duration_type === "custom") {
        last = new Date(req.body.to_date);
        first = new Date(req.body.from_date);
    }
    first.setHours(0)
    first.setMinutes(0)
    first.setSeconds(0)

    last.setHours(23)
    last.setMinutes(59)
    last.setSeconds(59)

    // console.log(req.body.duration_type, first, last);
    req.body.first = first;
    req.body.last = last;

    req.body.start_date = convertDateTime(first);
    req.body.last_date = convertDateTime(last);
    req.body.date_filter['$and'].push({ createdDate: { $gte: req.body.start_date } })
    req.body.date_filter['$and'].push({ createdDate: { $lte: req.body.last_date } })
};

exports.adminDashboard = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    setTime(req)

    let totalCustomers = await totalUsers(req)
    let newTotalUsers = await newUsers(req)
    let topFive = await topFiveSellingProducts(req)
    let myMarketSalessummary = await myMarketSalesSummary(req)
    let avOrderValue = await averageOrderValue(req)
    let avOrderValuePerDay = await averageOrderValuePerday(req)
    let totalOrdersstatusWise = await totalOrdersStatusWise(req)
    let totalWalletBalance = await totalWalletAmount(req)
    let topCategoriessalesWise = await topCategories(req)
    let productReviews = await reviews(req)
    let categoryTopPv = await categoryWiseTopProducts(req)
    let topSeller = await topsellers(req)
    let totalPayabaleamount = await totalPayableAmount(req)




    return res.send({
        totalUsers: totalCustomers,
        newUsers: newTotalUsers,
        topSellingProducts: topFive,
        salesSummaryChart: myMarketSalessummary,
        averageOrderValue: avOrderValue,
        averageOrderValuePerDay: avOrderValuePerDay,
        totalWalletAmount: totalWalletBalance,
        totalOrdersStatusWise: totalOrdersstatusWise,
        topCategoriesSalesWise: topCategoriessalesWise,
        reviewChart: productReviews,
        categoryTopProducts: categoryTopPv,
        topSellers: topSeller,
        totalPayabaleAmount: totalPayabaleamount


    })

    // return res.send({ message: "Admin Dashboard" })

}
const totalUsers = async (req, res) => {

    let customers = await allModels.customer.aggregate([

        { $match: {} },
        {
            $group:
            {
                _id: null,
                totalUsers: { $sum: 1 }
            }
        },
        { $project: { _id: 0 } }
    ]
    )
    return (customers.length > 0) ? customers[0].totalUsers : 0


}

const newUsers = async (req, res) => {

    let filter = { '$and': [] };
    filter['$and'].push({ 'createdDate': { $gte: req.body.start_date } })
    filter['$and'].push({ 'createdDate': { $lte: req.body.last_date } })
    let newCustomers = 0;
    newCustomers = await allModels.customer.aggregate([
        { $match: {} },
        { $match: filter },
        {
            $group:
            {
                _id: null,
                newUsers: { $sum: 1 }
            }
        },
        { $project: { _id: 0 } },
    ]
    )
    return (newCustomers.length > 0) ? newCustomers[0].newUsers : 0
}

const topFiveSellingProducts = async (req, res) => {
    let filter = { '$and': [] };
    filter['$and'].push({ 'orders.createdDate': { $gte: req.body.start_date } })
    filter['$and'].push({ 'orders.createdDate': { $lte: req.body.last_date } })
    let orders = await allModels.orderItems.aggregate([
        {
            $lookup: {
                from: "orders",
                localField: "orderId",
                foreignField: "_id",
                as: "orders"
            }
        },
        { $unwind: "$orders" },
        { $match: filter },
        {
            $lookup: {
                from: "productvariants",
                localField: "productVariantId",
                foreignField: "_id",
                as: "productvariants",
            },
        },
        {
            $group: {
                _id: "$productVariantId",
                totalSales: { $sum: "$quantity" },
                productName: { "$first": "$productvariants.productVariantDetails" },
                productImages: { "$first": "$productvariants.productVariantImages" }
                // itemsSold: { $push:  { item: "$item", quantity: "$quantity" } }
            },
        },
        {
            $project: {
                totalSales: 1,
                "productName.productVariantName": 1,
                "productName.pv_language": 1,
                "productImages": 1
            }
        },
        { $sort: { totalSales: -1 } },
        { $limit: 10 }
    ])
    return (orders)
    // console.log(dateDifference("2021-12-30T09:24:16.090+00:00", "2021-12-31T09:24:16.090+00:00"))
}

totalPayableAmount = async (req, res) => {

    let totalAmount = await allModels.orderItems.aggregate([
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
                _id: "$sellerId",
                orderCount: { $sum: 1 },
                orderDate: { $last: "$order.createdAt" },
                orderAmount: { $sum: { $multiply: [{ $toDouble: "$retailPrice" }, { $toDouble: { $toString: "$quantity" } }] } },
                offerDiscount: { $sum: "$offerDiscount" },
                couponDiscount: { $sum: "$couponDiscount" },
                // totalNetSale: { $sum: { $multiply: [{ $toDouble: { $toString: "$totalUnitPrice" } }, { $toDouble: { $toString: "$quantity" } }] } },
                totalNetSale: { $sum: { $toDouble: { $toString: "$grandTotal" } } },
                //totalShippingAmount: { $sum: { $toDouble: { $toString: "$ordershippings.shippingPrice" } } },
                paymentType: { $first: "$order.paymentMethod" },
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
        // { $sort: { _id: 1 } },
        {
            $group: {
                _id: "",
                totalNetSales: { $sum: "$totalNetSale" },
                couponDiscount: { $sum: "$couponDiscount" },
                offerDiscount: { $sum: "$offerDiscount" },
                orderCount: { $sum: "$orderCount" },
                orderAmount: { $sum: "$orderAmount" },
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
                // fromDate: 1,
                // toDate: 1,
                // statementDate: "$$NOW",
                // totalNetSales: 1,
                // orderCount: 1,
                // orderAmount: 1,
                // totalNetSale: { $add: ["$totalNetSale", "$couponDiscount", "$offerDiscount"] },
                // couponDiscount: 1,
                // offerDiscount: 1,
                moneyHeldWithMerchant: 1,
                // cashTansactionHelWithMyarket: 1,
                // tapTransactionHeldWithMyMarket: 1,
                // myMarketWalletTransactionsHeldWIthMM: 1,
                // refundedAmount: 1,
                // paymentSummaryTotal: {
                //     $add: ["$moneyHeldWithMerchant", "$cashTansactionHelWithMyarket", "$tapTransactionHeldWithMyMarket",
                //         "$myMarketWalletTransactionsHeldWIthMM"
                //     ]
                // },
                // totalMoneyHeldWithMyMarket: {
                //     $subtract: [{
                //         $add: ["$moneyHeldWithMerchant", "$cashTansactionHelWithMyarket", "$tapTransactionHeldWithMyMarket",
                //             "$myMarketWalletTransactionsHeldWIthMM"
                //         ]
                //     }, "$moneyHeldWithMerchant"]
                // },

                // promotionDiscount: { $toInt: 0 }
            }
        },




    ])
    return (totalAmount.length > 0) ? totalAmount[0].moneyHeldWithMerchant : 0
    // return totalAmount
    // return res.send({ count: totalAmount.length, data: totalAmount })

}
const myMarketSalesSummary = async (req, res) => {
    let filter = { '$and': [] };

    filter['$and'].push({ 'orders.createdDate': { $gte: req.body.start_date } })
    filter['$and'].push({ 'orders.createdDate': { $lte: req.body.last_date } })

    let startDate = req.body.first;
    let endDate = req.body.last;


    let orderProduct = null;
    let refundedQuantity = null;
    if (req.body.duration_type === "week") {
        orderProduct = await allModels.orderItems.aggregate([

            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "orders"
                }
            },
            { $unwind: "$orders" },
            { $match: filter },
            {
                $project: {
                    quantity: 1,
                    orderId: 1,
                    orders: 1,
                    Refunded: 1,
                    NetSales: {
                        $multiply: [{ $subtract: [{ $toDouble: "$retailPrice" }, { $add: ["$totalDiscount", { $toDouble: "$RefundedAmount" }] }] }, "$quantity"]
                    },
                }
            },
            {
                $group: {
                    _id: "$orderId",
                    quantitySold: { $sum: "$quantity" },
                    totalSales: { $sum: "$NetSales" },
                    createdAt: { $first: "$orders.createdAt" }
                }
            },
            {
                $project: {
                    orderId: "$_id",
                    quantitySold: 1,
                    totalSales: 1,
                    days: { $dayOfWeek: { $toDate: "$createdAt" } },
                    week: { $week: { $toDate: "$createdAt" } },
                    date: { $dateToString: { format: "%d-%m-%Y", date: { $toDate: "$createdAt" } } }
                }
            },
            {
                $group: {
                    _id: { $concat: [{ $toString: "$days" }, { $toString: "$week" }] },
                    orderId: { $push: "$orderId" },
                    quantitySold: { $sum: "$quantitySold" },
                    totalSales: { $sum: "$totalSales" },
                    numberOfOrders: { $sum: 1 },
                    days: { $first: "$days" },
                    week: { $first: "$week" },
                    date: { $first: "$date" }
                }
            },
            {
                $project: {
                    days: 1,
                    quantitySold: 1,
                    totalSales: 1,
                    numberOfOrders: 1,
                    week: 1,
                    date: 1
                }
            },
            {
                $sort: { "week": 1, "days": 1 }
            }
        ])

        refundedQuantity = await allModels.orderItems.aggregate([

            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "orders",
                }
            },
            {
                $lookup: {
                    from: "ordershippings",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "ordershippings",
                }
            },
            {
                $lookup: {
                    from: "orderstatusupdates",
                    localField: "_id",
                    foreignField: "orderShippingId",
                    as: "orderstatus",
                }
            },
            {
                $match: {
                    $and: [
                        { Refunded: true },
                        { RefundedDateTime: { $gte: startDate } },
                        { RefundedDateTime: { $lte: endDate } },
                    ]
                }
            },
            {
                $project: {
                    createdDate: 1,
                    orderId: 1,
                    updatedDate: 1,
                    Refunded: 1,
                    RefundedDateTime: 1,
                    quantity: 1,
                    days: { $dayOfWeek: { $toDate: "$RefundedDateTime" } },
                    week: { $week: { $toDate: "$RefundedDateTime" } },
                    date: { $dateToString: { format: "%d-%m-%Y", date: { $toDate: "$RefundedDateTime" } } }
                }
            },
            {
                $group: {
                    _id: { $concat: [{ $toString: "$days" }, { $toString: "$week" }] },
                    // orderId: { $push: "$orderId" },
                    totalRefundedUnits: { $sum: { $toInt: "$quantity" } },
                    days: { $first: "$days" },
                    week: { $first: "$week" },
                    date: { $first: "$date" }
                }
            },
            {
                $project: {
                    days: 1,
                    orderId: 1,
                    totalRefundedUnits: 1
                }
            },
        ]);

        let weekList = [];
        for (let a = 0; a < orderProduct.length; a++) {
            const ele = orderProduct[a];

            let weekFilter = weekList.filter(f => f == ele.week)
            if (weekFilter.length == 0) {
                weekList.push(ele.week);
            }

            for (let b = 0; b < refundedQuantity.length; b++) {
                const refund = refundedQuantity[b];
                // console.log(ele.days, refund.days)

                if (ele.days == refund.days) {
                    ele['totalRefunded'] = refund.totalRefundedUnits;
                }
            }
            if (!ele['totalRefunded']) {
                ele['totalRefunded'] = 0;
            }
        }

        if (weekList.length == 0) {
            let aDate = new Date()
            weekList = [aDate.getWeek()]
        }

        for (let index = 0; index < weekList.length; index++) {
            let weekDays = ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

            for (let index = 7; index >= 0; index--) {
                let today = new Date();
                today.setDate(today.getDate() - index);
                // console.log(today.toLocaleString('en-us', { weekday: 'short' }), today.getDate(), today.getWeek())

                for (let a = 0; a < orderProduct.length; a++) {
                    let ele = orderProduct[a];
                    let orderDate = new Date(ele.date.split("-")[2], ele.date.split("-")[1] - 1, ele.date.split("-")[0], 00, 00, 00);
                    ele["dt"] = orderDate.getDate();
                }

                let check = orderProduct.filter(f => f.dt == today.getDate())
                if (check.length == 0) {
                    let daysGet = weekDays.indexOf(today.toLocaleString('en-us', { weekday: 'short' }));
                    orderProduct.push({
                        _id: `${daysGet}${today.getWeek()}`,
                        date: `${("0" + today.getDate()).slice(-2)}-${("0" + (today.getMonth() + 1)).slice(-2)}-${today.getFullYear()}`,
                        quantitySold: 0,
                        totalSales: 0,
                        numberOfOrders: 0,
                        week: today.getWeek(),
                        days: daysGet,
                        totalRefunded: 0,
                    })
                }
            }

        }

        orderProduct = arraySort(orderProduct, ['week', 'days']);
    }

    if (req.body.duration_type === "month") {
        // console.log(JSON.stringify(filter))

        orderProduct = await allModels.orderItems.aggregate([

            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "orders"
                }
            },
            { $unwind: "$orders" },
            { $match: filter },
            {
                $project: {
                    quantity: 1,
                    orderId: 1,
                    orders: 1,
                    Refunded: 1,
                    NetSales: {
                        $multiply: [{ $subtract: [{ $toDouble: "$retailPrice" }, { $add: ["$totalDiscount", { $toDouble: "$RefundedAmount" }] }] }, "$quantity"]
                    },
                }
            },
            {
                $group: {
                    _id: "$orderId",
                    quantitySold: { $sum: "$quantity" },
                    totalSales: { $sum: "$NetSales" },
                    createdAt: { $first: "$orders.createdAt" }
                }
            },
            {
                $project: {
                    orderId: "$_id",
                    quantitySold: 1,
                    totalSales: 1,
                    week: { $week: { $toDate: "$createdAt" } }
                }
            },
            {
                $group: {
                    _id: "$week",
                    orderId: { $push: "$orderId" },
                    quantitySold: { $sum: "$quantitySold" },
                    totalSales: { $sum: "$totalSales" },
                    numberOfOrders: { $sum: 1 }
                }
            },
            {
                $project: {
                    week: "$_id",
                    quantitySold: 1,
                    totalSales: 1,
                    numberOfOrders: 1
                }
            },
            {
                $sort: { "week": 1 }
            }
        ])

        refundedQuantity = await allModels.orderItems.aggregate([

            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "orders",
                }
            },
            {
                $lookup: {
                    from: "ordershippings",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "ordershippings",
                }
            },
            {
                $lookup: {
                    from: "orderstatusupdates",
                    localField: "_id",
                    foreignField: "orderShippingId",
                    as: "orderstatus",
                }
            },
            {
                $match: {
                    $and: [
                        { Refunded: true },
                        { RefundedDateTime: { $gte: startDate } },
                        { RefundedDateTime: { $lte: endDate } },
                    ]
                }
            },
            {
                $project: {
                    createdDate: 1,
                    orderId: 1,
                    updatedDate: 1,
                    Refunded: 1,
                    RefundedDateTime: 1,
                    quantity: 1,
                    week: { $week: { $toDate: "$RefundedDateTime" } }
                }
            },
            {
                $group: {
                    _id: "$week",
                    orderId: { $push: "$orderId" },
                    totalRefundedUnits: { $sum: { $toInt: "$quantity" } },
                }
            },
            {
                $project: {
                    week: "$_id",
                    orderId: 1,
                    totalRefundedUnits: 1
                }
            },
        ]);

        for (let a = 0; a < orderProduct.length; a++) {
            const ele = orderProduct[a];
            for (let b = 0; b < refundedQuantity.length; b++) {
                const refund = refundedQuantity[b];
                if (ele.week == refund.week) {
                    ele['totalRefunded'] = refund.totalRefundedUnits;
                }
            }
            if (!ele['totalRefunded']) {
                ele['totalRefunded'] = 0;
            }
        }

        let sMonth = new Date();
        let eMonth = new Date();

        sMonth.setDate(01);

        for (let index = sMonth.getWeek(); index <= eMonth.getWeek(); index++) {
            let dataFilter = orderProduct.filter(f => f.week == index);
            if (dataFilter.length == 0) {
                orderProduct.push({
                    week: index,
                    quantitySold: 0,
                    totalSales: 0,
                    numberOfOrders: 0
                })
            }
        }

        if (orderProduct.length == 0) {
            for (let index = sMonth.getWeek(); index <= eMonth.getWeek(); index++) {
                orderProduct.push({
                    week: index,
                    quantitySold: 0,
                    totalSales: 0,
                    numberOfOrders: 0
                })
            }
        }

        orderProduct = arraySort(orderProduct, ['week']);

    }

    if (req.body.duration_type === "year") {
        orderProduct = await allModels.orderItems.aggregate([

            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "orders"
                }
            },
            { $unwind: "$orders" },
            { $match: filter },
            {
                $project: {
                    quantity: 1,
                    orderId: 1,
                    orders: 1,
                    Refunded: 1,
                    NetSales: {
                        $multiply: [{ $subtract: [{ $toDouble: "$retailPrice" }, { $add: ["$totalDiscount", { $toDouble: "$RefundedAmount" }] }] }, "$quantity"]
                    },
                }
            },
            {
                $group: {
                    _id: "$orderId",
                    quantitySold: { $sum: "$quantity" },
                    totalSales: { $sum: "$NetSales" },
                    createdAt: { $first: "$orders.createdAt" }
                }
            },
            {
                $project: {
                    orderId: "$_id",
                    quantitySold: 1,
                    totalSales: 1,
                    month: { $month: { $toDate: "$createdAt" } }
                }
            },
            {
                $group: {
                    _id: "$month",
                    orderId: { $push: "$orderId" },
                    quantitySold: { $sum: "$quantitySold" },
                    totalSales: { $sum: "$totalSales" },
                    numberOfOrders: { $sum: 1 }
                }
            },
            {
                $project: {
                    month: "$_id",
                    quantitySold: 1,
                    totalSales: 1,
                    numberOfOrders: 1
                }
            },
            {
                $sort: { "month": 1 }
            }

        ])

        refundedQuantity = await allModels.orderItems.aggregate([

            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "orders",
                }
            },
            {
                $lookup: {
                    from: "ordershippings",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "ordershippings",
                }
            },
            {
                $lookup: {
                    from: "orderstatusupdates",
                    localField: "_id",
                    foreignField: "orderShippingId",
                    as: "orderstatus",
                }
            },
            {
                $match: {
                    $and: [
                        { Refunded: true },
                        { RefundedDateTime: { $gte: startDate } },
                        { RefundedDateTime: { $lte: endDate } },
                    ]
                }
            },
            {
                $project: {
                    createdDate: 1,
                    orderId: 1,
                    updatedDate: 1,
                    Refunded: 1,
                    RefundedDateTime: 1,
                    quantity: 1,
                    month: { $month: { $toDate: "$RefundedDateTime" } }
                }
            },
            {
                $group: {
                    _id: "$month",
                    orderId: { $push: "$orderId" },
                    totalRefundedUnits: { $sum: { $toInt: "$quantity" } },
                }
            },
            {
                $project: {
                    month: "$_id",
                    orderId: 1,
                    totalRefundedUnits: 1
                }
            },
        ]);

        for (let a = 0; a < orderProduct.length; a++) {
            const ele = orderProduct[a];
            for (let b = 0; b < refundedQuantity.length; b++) {
                const refund = refundedQuantity[b];
                if (ele.month == refund.month) {
                    ele['totalRefunded'] = refund.totalRefundedUnits;
                }
            }
            if (!ele['totalRefunded']) {
                ele['totalRefunded'] = 0;
            }
        }

        let todayMonth = new Date();
        if (orderProduct.length < todayMonth.getMonth() + 1) {
            for (let index = 1; index <= todayMonth.getMonth() + 1; index++) {
                let monthFilter = orderProduct.filter(f => f.month == index);
                if (monthFilter.length == 0) {
                    orderProduct.push({ "_id": index, "quantitySold": 0, "totalSales": 0, "numberOfOrders": 0, "totalRefunded": 0, "month": index })
                }
            }
        }

        orderProduct = orderProduct.sort((a, b) => {
            if (a.month > b.month) {
                return 1
            } else {
                return -1
            }
        });

    }

    if (req.body.duration_type === "custom") {
        orderProduct = await allModels.orderItems.aggregate([

            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "orders"
                }
            },
            { $unwind: "$orders" },
            { $match: filter },
            {
                $project: {
                    quantity: 1,
                    orderId: 1,
                    orders: 1,
                    Refunded: 1,
                    NetSales: {
                        $multiply: [{ $subtract: [{ $toDouble: "$retailPrice" }, { $add: ["$totalDiscount", { $toDouble: "$RefundedAmount" }] }] }, "$quantity"]
                    },
                }
            },
            {
                $group: {
                    _id: "$orderId",
                    quantitySold: { $sum: "$quantity" },
                    totalSales: { $sum: "$NetSales" },
                    createdAt: { $first: "$orders.createdAt" }
                }
            },
            {
                $project: {
                    orderId: "$_id",
                    quantitySold: 1,
                    totalSales: 1,
                    date: { $dateToString: { format: "%d-%m-%Y", date: { $toDate: "$createdAt" } } }
                }
            },
            {
                $group: {
                    _id: "$date",
                    orderId: { $push: "$orderId" },
                    quantitySold: { $sum: "$quantitySold" },
                    totalSales: { $sum: "$totalSales" },
                    numberOfOrders: { $sum: 1 }
                }
            },
            {
                $project: {
                    date: "$_id",
                    quantitySold: 1,
                    totalSales: 1,
                    numberOfOrders: 1
                }
            },
            {
                $sort: { "date": 1 }
            }

        ])
        refundedQuantity = await allModels.orderItems.aggregate([

            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "orders",
                }
            },
            {
                $lookup: {
                    from: "ordershippings",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "ordershippings",
                }
            },
            {
                $lookup: {
                    from: "orderstatusupdates",
                    localField: "_id",
                    foreignField: "orderShippingId",
                    as: "orderstatus",
                }
            },
            {
                $match: {
                    $and: [
                        { Refunded: true },
                        { RefundedDateTime: { $gte: startDate } },
                        { RefundedDateTime: { $lte: endDate } },
                    ]
                }
            },
            {
                $project: {
                    createdDate: 1,
                    orderId: 1,
                    updatedDate: 1,
                    Refunded: 1,
                    RefundedDateTime: 1,
                    quantity: 1,
                    date: { $dateToString: { format: "%d-%m-%Y", date: { $toDate: "$RefundedDateTime" } } }
                }
            },
            {
                $group: {
                    _id: "$date",
                    orderId: { $push: "$orderId" },
                    totalRefundedUnits: { $sum: { $toInt: "$quantity" } },
                }
            },
            {
                $project: {
                    date: "$_id",
                    orderId: 1,
                    totalRefundedUnits: 1
                }
            },
        ]);

        for (let a = 0; a < orderProduct.length; a++) {
            const ele = orderProduct[a];
            for (let b = 0; b < refundedQuantity.length; b++) {
                const refund = refundedQuantity[b];
                if (ele.date == refund.date) {
                    ele['totalRefunded'] = refund.totalRefundedUnits;
                }
            }
            if (!ele['totalRefunded']) {
                ele['totalRefunded'] = 0;
            }
        }
    }

    return (orderProduct)
}

const totalWalletAmount = async (req, res) => {
    let filter = { '$and': [] };
    filter['$and'].push({ 'createdDate': { $gte: req.body.start_date } })
    filter['$and'].push({ 'createdDate': { $lte: req.body.last_date } })


    let walletBalance = await allModels.walletModel.aggregate([
        {
            $lookup: {
                from: 'customers',
                localField: 'customerId',
                foreignField: '_id',
                as: 'customer'
            }
        },
        { $unwind: "$customer" },
        {
            $group:
            {
                _id: "$customerId",
                walletIndexNo: { "$first": "$indexNo" },
                currentBalance: { "$last": { $toDouble: "$currentBalance" } },
                // lastDate: { "$first": "$createdAt" },
                // firstName: { "$first": "$customer.firstName" },
                // emailAddress: { "$first": "$customer.emailAddress" },
                // mobilePhone: { "$first": "$customer.mobilePhone" },

                // lastName: { "$first": "$customer.lastName" },
                // fullName: { "$first": "$customer.fullName" },
                // customerIndexNo: { "$first": "$customer.indexNo" }
            }
        },
        {
            $group:
            {
                _id: null,
                totalWalletAmount: { $sum: "$currentBalance" }
            }
        },
        { $project: { _id: 0 } },
        // {
        //     $project:
        //     {
        //         totalWalletAmount: 1

        //     }
        // }
    ])
    return (walletBalance.length > 0) ? walletBalance[0].totalWalletAmount : 0
    // return walletBalance
    // return res.send({ count: walletBalance.length, data: walletBalance });
}

const averageOrderValue = async (req, res) => {

    let filter = { '$and': [] };
    console.log(req.body.start_date)

    filter['$and'].push({ 'orders.createdDate': { $gte: req.body.start_date } })
    filter['$and'].push({ 'orders.createdDate': { $lte: req.body.last_date } })
    // console.log(JSON.stringify(filter));

    let orders = await allModels.orderItems.aggregate([
        {
            $lookup: {
                from: "orders",
                localField: "orderId",
                foreignField: "_id",
                as: "orders"
            }
        },
        { $unwind: "$orders" },
        { $match: filter },
        {
            $group: {
                _id: "$orderId",
                totalAmount: { $sum: { $multiply: ["$totalUnitPrice", "$quantity"] } },
            }
        },
        {
            $group: {
                _id: null,
                averageOrdervalue: { $avg: "$totalAmount" }
            }
        }


    ]);

    return (orders.length > 0) ? orders[0].averageOrdervalue : 0

}
const averageOrderValuePerday = async (req, res) => {

    let filter = { '$and': [] };
    const today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0); today.setSeconds(0);
    today.setMilliseconds(0);

    let datetime = convertDateTime(today);

    filter['$and'].push({ 'orders.createdDate': { $gte: datetime } })
    // filter['$and'].push({ 'orders.createdDate': { $lte: datetime } })
    console.log(JSON.stringify(filter));

    let orders = await allModels.orderItems.aggregate([
        {
            $lookup: {
                from: "orders",
                localField: "orderId",
                foreignField: "_id",
                as: "orders"
            }
        },
        { $unwind: "$orders" },
        { $match: filter },
        //  { $match: { "orders.createdDate": datetime } },
        {
            $group: {
                _id: "$orderId",
                totalAmount: { $sum: { $multiply: ["$totalUnitPrice", "$quantity"] } },
            }
        },
        {
            $group: {
                _id: null,
                averageOrdervalue: { $avg: "$totalAmount" }
            }
        }


    ]);

    return (orders.length > 0) ? orders[0].averageOrdervalue : 0

}
totalOrdersStatusWise = async (req, res) => {

    let orders = await allModels.orderItems.aggregate([
        // { $match: { "sellerId": mongoose.Types.ObjectId(req.userId) } },
        {
            $lookup: {
                from: "orders",
                localField: "orderId",
                foreignField: "_id",
                as: "orders",
            },
        },
        // { $match: filter },
        {
            $group: {
                _id: "$orders._id",
                orderId: { $first: "$orderId" }
            }
        },
        {
            $lookup: {
                from: "ordershippings",
                localField: "orderId",
                foreignField: "orderId",
                as: "ordershipping",
            },
        },
        { $unwind: "$ordershipping" },
        {
            $lookup: {
                from: "orderstatusupdates",
                localField: "ordershipping._id",
                foreignField: "orderShippingId",
                as: "orderstatus",
            },
        },
        { $unwind: "$orderstatus" },
        {
            $project: {
                _id: "$orderId",
                status: "$orderstatus.status"
            }
        },
        {
            $group: {
                _id: "$_id",
                status: { $last: "$status" },
            }
        },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
            }
        },
        {
            $sort: { "count": -1 }
        }
    ])

    let statusList = ["Processing", "Shipped", "Delivered", "On_Hold", "New", "Cancelled", "Refunded", "Ready_To_Pickup"]
    // console.log(req.userId);
    for (let index = 0; index < statusList.length; index++) {
        const ele = statusList[index];
        let statusFilter = orders.filter(f => f._id == ele);
        if (statusFilter.length == 0) {
            orders.push({ _id: ele, count: 0 });
        }
    }
    orders = orders.sort(function (a, b) {
        a = a._id.toLowerCase();
        b = b._id.toLowerCase();

        return a < b ? -1 : a > b ? 1 : 0;
    })
    return orders
    //  return res.send({count:orders.length,data:orders})

}

topCategories = async (req, res) => {

    let topCategories = await allModels.orderItems.aggregate([
        {
            $lookup: {
                from: "productvariants",
                localField: "productVariantId",
                foreignField: "_id",
                as: "productvariants",
            },
        },
        { $unwind: { path: "$productvariants" } },
        {
            $lookup: {
                from: "products",
                localField: "productvariants.productId",
                foreignField: "_id",
                as: "products"
            }
        },
        { $unwind: { path: "$products" } },
        {
            $lookup: {
                from: "categories",
                localField: "products.productCategories.categoryLevel1Id",
                foreignField: "_id",
                as: "categories"
            }
        },
        { $unwind: { path: "$categories" } },

        {
            $group:
            {
                _id: "$categories._id",
                categoryName: { "$first": "$categories.categoryDetails" },
                categoryThumbnailImage: { "$first": "$categories.categoryThumbnailImage" },
                // pvId: { "$first": "$productvariants" },

                totalItems: {
                    $sum: 1
                }
            }
        },
        { $sort: { totalItems: -1 } },

    ])
    return topCategories

    // return res.send({ count: topCategories.length, data: topCategories })


}
reviews = async (req, res) => {

    let productReviews = await allModels.productVarientReview.aggregate([
        // { $match: filter },
        {
            $lookup: {
                from: "productvariants",
                localField: "productVariantId",
                foreignField: "_id",
                as: "productvariants",
            },
        },
        {
            $project: { "productvariants.sellerId": 1, "rating": 1, "createdAt": 1 }
        },
    ])

    let positiveRating = []
    let negativeRating = []

    for (let index = 0; index < productReviews.length; index++) {
        const element = productReviews[index];
        if (element.rating > 3.5) {
            positiveRating.push(element.rating)
        }
        if (element.rating < 3.5) {
            negativeRating.push(element.rating)
        }
    }

    return ({ positiveReviews: positiveRating.length, negetiveReviews: negativeRating.length })

}
categoryWiseTopProducts = async (req, res) => {
    let categoryTopProducts = await allModels.orderItems.aggregate([
        {
            $lookup: {
                from: "orders",
                localField: "orderId",
                foreignField: "_id",
                as: "orders"
            }
        },
        { $unwind: "$orders" },
        // { $match: filter },
        {
            $lookup: {
                from: "productvariants",
                localField: "productVariantId",
                foreignField: "_id",
                as: "productvariants",
            },
        },
        {
            $lookup: {
                from: "products",
                localField: "productvariants.productId",
                foreignField: "_id",
                as: "products"
            }
        },

        {
            $lookup: {
                from: "categories",
                localField: "products.productCategories.categoryLevel1Id",
                foreignField: "_id",
                as: "firstLevel"
            }
        },
        { $unwind: "$firstLevel" },

        {
            $group: {
                _id: "$productVariantId",
                totalSales: { $sum: "$quantity" },
                productName: { "$first": "$productvariants.productVariantDetails" },
                productImages: { "$first": "$productvariants.productVariantImages" },
                firstLevel: { "$first": "$firstLevel" }
                // itemsSold: { $push:  { item: "$item", quantity: "$quantity" } }
            },
        },
        {
            $project: {
                totalSales: 1,
                "productName.productVariantName": 1,
                "productName.pv_language": 1,
                "productImages": 1,
                "firstLevel": 1
            }
        },
        { $match: { "firstLevel._id": mongoose.Types.ObjectId(req.body.categoryId) } },
        {
            $project: {
                totalSales: 1,
                "productName.productVariantName": 1,
                "productName.pv_language": 1,
                "productImages": 1,

            }
        },
        { $sort: { totalSales: -1 } },
        { $limit: 10 }
    ])

    return categoryTopProducts

    // return res.send({ count: categoryTopProducts.length, data: categoryTopProducts })
}

topsellers = async (req, res) => {


    if (req.body.topSellers === "quantity") {
        let sellerPvWise = await allModels.orderItems.aggregate([
            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "orders",
                }
            },
            { $unwind: "$orders" },
            {
                $lookup: {
                    from: "sellers",
                    localField: "sellerId",
                    foreignField: "_id",
                    as: "seller"
                }
            },
            { $unwind: "$seller" },
            // { $match: filter },
            // {
            //     $project: {
            //         sale: { $sum: "$quantity" },
            //         sellerIndexNo: "$seller.indexNo",
            //         orderId: "$orders._id",
            //         indexNo: "$orders.indexNo",
            //         seller: "$seller"
            //     }
            // },
            {
                $group: {
                    _id: "$sellerId",
                    totalSales: { $sum: "$quantity" },
                    seller: { $first: "$seller" }
                },
            },
            {
                $project: {
                    _id: 1,
                    totalSales: 1,
                    "seller.nameOfBussinessEnglish": 1,
                    "seller.nameOfBussinessArabic": 1,
                    "seller.profileImage": 1,
                    "seller.bussinessCoverImage": 1,

                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 }

        ])
        return sellerPvWise

        // return res.send({ count: sellerPvWise.length, data: sellerPvWise })

    }
    if (req.body.topSellers === "sales") {
        // return sellerPvWise
        let sellerSalesWise = await allModels.orderItems.aggregate([

            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "orders"
                }
            },
            { $unwind: "$orders" },
            {
                $lookup: {
                    from: "productvariants",
                    localField: "productVariantId",
                    foreignField: "_id",
                    as: "productvariants"
                }
            },
            { $unwind: "$productvariants" },
            {
                $lookup: {
                    from: "sellers",
                    localField: "sellerId",
                    foreignField: "_id",
                    as: "seller"
                }
            },
            { $unwind: "$seller" },

            {
                $project: {
                    NetSales: {
                        $multiply: [{ $subtract: [{ $toDouble: "$retailPrice" }, { $add: ["$totalDiscount", { $toDouble: "$RefundedAmount" }] }] }, "$quantity"]
                    },
                    "seller": 1,

                }
            },
            {
                $group: {
                    _id: "$seller._id",
                    totalSale: { $sum: "$NetSales" },
                    seller: { "$first": "$seller" }
                }
            },
            {
                $project: {
                    _id: 1,
                    totalSale: 1,
                    "seller.nameOfBussinessEnglish": 1,
                    "seller.nameOfBussinessArabic": 1,
                    "seller.profileImage": 1,
                    "seller.bussinessCoverImage": 1,

                }
            },
            { $sort: { totalSale: -1 } },
            { $limit: 10}
        ]);

        // return res.send({ count: sellerSalesWise.length, data: sellerSalesWise })

        return sellerSalesWise
    }

}


exports.parentCategory = async (req, res) => {
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



