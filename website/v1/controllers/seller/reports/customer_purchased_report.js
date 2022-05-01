const path = require("path");
var XLSX = require('xlsx');

// Third party modules
const { ObjectId } = require("mongoose").Types;
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');
// Local modules
const ALL_MODELS = require("../../../../../utilities/allModels");


const customer_purchased_report = async (req, res, next) => {

    let {
        start_date, end_date,
        quantity_orderd_start, quantity_orderd_end,
        total_amount_start, total_amount_end, search, limit, page
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


    try {
        const sellerId = ObjectId(req.userId);

        // Filter
        let filter = { $and: [] };

        let Searchfilter = {};

        if (search) {
            const regexp = new RegExp(search, "i");

            Searchfilter["$or"] = [
                { "customer.fullName": regexp },
                { "customer.email": regexp },
                { "customer.phone": regexp },
            ];

            if (parseInt(search) != NaN) {
                Searchfilter["$or"].push({ "totalQuantityOrdered": parseInt(search) })
                Searchfilter["$or"].push({ "totalAmount": parseInt(search) })
            }
        }

        /**
         * Filtering according to date
         */
        const defaultDate = new Date();
        defaultDate.setHours(00); defaultDate.setMinutes(00); defaultDate.setSeconds(00);
        defaultDate.setMonth(defaultDate.getMonth() - 1);

        if (start_date) {
            start_date = new Date(start_date)
            start_date.setHours(23); start_date.setMinutes(59); start_date.setSeconds(59);
            start_date.setDate(start_date.getDate() - 1)
            let dt = convertDateTime(start_date);
            filter['$and'].push({ "orders.createdDate": { $gte: dt } })
        }
        if (end_date) {
            end_date = new Date(end_date)
            end_date.setHours(23); end_date.setMinutes(59); end_date.setSeconds(59);
            // end_date.setDate(end_date.getDate() + 1)
            let dt = convertDateTime(end_date);
            filter['$and'].push({ "orders.createdDate": { $lte: dt } })
        }

        // Going to apply defalult 60 date filter
        if (!start_date) {
            let dt = convertDateTime(defaultDate);
            filter['$and'].push({ "orders.createdDate": { $gte: dt } })
        }


        /**
         * Filtering 
         */
        let filterSecond = {};

        // total ordered quantity
        if (quantity_orderd_start) {
            if (!filterSecond['$and']) {
                filterSecond['$and'] = []
            }
            filterSecond['$and'].push({ totalQuantityOrdered: { $gte: Number(quantity_orderd_start) } })
        }

        if (quantity_orderd_end) {
            if (!filterSecond['$and']) {
                filterSecond['$and'] = []
            }
            filterSecond['$and'].push({ totalQuantityOrdered: { $lte: Number(quantity_orderd_end) } })
        }
        // End of total ordered quantity

        // total amount
        if (total_amount_start) {
            if (!filterSecond['$and']) {
                filterSecond['$and'] = []
            }
            filterSecond['$and'].push({ totalAmount: { $gte: (Number(total_amount_start) - 1) } })
        }

        if (total_amount_end) {
            if (!filterSecond['$and']) {
                filterSecond['$and'] = []
            }
            filterSecond['$and'].push({ totalAmount: { $lte: (Number(total_amount_end) + 1) } })
        }
        // End of total amount

        //console.log("filterSecond", JSON.stringify(filterSecond));

        // Fetching sale
        const customer_purchased = await ALL_MODELS.orderItems.aggregate([
            // lookup
            {
                $lookup: {
                    from: "productvariants",
                    localField: "productVariantId",
                    foreignField: "_id",
                    as: "productVariants"
                }
            },
            // lookup
            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "orders"
                }
            },
            { $unwind: "$orders" },
            // Match 
            { $match: filter },
            { $match: { "productVariants.sellerId": sellerId } },

            // group
            {
                $group: {
                    _id: "$orderId",
                    totalQuantityOrdered: {
                        $sum: { $toDouble: "$quantity" }
                    },
                    totalAmount: {
                        $sum: { $toDouble: "$grandTotal" }
                    }
                }
            },
            // lookup
            {
                $lookup: {
                    from: "orders",
                    localField: "_id",
                    foreignField: "_id",
                    as: "orders"
                }
            },
            // project
            {
                $project: {
                    orderId: "$_id", totalQuantityOrdered: 1, totalAmount: 1,
                    // totalGrossAmount: 1,
                    customerId: { $first: "$orders.customerId" }
                }
            },
            // group
            {
                $group: {
                    _id: "$customerId",
                    totalQuantityOrdered: {
                        $sum: "$$ROOT.totalQuantityOrdered"
                    },
                    totalAmount: {
                        $sum: "$$ROOT.totalAmount"
                    }
                }
            },
            // match
            { $match: filterSecond },
            // lookup
            {
                $lookup: {
                    from: "customers",
                    localField: "_id",
                    foreignField: "_id",
                    as: "customers"
                }
            },
            // project
            {
                $project: {
                    orderId: 1, totalQuantityOrdered: 1, //totalNetAmount: 1,
                    // totalGrossAmount: 1,
                    //totalValue: 1,
                    totalAmount: 1,
                    customer: {
                        fullName: {
                            $concat: [
                                { $first: "$customers.firstName" },
                                " ",
                                { $first: "$customers.lastName" },
                            ]
                        },
                        email: { $first: "$customers.emailAddress" },
                        phone: { $first: "$customers.mobilePhone" },
                    }
                }
            },
            { $match: Searchfilter },
            {
                $sort: { totalAmount: -1 }
            },
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

        let totalCount = 0
        try {
            totalCount = customer_purchased[0].totalCount[0].count
        } catch (err) { }


        return res.json({
            totalCount: totalCount,
            count: customer_purchased[0].paginatedResults.length,
            data: customer_purchased.length ? customer_purchased[0].paginatedResults : []
        });


    } catch (error) { return res.status(403).send({ message: error.message }); }


}// End of customer_purchased_report

const customer_purchased_report_excel = async (req, res, next) => {

    let {
        start_date, end_date,
        quantity_orderd_start, quantity_orderd_end,
        total_amount_start, total_amount_end, search
    } = req.body;


    try {
        const sellerId = ObjectId(req.userId);

        // Filter        
        let filter = { $and: [] };

        let Searchfilter = {};

        if (search) {
            const regexp = new RegExp(search, "i");

            Searchfilter["$or"] = [
                { "customer.fullName": regexp },
                { "customer.email": regexp },
                { "customer.phone": regexp },
            ];

            if (parseInt(search) != NaN) {
                Searchfilter["$or"].push({ "totalQuantityOrdered": parseInt(search) })
                Searchfilter["$or"].push({ "totalAmount": parseInt(search) })
            }
        }

        /**
         * Filtering according to date
         */
        const defaultDate = new Date();
        defaultDate.setHours(00); defaultDate.setMinutes(00); defaultDate.setSeconds(00);
        defaultDate.setMonth(defaultDate.getMonth() - 1);

        if (start_date) {
            start_date = new Date(start_date)
            start_date.setHours(23); start_date.setMinutes(59); start_date.setSeconds(59);
            start_date.setDate(start_date.getDate() - 1)
            let dt = convertDateTime(start_date);
            filter['$and'].push({ "orders.createdDate": { $gte: dt } })
        }
        if (end_date) {
            end_date = new Date(end_date)
            end_date.setHours(23); end_date.setMinutes(59); end_date.setSeconds(59);
            // end_date.setDate(end_date.getDate() + 1)
            let dt = convertDateTime(end_date);
            filter['$and'].push({ "orders.createdDate": { $lte: dt } })
        }

        // Going to apply defalult 60 date filter
        if (!start_date) {
            let dt = convertDateTime(defaultDate);
            filter['$and'].push({ "orders.createdDate": { $gte: dt } })
        }


        /**
         * Filtering 
         */
        let filterSecond = {};

        // total ordered quantity
        if (quantity_orderd_start) {
            if (!filterSecond['$and']) {
                filterSecond['$and'] = []
            }
            filterSecond['$and'].push({ totalQuantityOrdered: { $gte: Number(quantity_orderd_start) } })
        }

        if (quantity_orderd_end) {
            if (!filterSecond['$and']) {
                filterSecond['$and'] = []
            }
            filterSecond['$and'].push({ totalQuantityOrdered: { $lte: Number(quantity_orderd_end) } })
        }
        // End of total ordered quantity

        // total amount
        if (total_amount_start) {
            if (!filterSecond['$and']) {
                filterSecond['$and'] = []
            }
            filterSecond['$and'].push({ totalAmount: { $gte: (Number(total_amount_start) - 1) } })
        }

        if (total_amount_end) {
            if (!filterSecond['$and']) {
                filterSecond['$and'] = []
            }
            filterSecond['$and'].push({ totalAmount: { $lte: (Number(total_amount_end) + 1) } })
        }
        // End of total amount

        //console.log(sellerId);

        // Fetching sale
        const customer_purchased = await ALL_MODELS.orderItems.aggregate([
            // lookup
            {
                $lookup: {
                    from: "productvariants",
                    localField: "productVariantId",
                    foreignField: "_id",
                    as: "productVariants"
                }
            },
            // lookup
            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "orders"
                }
            },
            { $unwind: "$orders" },

            // Match 
            { $match: filter },
            { $match: { "productVariants.sellerId": sellerId } },

            // group
            {
                $group: {
                    _id: "$orderId",
                    totalQuantityOrdered: {
                        $sum: { $toDouble: "$quantity" }
                    },
                    totalAmount: {
                        $sum: { $toDouble: "$grandTotal" }
                    }
                }
            },
            // lookup
            {
                $lookup: {
                    from: "orders",
                    localField: "_id",
                    foreignField: "_id",
                    as: "orders"
                }
            },
            // project
            {
                $project: {
                    orderId: "$_id", totalQuantityOrdered: 1, totalAmount: 1,
                    // totalGrossAmount: 1,
                    customerId: { $first: "$orders.customerId" }
                }
            },
            // group
            {
                $group: {
                    _id: "$customerId",
                    totalQuantityOrdered: {
                        $sum: "$$ROOT.totalQuantityOrdered"
                    },
                    totalAmount: {
                        $sum: "$$ROOT.totalAmount"
                    }
                }
            },
            // match
            { $match: filterSecond },
            // lookup
            {
                $lookup: {
                    from: "customers",
                    localField: "_id",
                    foreignField: "_id",
                    as: "customers"
                }
            },
            // project
            {
                $project: {
                    orderId: 1, totalQuantityOrdered: 1, //totalNetAmount: 1,
                    // totalGrossAmount: 1,
                    //totalValue: 1,
                    totalAmount: 1,
                    customer: {
                        fullName: {
                            $concat: [
                                { $first: "$customers.firstName" },
                                " ",
                                { $first: "$customers.lastName" },
                            ]
                        },
                        email: { $first: "$customers.emailAddress" },
                        phone: { $first: "$customers.mobilePhone" },
                    }
                }
            },
            { $match: Searchfilter },
            {
                $sort: { totalAmount: -1 }
            },

        ]);

        //console.log("customer_purchased", customer_purchased)

        var wb = XLSX.utils.book_new(); //new workbook
        let excelExportData = []

        for (let index = 0; index < customer_purchased.length; index++) {
            const element = customer_purchased[index];
            // console.log("element", element)

            excelExportData.push({
                // _id: element._id,
                CustomerFullName: element.customer.fullName,
                CustomerEmail: element.customer.email,
                CustomerPhoneNumber: element.customer.phone,
                TotalQuantityOrdered: element.totalQuantityOrdered,
                TotalAmount: element.totalAmount,

            })

        }
        // excelExportData.push(customer_purchased)


        var temp = JSON.stringify(excelExportData);
        temp = JSON.parse(temp);
        var ws = XLSX.utils.json_to_sheet(temp);
        let today = new Date();

        let folder = `uploads/reports/seller-report/${req.userId}/`;
        //check if folder exist or not if not then create folder user createdirectory middleware
        await createDirectories(folder);
        //Total Amount Bought By The Customer Specifically Report
        var down = `${folder}total_amount_bought_by_the_customer_report_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`
        XLSX.utils.book_append_sheet(wb, ws, "sheet1");
        XLSX.writeFile(wb, down);

        let newReport = new ALL_MODELS.reportModel({
            sellerId: req.userId,
            ReportName: "Customer Purchased Report",
            ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
        })

        let data = await newReport.save()

        return res.send({ message: "Your XL will start downloading now.", d: data })
    } catch (error) { return res.status(403).send({ message: error.message }); }


}// End of customer_purchased_report excel 


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

module.exports = { customer_purchased_report, customer_purchased_report_excel };