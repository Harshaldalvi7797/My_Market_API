let allModels = require("../../../../../utilities/allModels")
const { validationResult } = require('express-validator');
let mongoose = require("mongoose");
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


exports.getdashboardOrderdata = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    setTime(req)

    let noOforders = await sellerOrderStat(req)
    let avOrderValue = await averageOrderValue(req)
    let orderstatussummary = await orderStatusSummary(req)
    let topSelleingProduct = await topSellingProducts(req)
    let monthwiseOrders = await ordersByDuration(req)
    // console.log(JSON.stringify(monthwiseOrders));

    return res.send({
        NoOfOrders: noOforders, topSellingProducts: topSelleingProduct,
        orders: monthwiseOrders,
        averageOrderValue: avOrderValue, orderStatusSummary: orderstatussummary

    })
}

const sellerOrderStat = async (req, res) => {

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

    return ((orders.length > 0) ? orders[0].totalOrders : 0)
}

const averageOrderValue = async (req, res) => {
    let filter = { '$and': [] };

    filter['$and'].push({ 'orders.createdDate': { $gte: req.body.start_date } })
    filter['$and'].push({ 'orders.createdDate': { $lte: req.body.last_date } })
    // console.log(JSON.stringify(filter));

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

const topSellingProducts = async (req, res) => {
    let filter = { '$and': [] };

    filter['$and'].push({ 'orders.createdDate': { $gte: req.body.start_date } })
    filter['$and'].push({ 'orders.createdDate': { $lte: req.body.last_date } })

    //order date
    let sellerOrders = await allModels.orderItems.aggregate([
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
                as: "productvariants",
            },
        },
        {
            $group: {
                _id: "$productVariantId",
                totalSales: { $sum: "$quantity" },
                productName: { "$first": "$productvariants.productVariantDetails" }
                // itemsSold: { $push:  { item: "$item", quantity: "$quantity" } }
            },
        },
        {
            $project: {
                totalSales: 1,
                "productName.productVariantName": 1,
                "productName.pv_language": 1,
            }
        },
        { $sort: { totalSales: -1 } },
        { $limit: 5 }
    ])
    return (sellerOrders)
    // console.log(dateDifference("2021-12-30T09:24:16.090+00:00", "2021-12-31T09:24:16.090+00:00"))

    // return res.send({ count: sellerOrders.length, data: sellerOrders })

}

