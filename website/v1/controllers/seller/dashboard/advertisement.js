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

exports.advertisementDashboard = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    setTime(req)

    let topAd = await topFiveAdvertisment(req)
    let clicks = await monthWiseAdClick(req)
    let advertiseNonAdvertiseDays = await advertiseDays(req)
    return res.send({
        topFiveAdvertise: topAd,
        advertiseClicks: clicks,
        advertiseNonAdvertiseClick: advertiseNonAdvertiseDays
    })
}

const topFiveAdvertisment = async (req, res) => {

    let filter = req.body.date_filter;

    let advertisment = await allModels.advertiseanalyticsModel.aggregate([
        { $match: { "sellerId": mongoose.Types.ObjectId(req.userId) } },
        { $match: filter },
        {
            $lookup:
            {
                from: "advertisementcampaigns",
                localField: "advertiseId",
                foreignField: "_id",
                as: "AdvertisementCamp"
            }
        },
        { $unwind: { path: "$AdvertisementCamp" } },
        {
            $group: {
                _id: "$advertiseId",
                totalClickCount: { $sum: "$clickCount" },
                campaignName: { "$first": "$AdvertisementCamp.campaignName" },
                sellerId: { "$first": "$sellerId" }
            },
        },
        { $sort: { totalClickCount: -1 } },
        { $limit: 5 }
    ])
    // console.log(JSON.stringify(advertisment))
    console.log(advertisment.length)
    return advertisment;
}

const monthWiseAdClick = async (req, res) => {
    let filter = req.body.date_filter;
    // filter["$and"][0].createdDate['$gte'] = 20220123000000;
    // console.log(JSON.stringify(filter))
    // console.log(req.userId)

    let advertisment
    if (req.body.duration_type === "week") {
        advertisment = await allModels.advertiseanalyticsModel.aggregate([
            { $match: { sellerId: ObjectId(req.userId) } },
            { $match: filter },
            {
                $project: {
                    clickCount: 1,
                    days: { $dayOfWeek: { $toDate: "$createdAt" } },
                    week: { $week: { $toDate: "$createdAt" } },
                    date: { $dateToString: { format: "%d-%m-%Y", date: { $toDate: "$createdAt" } } }
                }
            },
            {
                $group: {
                    _id: { $concat: [{ $toString: "$days" }, { $toString: "$week" }] },
                    days: { $first: "$days" },
                    week: { $first: "$week" },
                    date: { $first: "$date" },
                    totalClickCount: { $sum: "$clickCount" }
                }
            },
            { $sort: { "week": 1, "days": 1 } },
        ])

        let weekList = [];
        for (let a = 0; a < advertisment.length; a++) {
            const ele = advertisment[a];

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

                for (let a = 0; a < advertisment.length; a++) {
                    let ele = advertisment[a];
                    let orderDate = new Date(ele.date.split("-")[2], ele.date.split("-")[1] - 1, ele.date.split("-")[0], 00, 00, 00);
                    ele["dt"] = orderDate.getDate();
                }

                let check = advertisment.filter(f => f.dt == today.getDate())
                if (check.length == 0) {
                    let daysGet = weekDays.indexOf(today.toLocaleString('en-us', { weekday: 'short' }));
                    advertisment.push({
                        _id: `${daysGet}${today.getWeek()}`,
                        totalClickCount: 0,
                        week: today.getWeek(),
                        date: `${("0" + today.getDate()).slice(-2)}-${("0" + (today.getMonth() + 1)).slice(-2)}-${today.getFullYear()}`,
                        days: daysGet
                    })
                }
            }
        }

        orderProduct = arraySort(advertisment, ['week', 'days']);
    }
    if (req.body.duration_type === "month") {
        advertisment = await allModels.advertiseanalyticsModel.aggregate([
            { $match: { sellerId: ObjectId(req.userId) } },
            { $match: filter },
            {
                $project: {
                    clickCount: 1,
                    week: { $week: { $toDate: "$createdAt" } },
                }
            },
            {
                $group: {
                    _id: "$week",
                    week: { $first: "$week" },
                    totalClickCount: { $sum: "$clickCount" }
                }
            },
            { $sort: { _id: 1 } },
        ])

        let sMonth = new Date();
        let eMonth = new Date();

        sMonth.setDate(01);

        for (let index = sMonth.getWeek(); index <= eMonth.getWeek(); index++) {
            let dataFilter = advertisment.filter(f => f.week == index);
            if (dataFilter.length == 0) {
                advertisment.push({
                    _id: index,
                    week: index,
                    totalClickCount: 0
                })
            }
        }

        if (advertisment.length == 0) {
            for (let index = sMonth.getWeek(); index <= eMonth.getWeek(); index++) {
                advertisment.push({
                    _id: index,
                    week: index,
                    totalClickCount: 0
                })
            }
        }

        advertisment = arraySort(advertisment, ['week']);
    }
    if (req.body.duration_type === "year") {
        advertisment = await allModels.advertiseanalyticsModel.aggregate([
            { $match: { sellerId: ObjectId(req.userId) } },
            { $match: filter },
            {
                $project: {
                    clickCount: 1,
                    month: { $month: { $toDate: "$createdAt" } },
                }
            },
            {
                $group: {
                    _id: "$month",
                    month: { $first: "$month" },
                    totalClickCount: { $sum: "$clickCount" }
                }
            },
            { $sort: { _id: 1 } },
        ])

        let todayMonth = new Date();
        if (advertisment.length < todayMonth.getMonth() + 1) {
            for (let index = 1; index <= todayMonth.getMonth() + 1; index++) {
                let monthFilter = advertisment.filter(f => f.month == index);
                if (monthFilter.length == 0) {
                    advertisment.push({ "_id": index, "totalClickCount": 0, "month": index })
                }
            }
        }

        advertisment = advertisment.sort((a, b) => {
            if (a.month > b.month) {
                return 1
            } else {
                return -1
            }
        });

    }
    if (req.body.duration_type === "custom") {
        advertisment = await allModels.advertiseanalyticsModel.aggregate([
            { $match: { sellerId: ObjectId(req.userId) } },
            { $match: filter },
            {
                $project: {
                    clickCount: 1,
                    date: { $dateToString: { format: "%d-%m-%Y", date: { $toDate: "$createdAt" } } },
                }
            },
            {
                $group: {
                    _id: "$date",
                    date: { $first: "$date" },
                    totalClickCount: { $sum: "$clickCount" }
                }
            },
            { $sort: { _id: 1 } },
        ])
    }

    return advertisment
}

const advertiseDays = async (req, res) => {
    let filter = req.body.date_filter;

    let advertisment = await allModels.advertiseanalyticsModel.aggregate([
        { $match: { sellerId: ObjectId(req.userId) } },
        { $match: filter },
        {
            $project: {
                clickCount: 1
            }
        },
        {
            $group: {
                _id: null,
                totalClickCount: { $sum: "$clickCount" }
            }
        },
        { $sort: { _id: 1 } },
    ])

    let productVariants = await allModels.visitorsModel.aggregate([
        { $match: { sellerId: ObjectId(req.userId) } },
        { $match: filter },
        {
            $project: {
                clickCount: 1
            }
        },
        {
            $group: {
                _id: null,
                totalClickCount: { $sum: "$clickCount" }
            }
        },
        { $sort: { _id: 1 } },
    ])
    return {
        Advertisment: (advertisment.length > 0) ? advertisment[0].totalClickCount : 0,
        NonAdvertisment: (productVariants.length > 0) ? productVariants[0].totalClickCount : 0
    }

}
