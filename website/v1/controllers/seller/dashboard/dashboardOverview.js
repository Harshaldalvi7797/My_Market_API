let allModels = require("../../../../../utilities/allModels")
const { validationResult } = require('express-validator');
let mongoose = require("mongoose");
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

exports.getDashboardData = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    setTime(req)
    let visitors = await visitorList(req)
    let newOrder = await newOrders(req)
    let totalSale = await totalSales(req);
    let totalFollowers = await yourFollowers(req)
    let YourOrders = await yourOrders(req)
    let productReviewsAverage = await productReviews(req)
    let totalProductsStock = await totalStock(req)
    let totalProductUnitsSold = await totalUnitsSold(req)
    let productsRefundedToday = await orderproductsRefundedToday(req)
    let productsRefunded = await orderproductsRefunded(req)
    let sellerCustomerMessage = await sellerCustomerMessages(req)
    let salesSummaryChart = await salesSummary(req)
    /*  return res.send({
         visitorCount: visitors, newOrders: newOrder, totalSales: totalSale, YourOrdersCount: YourOrders, productReviewsAverage: productReviewsAverage,
         TotalUnitsRefundedToday: productsRefundedToday, TotalUnitsRefunded: productsRefunded, totalStockAvailable: totalProductsStock
         , totalUnitsSold: totalProductUnitsSold, YourFollowers: totalFollowers, sellerCustomerMessageCount: sellerCustomerMessage
     }); */
    return res.send({
        visitorCount: visitors, newOrders: newOrder, totalSales: totalSale, YourFollowers: totalFollowers,
        YourOrdersCount: YourOrders, productReviewsAverage: productReviewsAverage, totalStockAvailable: totalProductsStock,
        totalUnitsSold: totalProductUnitsSold, TotalUnitsRefundedToday: productsRefundedToday, TotalUnitsRefunded: productsRefunded,
        sellerCustomerMessageCount: sellerCustomerMessage, startDate: req.body.first, endDate: req.body.last,
        salesSummary: salesSummaryChart
    });
}

//complete
visitorList = async (req, res) => {
    return new Promise(async (resolve, reject) => {
        // const filter = req.body.date_filter;
        // console.log(req.userId);
        let visitors = await allModels.visitorsModel.aggregate([
            { $match: { "sellerId": mongoose.Types.ObjectId(req.userId) } },
            // { $match: filter },
            {
                $group: {
                    _id: "$sellerId",
                    count: { $sum: { $toInt: "$viewsCount" } }
                }
            }
        ]);
        // console.log(visitors)
        resolve((visitors.length > 0) ? visitors[0].count : 0);
    })
}

//complete
newOrders = async (req, res) => {
    return new Promise(async (resolve, reject) => {
        let filter = { '$and': [] };

        filter['$and'].push({ 'orders.createdDate': { $gte: req.body.start_date } })
        filter['$and'].push({ 'orders.createdDate': { $lte: req.body.last_date } })

        let orders = await allModels.orderItems.aggregate([
            { $match: { "sellerId": mongoose.Types.ObjectId(req.userId) } },
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
            { $group: { _id: "$orderId" } },
            { $count: "totalOrders" }
        ]);

        resolve((orders.length > 0) ? orders[0].totalOrders : 0);
    })

}

//complete
totalSales = async (req, res) => {
    return new Promise(async (resolve, reject) => {
        let filter = { '$and': [] };

        filter['$and'].push({ 'orders.createdDate': { $gte: req.body.start_date } })
        filter['$and'].push({ 'orders.createdDate': { $lte: req.body.last_date } })


        let orders = await allModels.orderItems.aggregate([
            { $match: { "sellerId": mongoose.Types.ObjectId(req.userId) } },
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
                    as: "productvariants"
                }
            },
            { $unwind: "$productvariants" },
            {
                $project: {
                    NetSales: {
                        $multiply: [{ $subtract: [{ $toDouble: "$retailPrice" }, { $add: ["$totalDiscount", { $toDouble: "$RefundedAmount" }] }] }, "$quantity"]
                    },
                }
            },
            {
                $group: {
                    _id: null,
                    totalSale: { $sum: "$NetSales" }
                }
            }
        ]);

        resolve((orders.length > 0) ? orders[0].totalSale : 0)
    });
}