const ordersByDuration = async (req, res) => {
    let filter = { '$and': [] };

    // console.log(req.body.start_date, req.body.last_date)
    filter['$and'].push({ 'orders.createdDate': { $gte: req.body.start_date } })
    filter['$and'].push({ 'orders.createdDate': { $lte: req.body.last_date } })

    let orderProduct = null;
    if (req.body.duration_type === "week") {
        orderProduct = await allModels.orderItems.aggregate([
            { $match: { sellerId: ObjectId(req.userId) } },
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
                    uniqueValues: { $addToSet: "$orderId" },
                    createdAt: { $first: "$orders.createdAt" }
                }
            },
            {
                $project: {
                    orderId: "$_id",
                    days: { $dayOfWeek: { $toDate: "$createdAt" } },
                    week: { $week: { $toDate: "$createdAt" } },
                    date: { $dateToString: { format: "%d-%m-%Y", date: { $toDate: "$createdAt" } } }
                }
            },
            {
                $group: {
                    _id: { $concat: [{ $toString: "$days" }, { $toString: "$week" }] },
                    numberOfOrders: { $sum: 1 },
                    week: { $first: "$week" },
                    date: { $first: "$date" },
                    days: { $first: "$days" },
                }
            },
            {
                $project: {
                    days: "$days",
                    numberOfOrders: 1,
                    week: 1,
                    date: 1
                }
            },
            {
                $sort: { "week": 1, "days": 1 }
            }
        ])

        let weekList = [];
        for (let a = 0; a < orderProduct.length; a++) {
            const ele = orderProduct[a];

            let weekFilter = weekList.filter(f => f == ele.week)
            if (weekFilter.length == 0) {
                weekList.push(ele.week);
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
                        numberOfOrders: 0,
                        week: today.getWeek(),
                        date: `${("0" + today.getDate()).slice(-2)}-${("0" + (today.getMonth() + 1)).slice(-2)}-${today.getFullYear()}`,
                        days: daysGet
                    })
                }
            }
        }

        orderProduct = arraySort(orderProduct, ['week', 'days']);
    }

    if (req.body.duration_type === "month") {
        orderProduct = await allModels.orderItems.aggregate([
            { $match: { sellerId: ObjectId(req.userId) } },
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
                    uniqueValues: { $addToSet: "$orderId" },
                    createdAt: { $first: "$orders.createdAt" }
                }
            },
            {
                $project: {
                    orderId: "$_id",
                    week: { $week: { $toDate: "$createdAt" } }
                }
            },
            {
                $group: {
                    _id: "$week",
                    numberOfOrders: { $sum: 1 }
                }
            },
            {
                $project: {
                    week: "$_id",
                    numberOfOrders: 1
                }
            },
            {
                $sort: { "week": 1 }
            }
        ])

        let sMonth = new Date();
        let eMonth = new Date();

        sMonth.setDate(01);

        for (let index = sMonth.getWeek(); index <= eMonth.getWeek(); index++) {
            let dataFilter = orderProduct.filter(f => f.week == index);
            if (dataFilter.length == 0) {
                orderProduct.push({
                    week: index,
                    numberOfOrders: 0
                })
            }
        }

        if (orderProduct.length == 0) {
            for (let index = sMonth.getWeek(); index <= eMonth.getWeek(); index++) {
                orderProduct.push({
                    week: index,
                    numberOfOrders: 0
                })
            }
        }

        orderProduct = arraySort(orderProduct, ['week']);

        return (orderProduct)
    }

    if (req.body.duration_type === "year") {
        orderProduct = await allModels.orderItems.aggregate([
            { $match: { sellerId: ObjectId(req.userId) } },
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
                    uniqueValues: { $addToSet: "$orderId" },
                    createdAt: { $first: "$orders.createdAt" }
                }
            },
            {
                $project: {
                    orderId: "$_id",
                    month: { $month: { $toDate: "$createdAt" } }
                }
            },
            {
                $group: {
                    _id: "$month",
                    numberOfOrders: { $sum: 1 }
                }
            },
            {
                $project: {
                    month: "$_id",
                    numberOfOrders: 1
                }
            },
            {
                $sort: { "month": 1 }
            }

        ])

        let todayMonth = new Date();
        if (orderProduct.length < todayMonth.getMonth() + 1) {
            for (let index = 1; index <= todayMonth.getMonth() + 1; index++) {
                let monthFilter = orderProduct.filter(f => f.month == index);
                if (monthFilter.length == 0) {
                    orderProduct.push({ "_id": index, "numberOfOrders": 0, "month": index })
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

        return (orderProduct)
    }

    if (req.body.duration_type === "custom") {
        orderProduct = await allModels.orderItems.aggregate([
            { $match: { sellerId: ObjectId(req.userId) } },
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
                    uniqueValues: { $addToSet: "$orderId" },
                    createdAt: { $first: "$orders.createdAt" }
                }
            },
            {
                $project: {
                    orderId: "$_id",
                    date: { $dateToString: { format: "%d-%m-%Y", date: { $toDate: "$createdAt" } } }
                }
            },
            {
                $group: {
                    _id: "$date",
                    numberOfOrders: { $sum: 1 }
                }
            },
            {
                $project: {
                    date: "$_id",
                    numberOfOrders: 1
                }
            },
            {
                $sort: { "date": 1 }
            }

        ])

        return (orderProduct)
    }

    return (orderProduct)
}

const orderStatusSummary = async (req, res) => {
    // let filter = { '$and': [] };

    // filter['$and'].push({ 'orders.createdDate': { $gte: req.body.start_date } })
    // filter['$and'].push({ 'orders.createdDate': { $lte: req.body.last_date } })

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
    return products
    // return res.send(products)
}


