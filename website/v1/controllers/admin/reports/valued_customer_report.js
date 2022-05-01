const path = require("path");
// Local modules
const ALL_MODELS = require(path.join(__dirname, "..", "..", "..", "..", "..", "utilities/allModels"));
var XLSX = require("xlsx");
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');

const valued_customer_report = async (req, res, next) => {
    const {
        valued = "most",
        start_date, end_date,
        quantity_ordered_start, quantity_ordered_end,
        total_amount_start, total_amount_end,
        search
    } = req.body;

    let { limit, page, } = req.body;

    if (!limit) { limit = 10; }
    if (!page) { page = 1; }

    let perPage = parseInt(limit);
    let pageNo = Math.max(0, parseInt(page));

    if (pageNo > 0) {
        pageNo = pageNo - 1;
    } else if (pageNo < 0) {
        pageNo = 0;
    }

    try {
        let searchFilter = {};

        if (search) {
            const regexp = new RegExp(search, "i");

            searchFilter["$or"] = [
                { "customer.mobilePhone": regexp },
                { "name": regexp },
                { "customer.emailAddress": regexp },
            ];

            if (parseFloat(search) != NaN) {
                searchFilter["$or"].push({ totalAmount: parseFloat(search) });
                searchFilter["$or"].push({ totalOrderdProductQuantity: parseInt(search) });
            }
        }

        // Filter
        const filter = {};
        /**
         * Filtering according to date
         */
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() - 60);

        if (start_date)
            filter.createdAt = { $gte: new Date(start_date) }
        if (end_date)
            filter.createdAt = { $lte: new Date(end_date) }
        if (start_date && end_date) {
            filter.createdAt = {
                $gte: new Date(start_date),
                $lte: new Date(end_date)
            }
        }

        // Going to apply defalult 60 day date filter
        if (!start_date)
            filter.createdAt = { $gte: defaultDate }
        /**
         * Filtering 
         */
        const filterSecond = {};

        // quantity ordered
        if (quantity_ordered_start)
            filterSecond.totalOrderdProductQuantity = { $gte: quantity_ordered_start }
        if (quantity_ordered_end)
            filterSecond.totalOrderdProductQuantity = { $lte: quantity_ordered_end }
        if (quantity_ordered_start && quantity_ordered_end) {
            filterSecond.totalOrderdProductQuantity = {
                $gte: quantity_ordered_start,
                $lte: quantity_ordered_end
            }
        }
        // End of quantity ordered


        // total amount
        if (total_amount_start)
            filterSecond.totalAmount = { $gte: (total_amount_start) }
        if (total_amount_end)
            filterSecond.totalAmount = { $lte: (total_amount_end) }
        if (total_amount_start && total_amount_end) {
            filterSecond.totalAmount = {
                $gte: total_amount_start,
                $lte: total_amount_end
            }
        }
        // End of total amount

        // Sorting
        const sortBy = {};
        if (valued.toLowerCase() === "most") sortBy.totalAmount = -1;
        else if (valued.toLowerCase() === "least") sortBy.totalAmount = 1;
        else sortBy.totalAmount = -1;

        // Fetching valued customer based on order
        const valuedCustomers = await ALL_MODELS.orderItems.aggregate([
            // match
            { $match: filter },
            // group
            {
                $group: {
                    _id: "$orderId",
                    totalProductQuantity: { $sum: "$quantity" },
                    totalOrderAmount: { $sum: "$grandTotal" },
                    orderId: { $first: "$orderId" },
                }
            },
            // lookup
            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "order"
                }
            },
            { $unwind: "$order" },
            // lookup
            {
                $lookup: {
                    from: "customers",
                    localField: "order.customerId",
                    foreignField: "_id",
                    as: "customer"
                }
            },
            { $unwind: "$customer" },

            // group
            {
                $group: {
                    _id: "$customer._id",
                    totalAmount: {
                        $sum: "$totalOrderAmount"
                    },
                    totalOrderdProductQuantity: {
                        $sum: "$totalProductQuantity"
                    },
                    totalProduct: { $sum: 1 },
                    customerId: { $first: "$customer._id" },
                    name: {
                        $first: { $concat: ["$customer.firstName", " ", "$customer.lastName"] }
                    },
                    email: { $first: "$customer.emailAddress" },
                    phone: { $first: "$customer.mobilePhone" },
                }
            },
            // match
            { $match: filterSecond },
            { $match: searchFilter },
            // sort
            { $sort: sortBy },
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

        let totalCount = 0;
        try {
            totalCount = valuedCustomers[0].totalCount[0].count;
        } catch (err) { }

        return res.json({
            totalCount: totalCount,
            data: valuedCustomers.length ? valuedCustomers[0].paginatedResults : [],
            pageNo: pageNo,
        });
    } catch (error) { return res.status(403).send({ message: error.message }); }
}// End of valued_customer_report