//complete
productReviews = async (req, res) => {
    const filter = req.body.date_filter;
    let productReviews = await allModels.productVarientReview.aggregate([
        { $match: filter },
        {
            $lookup: {
                from: "productvariants",
                localField: "productVariantId",
                foreignField: "_id",
                as: "productvariants",
            },
        },
        { $match: { "productvariants.sellerId": mongoose.Types.ObjectId(req.userId) } },
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

//complete
yourFollowers = async (req, res) => {

    return new Promise(async (resolve, reject) => {
        const filter = req.body.date_filter;
        let followers = await allModels.customer_seller_follow.aggregate([
            { $match: { "sellerId": mongoose.Types.ObjectId(req.userId) } },
            { $match: filter },
            { $count: "totalFollowers" }
        ]);
        resolve((followers.length > 0) ? followers[0].totalFollowers : 0)
    })

}

//complete
totalStock = async (req, res) => {

    return new Promise(async (resolve, reject) => {
        let inventoryQuantity = 0
        let productStocks = await allModels.productVariant.aggregate([
            { $match: { "sellerId": mongoose.Types.ObjectId(req.userId) } },
            {
                $project: {
                    "_id": 1,
                    "inventoryQuantity": 1,
                    "updatedAt": 1
                }
            },
            {
                $group: {
                    _id: null,
                    inventoryQuantity: { $sum: { $toDouble: "$inventoryQuantity" } }
                }
            }
        ])
        resolve((productStocks.length > 0) ? productStocks[0].inventoryQuantity : 0)
    })
}

//complete
orderproductsRefundedToday = async (req, res) => {
    const sellerId = mongoose.Types.ObjectId(req.userId);

    let todayStart = new Date();
    todayStart.setHours(00);
    todayStart.setMinutes(00);
    todayStart.setSeconds(00);

    let products = await allModels.orderItems.aggregate([
        { $match: { "sellerId": sellerId } },
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
            $project: {
                createdDate: 1,
                updatedDate: 1,
                Refunded: 1,
                RefundedDateTime: 1,
                isToday: { $cmp: ["$RefundedDateTime", todayStart] },
                quantity: 1,
            }
        },
        {
            $match: {
                $and: [
                    { Refunded: true },
                    { isToday: 1 },
                ]
            }
        },
        {
            $group: {
                _id: "$Refunded",
                totalUnits: { $sum: { $toInt: "$quantity" } }
            }
        }

    ])

    return ((products.length > 0) ? products[0].totalUnits : 0)

}

//complete
orderproductsRefunded = async (req, res) => {

    const sellerId = mongoose.Types.ObjectId(req.userId);
    let startDate = req.body.first;
    let endDate = req.body.last;

    // console.log(startDate, endDate);

    let products = await allModels.orderItems.aggregate([
        { $match: { "sellerId": sellerId } },
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
            $project: {
                createdDate: 1,
                updatedDate: 1,
                Refunded: 1,
                RefundedDateTime: 1,
                quantity: 1,
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
            $group: {
                _id: "$Refunded",
                totalUnits: { $sum: { $toInt: "$quantity" } }
            }
        }
    ]);
    return (((products.length > 0) ? products[0].totalUnits : 0))
}

//complete
totalUnitsSold = async (req, res) => {

    // const filter = req.body.date_filter;
    let filter = { '$and': [] };

    filter['$and'].push({ 'orders.createdDate': { $gte: req.body.start_date } })
    filter['$and'].push({ 'orders.createdDate': { $lte: req.body.last_date } })

    let products = await allModels.orderItems.aggregate([
        { $match: { "sellerId": mongoose.Types.ObjectId(req.userId) } },
        {
            $lookup: {
                from: "orders",
                localField: "orderId",
                foreignField: "_id",
                as: "orders",
            }
        },
        { $unwind: "$orders" },
        { $match: filter },
        {
            $project: {
                sale: { $sum: "$quantity" },
                orderId: "$orders._id",
                indexNo: "$orders.indexNo",
            }
        },
        {
            $group: {
                _id: "$orderId",
                totalUnitsSold: { $sum: "$sale" },
            },
        },
        {
            $group: {
                _id: null,
                totalUnitsSold: { $sum: "$totalUnitsSold" }
            }
        }
    ])
    //((products.length > 0) ? products[0].totalUnits : 0)
    return ((products.length > 0) ? products[0].totalUnitsSold : 0)
}

//
yourOrders = async (req, res) => {
    return new Promise(async (resolve, reject) => {
        let filter = { '$and': [] };

        filter['$and'].push({ 'orders.createdDate': { $gte: req.body.start_date } })
        filter['$and'].push({ 'orders.createdDate': { $lte: req.body.last_date } })

        let products = await allModels.orderItems.aggregate([
            { $match: { "sellerId": mongoose.Types.ObjectId(req.userId) } },
            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "orders",
                },
            },
            { $match: filter },
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
        let statusList = ["New", "Processing", "Ready_To_Pickup", "Shipped", "Delivered", "Cancelled", "Refunded", "On_Hold"]
        // console.log(req.userId);
        for (let index = 0; index < statusList.length; index++) {
            const ele = statusList[index];
            let statusFilter = products.filter(f => f._id == ele);
            if (statusFilter.length == 0) {
                products.push({ _id: ele, count: 0 });
            }
        }
        products = products.sort(function (a, b) {
            a = a._id.toLowerCase();
            b = b._id.toLowerCase();

            return a < b ? -1 : a > b ? 1 : 0;
        })
        //return products
        resolve(products)
    })
}

//
sellerCustomerMessages = async (req, res) => {
    const filter = req.body.date_filter;
    let messages = await allModels.customerSellerMessaging.aggregate([
        {
            $match: {
                $or: [
                    // { "from": mongoose.Types.ObjectId(req.userId) },
                    { "to": mongoose.Types.ObjectId(req.userId) }
                ]
            }
        },
        { $match: filter },
        {
            $project: {
                seenMessageCount: {
                    $cond: [{ $eq: ["$isSeen", true] }, { $sum: 1 }, 0]
                },
                unseenMessageCount: {
                    $cond: [{ $eq: ["$isSeen", false] }, { $sum: 1 }, 0]
                }
            }
        },
        {
            $group: {
                _id: null,
                seenMessageCount: { $sum: "$seenMessageCount" },
                unseenMessageCount: { $sum: "$unseenMessageCount" }
            }
        }
    ])
    return ((messages.length > 0) ? messages[0] : 0)

    // return res.send({count:messages.length,data:messages})
}

salesSummary = async (req, res) => {
    let filter = { '$and': [] };

    filter['$and'].push({ 'orders.createdDate': { $gte: req.body.start_date } })
    filter['$and'].push({ 'orders.createdDate': { $lte: req.body.last_date } })

    let startDate = req.body.first;
    let endDate = req.body.last;

    // console.log(req.body.duration_type);
    let orderProduct = null;
    let refundedQuantity = null;
    if (req.body.duration_type === "week") {
        orderProduct = await allModels.orderItems.aggregate([
            { $match: { sellerId: mongoose.Types.ObjectId(req.userId) } },
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
            { $match: { "sellerId": mongoose.Types.ObjectId(req.userId) } },
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
            { $match: { sellerId: mongoose.Types.ObjectId(req.userId) } },
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
            { $match: { "sellerId": mongoose.Types.ObjectId(req.userId) } },
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
            { $match: { sellerId: mongoose.Types.ObjectId(req.userId) } },
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
            { $match: { "sellerId": mongoose.Types.ObjectId(req.userId) } },
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
            { $match: { sellerId: mongoose.Types.ObjectId(req.userId) } },
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
            { $match: { "sellerId": mongoose.Types.ObjectId(req.userId) } },
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