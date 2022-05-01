var XLSX = require("xlsx");
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');

const ALL_MODELS = require("../../../../../utilities/allModels");

const coupon_usage_report = async (req, res, next) => {

    const {
        start_date, end_date, search,
        count_start, count_end, unit_discount_start, unit_discount_end,
        total_sale_start, total_sale_end,total_netsale_start, total_netsale_end,
        total_customer_saving_start, total_customer_saving_end,
        avg_saving_start, avg_saving_end,
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

        // Filter
        let filter = {};
        let filterSearch = {};

        if (search) {
            const regexp = new RegExp(search, "i");
            filterSearch["$or"] = [
                { "couponCode": regexp }
            ];
        }

        /**
         * Filtering according to date
         */
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() - 7);

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
        // Going to apply defalult 7 date filter
        if (!start_date)
            filter.createdAt = { $gte: defaultDate }

        // Filters
        const filtersecond = { $and: [] };
        if (count_start !== undefined && count_start >= 0) {
            filtersecond["$and"].push({ count: { $gte: parseInt(count_start) } });
        } else {
            filtersecond["$and"].push({ count: { $gte: 0 } });
        }

        if (count_end !== undefined && count_end >= 0) {
            filtersecond["$and"].push({ count: { $lte: parseInt(count_end) } });
        }

        if (total_sale_start) {
            filtersecond["$and"].push({ totalSale: { $gte: parseInt(total_sale_start) } });
        }
        if (total_sale_end) {
            filtersecond["$and"].push({ totalSale: { $lte: parseInt(total_sale_end) } });
        }
        
        if (total_netsale_start) {
            filtersecond["$and"].push({ totalNetSale: { $gte: parseInt(total_netsale_start) } });
        }
        if (total_netsale_end) {
            filtersecond["$and"].push({ totalNetSale: { $lte: parseInt(total_netsale_end) } });
        }

        if (unit_discount_start) {
            filtersecond["$and"].push({ unitDiscount: { $gte: parseInt(unit_discount_start) } });
        }
        if (unit_discount_end) {
            filtersecond["$and"].push({ unitDiscount: { $lte: parseInt(unit_discount_end) } });
        }

        if (total_customer_saving_start) {
            filtersecond["$and"].push({ totalCustomerSaving: { $gte: parseInt(total_customer_saving_start) } });
        }
        if (total_customer_saving_end) {
            filtersecond["$and"].push({ totalCustomerSaving: { $lte: parseInt(total_customer_saving_end) } });
        }

        if (avg_saving_start) {
            filtersecond["$and"].push({ average_customer_saving: { $gte: parseInt(avg_saving_start) } });
        }
        if (avg_saving_end) {
            filtersecond["$and"].push({ average_customer_saving: { $lte: parseInt(avg_saving_end) } });
        }


        // Fetching coupon usage
        const products = await ALL_MODELS.orderItems.aggregate([
            // lookup
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
                    from: "couponitems",
                    localField: "couponItemId",
                    foreignField: "_id",
                    as: "couponitem"
                }
            },
            { $unwind: { path: "$couponitem" } },
            // lookup
            {
                $lookup: {
                    from: "coupons",
                    localField: "couponitem.couponId",
                    foreignField: "_id",
                    as: "coupon"
                }
            },
            { $unwind: { path: "$coupon" } },
            {
                $group: {
                    _id: "$coupon._id",
                    couponCode: { "$first": "$coupon.couponCode" },
                    count: {
                        $sum: 1,
                    },
                    discountType: { "$first": "$couponitem.discountType" },
                    discountPrice: { $sum: { $toDouble: "$couponitem.discountPrice" } },
                    unitDiscount: { "$first": "$couponitem.discountValue" },
                    totalCustomerSaving: {
                        $sum: { $toDouble: "$couponitem.discountAmount" }
                    },
                },
            },
            {
                $project: {
                    couponCode: 1,
                    count: 1,
                    discountType: 1,
                    unitDiscount: 1,
                    totalSale: { $toDouble: "$discountPrice" },//1,
                    totalCustomerSaving: 1,
                    // totalCustomerSaving: { $multiply: [{ $toDouble: "$unitDiscount" }, "$totalSale"] },
                }
            },
            {
                $project: {
                    couponCode: 1,
                    count: 1,
                    discountType: 1,
                    unitDiscount: { $toInt: "$unitDiscount" },
                    totalSale: 1,
                    totalCustomerSaving: 1,
                    totalNetSale: { $subtract: ["$totalSale", "$totalCustomerSaving"] },
                    average_customer_saving: { $divide: ["$totalCustomerSaving", "$count"] }
                }
            },
            { $match: filterSearch },
            { $match: filtersecond },
            { $sort: { count: -1 } },
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
            totalCount = products[0].totalCount[0].count;
        } catch (err) { }

        return res.json({
            totalCount: totalCount,
            data: products.length ? products[0].paginatedResults : [],
            pageNo: pageNo,
        });


    } catch (error) { return res.status(403).send({ message: error.message }); }


}// End of coupon_usage_report