const valued_customer_report_excel = async (req, res, next) => {
    const {
        valued = "most",
        start_date, end_date,
        quantity_ordered_start, quantity_ordered_end,
        total_amount_start, total_amount_end,
        search
    } = req.body;

    try {
        let searchFilter = {};

        if (search) {
            const regexp = new RegExp(search, "i");

            searchFilter["$or"] = [
                { "customer.mobilePhone": regexp },
                { "name": regexp },
                { "customer.emailAddress": regexp },
            ];

            if (parseFloat(search) != NaN) {
                searchFilter["$or"].push({ totalAmount: parseFloat(search) });
                searchFilter["$or"].push({ totalOrderdProductQuantity: parseInt(search) });
            }
        }

        // Filter
        const filter = {};
        /**
         * Filtering according to date
         */
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() - 60);

        if (start_date)
            filter.createdAt = { $gte: new Date(start_date) }
        if (end_date)
            filter.createdAt = { $lte: new Date(end_date) }
        if (start_date && end_date) {
            filter.createdAt = {
                $gte: new Date(start_date),
                $lte: new Date(end_date)
            }
        }

        // Going to apply defalult 60 day date filter
        if (!start_date)
            filter.createdAt = { $gte: defaultDate }
        /**
         * Filtering 
         */
        const filterSecond = {};

        // quantity ordered
        if (quantity_ordered_start)
            filterSecond.totalOrderdProductQuantity = { $gte: quantity_ordered_start }
        if (quantity_ordered_end)
            filterSecond.totalOrderdProductQuantity = { $lte: quantity_ordered_end }
        if (quantity_ordered_start && quantity_ordered_end) {
            filterSecond.totalOrderdProductQuantity = {
                $gte: quantity_ordered_start,
                $lte: quantity_ordered_end
            }
        }
        // End of quantity ordered


        // total amount
        if (total_amount_start)
            filterSecond.totalAmount = { $gte: total_amount_start }
        if (total_amount_end)
            filterSecond.totalAmount = { $lte: total_amount_end }
        if (total_amount_start && total_amount_end) {
            filterSecond.totalAmount = {
                $gte: total_amount_start,
                $lte: total_amount_end
            }
        }
        // End of total amount

        // Sorting
        const sortBy = {};
        if (valued.toLowerCase() === "most") sortBy.totalAmount = -1;
        else if (valued.toLowerCase() === "least") sortBy.totalAmount = 1;
        else sortBy.totalAmount = 1;

        // Fetching valued customer based on order
        const valuedCustomers = await ALL_MODELS.orderItems.aggregate([
            // match
            { $match: filter },
            // group
            {
                $group: {
                    _id: "$orderId",
                    totalProductQuantity: { $sum: "$quantity" },
                    totalOrderAmount: { $sum: "$grandTotal" },
                    orderId: { $first: "$orderId" },
                }
            },
            // lookup
            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "order"
                }
            },
            { $unwind: "$order" },
            // lookup
            {
                $lookup: {
                    from: "customers",
                    localField: "order.customerId",
                    foreignField: "_id",
                    as: "customer"
                }
            },
            { $unwind: "$customer" },

            // group
            {
                $group: {
                    _id: "$customer._id",
                    totalAmount: {
                        $sum: "$totalOrderAmount"
                    },
                    totalOrderdProductQuantity: {
                        $sum: "$totalProductQuantity"
                    },
                    totalProduct: { $sum: 1 },
                    customerId: { $first: "$customer._id" },
                    name: {
                        $first: {
                            $concat: [
                                "$customer.firstName",
                                " ",
                                "$customer.lastName"
                            ]
                        }
                    },
                    email: { $first: "$customer.emailAddress" },
                    phone: { $first: "$customer.mobilePhone" },
                }
            },
            // match
            { $match: filterSecond },
            { $match: searchFilter },
            // sort
            { $sort: sortBy },
        ]);

        var wb = XLSX.utils.book_new(); //new workbook
        let excelExportData = [];

        for (let index = 0; index < valuedCustomers.length; index++) {
            const element = valuedCustomers[index];

            excelExportData.push({
                Name: element.name,
                Email: element.email,
                Phone: element.phone,
                TotalProductQuantity: element.totalOrderdProductQuantity,
                TotalOrderAmount: element.totalAmount,
            });
        }

        var temp = JSON.stringify(excelExportData);
        temp = JSON.parse(temp);
        var ws = XLSX.utils.json_to_sheet(temp);
        let today = new Date();

        let folder = `uploads/reports/admin-report/${req.userId}/`;
        //check if folder exist or not if not then create folder user createdirectory middleware
        await createDirectories(folder);

        var down = `${folder}valued_customer_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
        XLSX.utils.book_append_sheet(wb, ws, "sheet1");
        XLSX.writeFile(wb, down);

        let newReport = new ALL_MODELS.reportModel({
            sellerId: req.userId,
            ReportName: "Valued Customer Report",
            ReportLink: (req.headers.host + down).replace(/uploads\//g, "/"),
        });

        let data = await newReport.save();

        return res.send({
            message: "Your XL will start downloading now.",
            d: data,
        });
    } catch (error) { return res.status(403).send({ message: error.message }); }
}


module.exports = { valued_customer_report, valued_customer_report_excel };