const coupon_usage_report_excel = async (req, res, next) => {

    const {
        start_date, end_date, search,
        count_start, count_end, unit_discount_start, unit_discount_end,
        total_sale_start, total_sale_end,total_netsale_start, total_netsale_end,
        total_customer_saving_start, total_customer_saving_end,
        avg_saving_start, avg_saving_end,
    } = req.body;

    try {

        // Filter
        let filter = {};
        let filterSearch = {};

        if (search) {
            const regexp = new RegExp(search, "i");
            filterSearch["$or"] = [
                { "couponCode": regexp }
            ];
        }


        /**
         * Filtering according to date
         */
         const defaultDate = new Date();
         defaultDate.setDate(defaultDate.getDate() - 7);
 
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
         // Going to apply defalult 7 date filter
         if (!start_date)
             filter.createdAt = { $gte: defaultDate }
 
         // Filters
         const filtersecond = { $and: [] };
         if (count_start !== undefined && count_start >= 0) {
             filtersecond["$and"].push({ count: { $gte: parseInt(count_start) } });
         } else {
             filtersecond["$and"].push({ count: { $gte: 0 } });
         }
 
         if (count_end !== undefined && count_end >= 0) {
             filtersecond["$and"].push({ count: { $lte: parseInt(count_end) } });
         }
 
         if (total_sale_start) {
             filtersecond["$and"].push({ totalSale: { $gte: parseInt(total_sale_start) } });
         }
         if (total_sale_end) {
             filtersecond["$and"].push({ totalSale: { $lte: parseInt(total_sale_end) } });
         }
         
         if (total_netsale_start) {
             filtersecond["$and"].push({ totalNetSale: { $gte: parseInt(total_netsale_start) } });
         }
         if (total_netsale_end) {
             filtersecond["$and"].push({ totalNetSale: { $lte: parseInt(total_netsale_end) } });
         }
 
         if (unit_discount_start) {
             filtersecond["$and"].push({ unitDiscount: { $gte: parseInt(unit_discount_start) } });
         }
         if (unit_discount_end) {
             filtersecond["$and"].push({ unitDiscount: { $lte: parseInt(unit_discount_end) } });
         }
 
         if (total_customer_saving_start) {
             filtersecond["$and"].push({ totalCustomerSaving: { $gte: parseInt(total_customer_saving_start) } });
         }
         if (total_customer_saving_end) {
             filtersecond["$and"].push({ totalCustomerSaving: { $lte: parseInt(total_customer_saving_end) } });
         }
 
         if (avg_saving_start) {
             filtersecond["$and"].push({ average_customer_saving: { $gte: parseInt(avg_saving_start) } });
         }
         if (avg_saving_end) {
             filtersecond["$and"].push({ average_customer_saving: { $lte: parseInt(avg_saving_end) } });
         }
 

        // Fetching coupon usage
        const products = await ALL_MODELS.orderItems.aggregate([
            // lookup
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
                    from: "couponitems",
                    localField: "couponItemId",
                    foreignField: "_id",
                    as: "couponitem"
                }
            },
            { $unwind: { path: "$couponitem" } },
            // lookup
            {
                $lookup: {
                    from: "coupons",
                    localField: "couponitem.couponId",
                    foreignField: "_id",
                    as: "coupon"
                }
            },
            { $unwind: { path: "$coupon" } },
            {
                $group: {
                    _id: "$coupon._id",
                    couponCode: { "$first": "$coupon.couponCode" },
                    count: {
                        $sum: 1,
                    },
                    discountType: { "$first": "$couponitem.discountType" },
                    discountPrice: { $sum: { $toDouble: "$couponitem.discountPrice" } },
                    unitDiscount: { "$first": "$couponitem.discountValue" },
                    totalCustomerSaving: {
                        $sum: { $toDouble: "$couponitem.discountAmount" }
                    },
                },
            },
            {
                $project: {
                    couponCode: 1,
                    count: 1,
                    discountType: 1,
                    unitDiscount: 1,
                    totalSale: { $toDouble: "$discountPrice" },//1,
                    totalCustomerSaving: 1,
                    // totalCustomerSaving: { $multiply: [{ $toDouble: "$unitDiscount" }, "$totalSale"] },
                }
            },
            {
                $project: {
                    couponCode: 1,
                    count: 1,
                    discountType: 1,
                    unitDiscount: { $toInt: "$unitDiscount" },
                    totalSale: 1,
                    totalCustomerSaving: 1,
                    totalNetSale: { $subtract: ["$totalSale", "$totalCustomerSaving"] },
                    average_customer_saving: { $divide: ["$totalCustomerSaving", "$count"] }
                }
            },
            { $match: filterSearch },
            { $match: filtersecond },
            { $sort: { count: -1 } },
        ]);

        var wb = XLSX.utils.book_new(); //new workbook
        let excelExportData = [];

        for (let index = 0; index < products.length; index++) {
            const element = products[index];

            excelExportData.push({
                CouponCode: element.couponCode,
                "#OfUsage": element.count,
                UOM: element.discountType,
                UnitDiscount: element.unitDiscount,
                TotalSale: element.totalSale,
                TotalCustomerSaving: element.totalCustomerSaving,
                TotalNetSale: element.totalNetSale,
                AverageCustomerSaving: element.average_customer_saving
            });
        }

        var temp = JSON.stringify(excelExportData);
        temp = JSON.parse(temp);
        var ws = XLSX.utils.json_to_sheet(temp);
        let today = new Date();

        let folder = `uploads/reports/admin-report/${req.userId}/`;
        //check if folder exist or not if not then create folder user createdirectory middleware
        await createDirectories(folder);

        var down = `${folder}coupon_usage_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
        XLSX.utils.book_append_sheet(wb, ws, "sheet1");
        XLSX.writeFile(wb, down);

        let newReport = new ALL_MODELS.reportModel({
            sellerId: req.userId,
            ReportName: "Coupon Usage Report",
            ReportLink: (req.headers.host + down).replace(/uploads\//g, "/"),
        });

        let data = await newReport.save();

        return res.send({
            message: "Your XL will start downloading now.",
            d: data,
        });
    } catch (error) { return res.status(403).send({ message: error.message }); }
}

module.exports = { coupon_usage_report, coupon_usage_report_excel };