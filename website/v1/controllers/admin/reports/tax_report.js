const path = require("path");
var XLSX = require("xlsx");
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');

// Local modules
const ALL_MODELS = require(path.join(__dirname, "..", "..", "..", "..", "..", "utilities/allModels"));


const tax_report = async (req, res, next) => {
    const {
        start_date, end_date,
        calculated_tax_start, calculated_tax_end,
        net_sale_start, net_sale_end,
        net_price_start, net_price_end,
        vat_amount_start, vat_amount_end,
        refunded_tax_amount_start, refunded_tax_amount_end,
        refunded_amount_start, refunded_amount_end,
        offer_discount_start, offer_discount_end,
        coupon_discount_start, coupon_discount_end,
        search
    } = req.body;
    let { limit, page } = req.body;

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
                { "seller.nameOfBussinessEnglish": regexp },
                { "seller.sellerDetails.sellerfName": regexp },
                { "seller.sellerDetails.sellerlName": regexp },
            ];
        }

        // Filter
        const filter = {};

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


        /**
         * Filtering 
         */
        const filterSecond = {};

        // total tax
        if (calculated_tax_start)
            filterSecond.calculatedTax = { $gte: calculated_tax_start }
        if (calculated_tax_end)
            filterSecond.calculatedTax = { $lte: calculated_tax_end }
        if (calculated_tax_start && calculated_tax_end) {
            filterSecond.calculatedTax = {
                $gte: calculated_tax_start,
                $lte: calculated_tax_end
            }
        }
        // End of total tax

        // net_sale
        if (net_sale_start)
            filterSecond.aggregateNetSale = { $gte: net_sale_start }
        if (net_sale_end)
            filterSecond.aggregateNetSale = { $lte: net_sale_end }
        if (net_sale_start && net_sale_end) {
            filterSecond.aggregateNetSale = {
                $gte: net_sale_start,
                $lte: net_sale_end
            }
        }
        // End of net_sale

        // vat_amount
        if (vat_amount_start)
            filterSecond.vatAmount = { $gte: vat_amount_start }
        if (vat_amount_end)
            filterSecond.vatAmount = { $lte: vat_amount_end }
        if (vat_amount_start && vat_amount_end) {
            filterSecond.vatAmount = {
                $gte: vat_amount_start,
                $lte: vat_amount_end
            }
        }
        // End of vat_amount

        // total_amount
        if (net_price_start)
            filterSecond.aggregateNetPrice = { $gte: net_price_start }
        if (net_price_end)
            filterSecond.aggregateNetPrice = { $lte: net_price_end }
        if (net_price_start && net_price_end) {
            filterSecond.aggregateNetPrice = {
                $gte: net_price_start,
                $lte: net_price_end
            }
        }

        // refunded amount
        if (refunded_amount_start)
            filterSecond.aggregateRefundedAmount = { $gte: refunded_amount_start }
        if (refunded_amount_end)
            filterSecond.aggregateRefundedAmount = { $lte: refunded_amount_end }
        if (refunded_amount_start && refunded_amount_end) {
            filterSecond.aggregateRefundedAmount = {
                $gte: refunded_amount_start,
                $lte: refunded_amount_end
            }
        }

        // refunded tax amount
        if (refunded_tax_amount_start)
            filterSecond.refundedTaxAmount = { $gte: refunded_tax_amount_start }
        if (refunded_tax_amount_end)
            filterSecond.refundedTaxAmount = { $lte: refunded_tax_amount_end }
        if (refunded_tax_amount_start && refunded_tax_amount_end) {
            filterSecond.refundedTaxAmount = {
                $gte: refunded_tax_amount_start,
                $lte: refunded_tax_amount_end
            }
        }

        // offer discount
        if (offer_discount_start)
            filterSecond.offerDiscount = { $gte: offer_discount_start }
        if (offer_discount_end)
            filterSecond.offerDiscount = { $lte: offer_discount_end }
        if (offer_discount_start && offer_discount_end) {
            filterSecond.offerDiscount = {
                $gte: offer_discount_start,
                $lte: offer_discount_end
            }
        }

        // coupon discount
        if (coupon_discount_start)
            filterSecond.couponDiscount = { $gte: coupon_discount_start }
        if (coupon_discount_end)
            filterSecond.couponDiscount = { $lte: coupon_discount_end }
        if (coupon_discount_start && coupon_discount_end) {
            filterSecond.couponDiscount = {
                $gte: coupon_discount_start,
                $lte: coupon_discount_end
            }
        }

        // Fetching tax
        const taxes = await ALL_MODELS.orderItems.aggregate([
            // Match
            { $match: filter },
            // lookup
            {
                $lookup: {
                    from: "productvariants",
                    localField: "productVariantId",
                    foreignField: "_id",
                    as: "productVariant",
                },
            },
            { $unwind: "$productVariant" },
            // group
            {
                $group: {
                    _id: "$sellerId",
                    // totalVatAmount: {
                    // 	$sum: { $add: { $toDouble: "$vatAmount" } },
                    // },
                    // totalNetSale: {
                    // 	$sum: {
                    // 		$add: { $toDouble: "$productNetPrice" },
                    // 	},
                    // },
                    // totalAmount: {
                    // 	$sum: {
                    // 		$add: { $toDouble: "$productNetPrice" },
                    // 	},
                    // },
                    // totalTax: {
                    // 	$sum: {
                    // 		$add: { $toDouble: "$tax" },
                    // 	},
                    // },
                    aggregateNetPrice: { $sum: "$retailPrice" },
                    offerDiscount: { $sum: "$offerDiscount" },
                    couponDiscount: { $sum: "$couponDiscount" },
                    aggregateRefundedAmount: { $sum: "$RefundedAmount" },
                    avgProductTaxPercentage: {
                        $avg: { $toInt: "$productVariant.productTaxPercentage" },
                    },
                    avgVatPercentage: {
                        $avg: "$totalTax",
                    }
                },
            },
            {
                $addFields: {
                    totalDiscount: { $sum: ["$offerDiscount", "$couponDiscount"] },
                },
            },
            {
                $addFields: {
                    aggregateNetSale: {
                        $subtract: [
                            "$aggregateNetPrice",
                            { $add: ["$totalDiscount", "$aggregateRefundedAmount"] },
                        ],
                    },
                },
            },
            {
                $addFields: {
                    vatAmount: {
                        $multiply: [
                            "$aggregateNetPrice",
                            "$avgVatPercentage",
                        ],
                    },
                },
            },
            {
                $addFields: {
                    refundedTaxAmount: {
                        $cond: {
                            if: {
                                $eq: ["$avgProductTaxPercentage", 0]
                                // $or: [
                                //     {$eq: ["$avgProductTaxPercentage", 0]},
                                //     {$eq: ["$avgProductTaxPercentage", null]}
                                // ]
                            },
                            then: 0,
                            else: {
                                $multiply: [
                                    "$aggregateRefundedAmount",
                                    { $divide: ["$avgProductTaxPercentage", 100] },
                                ]
                            }
                        }
                    },
                },
            },
            {
                $addFields: {
                    calculatedTax: {
                        $subtract: ["$vatAmount", "$refundedTaxAmount"]
                    },
                },
            },
            // match
            { $match: filterSecond },
            // lookup
            {
                $lookup: {
                    from: "sellers",
                    localField: "_id",
                    foreignField: "_id",
                    as: "seller",
                },
            },
            { $unwind: "$seller" },
            { $match: searchFilter },
            // project
            {
                $project: {
                    sellerId: "$seller._id",
                    nameOfBussinessEnglish: "$seller.nameOfBussinessEnglish",
                    // totalVatAmount: 1,
                    // totalAmount: 1,
                    // totalTax: 1,
                    aggregateNetPrice: 1,
                    aggregateRefundedAmount: 1,
                    aggregateNetSale: 1,
                    offerDiscount: 1,
                    totalDiscount: 1,
                    avgProductTaxPercentage: 1,
                    refundedTaxAmount: 1,
                    avgVatPercentage: 1,
                    calculatedTax: 1,
                    vatAmount: 1,
                    sellerName: {
                        $concat: [
                            "$seller.sellerDetails.sellerfName",
                            " ",
                            "$seller.sellerDetails.sellerlName",
                        ],
                    },
                },
            },
            { $sort: { _id: -1 } },
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
        const taxesList = taxes.length ? taxes[0].paginatedResults : [];
        let totalCount = 0;
        try {
            totalCount = taxes[0].totalCount[0].count;
        } catch (err) { }

        return res.send({
            totalCount: totalCount,
            data: taxesList,
            count: taxesList.length,
        });
        // return res.json({
        //     total_count: taxes.length,
        //     data: taxes
        // });
    } catch (error) { return res.status(403).send({ message: error.message }); }
}// End of tax_report


const tax_report_excel = async (req, res, next) => {
    const {
        start_date, end_date,
        calculated_tax_start, calculated_tax_end,
        net_sale_start, net_sale_end,
        net_price_start, net_price_end,
        vat_amount_start, vat_amount_end,
        refunded_tax_amount_start, refunded_tax_amount_end,
        refunded_amount_start, refunded_amount_end,
        offer_discount_start, offer_discount_end,
        coupon_discount_start, coupon_discount_end,
        search
    } = req.body;

    try {
        let searchFilter = {};

        if (search) {
            const regexp = new RegExp(search, "i");

            searchFilter["$or"] = [
                { "seller.nameOfBussinessEnglish": regexp },
                { "seller.sellerDetails.sellerfName": regexp },
                { "seller.sellerDetails.sellerlName": regexp },
            ];
        }

        // Filter
        const filter = {};

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


        /**
         * Filtering 
         */
        const filterSecond = {};

        // total tax
        if (calculated_tax_start)
            filterSecond.calculatedTax = { $gte: calculated_tax_start }
        if (calculated_tax_end)
            filterSecond.calculatedTax = { $lte: calculated_tax_end }
        if (calculated_tax_start && calculated_tax_end) {
            filterSecond.calculatedTax = {
                $gte: calculated_tax_start,
                $lte: calculated_tax_end
            }
        }
        // End of total tax

        // net_sale
        if (net_sale_start)
            filterSecond.aggregateNetSale = { $gte: net_sale_start }
        if (net_sale_end)
            filterSecond.aggregateNetSale = { $lte: net_sale_end }
        if (net_sale_start && net_sale_end) {
            filterSecond.aggregateNetSale = {
                $gte: net_sale_start,
                $lte: net_sale_end
            }
        }
        // End of net_sale

        // vat_amount
        if (vat_amount_start)
            filterSecond.vatAmount = { $gte: vat_amount_start }
        if (vat_amount_end)
            filterSecond.vatAmount = { $lte: vat_amount_end }
        if (vat_amount_start && vat_amount_end) {
            filterSecond.vatAmount = {
                $gte: vat_amount_start,
                $lte: vat_amount_end
            }
        }
        // End of vat_amount

        // total_amount
        if (net_price_start)
            filterSecond.aggregateNetPrice = { $gte: net_price_start }
        if (net_price_end)
            filterSecond.aggregateNetPrice = { $lte: net_price_end }
        if (net_price_start && net_price_end) {
            filterSecond.aggregateNetPrice = {
                $gte: net_price_start,
                $lte: net_price_end
            }
        }

        // refunded amount
        if (refunded_amount_start)
            filterSecond.aggregateRefundedAmount = { $gte: refunded_amount_start }
        if (refunded_amount_end)
            filterSecond.aggregateRefundedAmount = { $lte: refunded_amount_end }
        if (refunded_amount_start && refunded_amount_end) {
            filterSecond.aggregateRefundedAmount = {
                $gte: refunded_amount_start,
                $lte: refunded_amount_end
            }
        }

        // refunded tax amount
        if (refunded_tax_amount_start)
            filterSecond.refundedTaxAmount = { $gte: refunded_tax_amount_start }
        if (refunded_tax_amount_end)
            filterSecond.refundedTaxAmount = { $lte: refunded_tax_amount_end }
        if (refunded_tax_amount_start && refunded_tax_amount_end) {
            filterSecond.refundedTaxAmount = {
                $gte: refunded_tax_amount_start,
                $lte: refunded_tax_amount_end
            }
        }

        // offer discount
        if (offer_discount_start)
            filterSecond.offerDiscount = { $gte: offer_discount_start }
        if (offer_discount_end)
            filterSecond.offerDiscount = { $lte: offer_discount_end }
        if (offer_discount_start && offer_discount_end) {
            filterSecond.offerDiscount = {
                $gte: offer_discount_start,
                $lte: offer_discount_end
            }
        }

        // coupon discount
        if (coupon_discount_start)
            filterSecond.couponDiscount = { $gte: coupon_discount_start }
        if (coupon_discount_end)
            filterSecond.couponDiscount = { $lte: coupon_discount_end }
        if (coupon_discount_start && coupon_discount_end) {
            filterSecond.couponDiscount = {
                $gte: coupon_discount_start,
                $lte: coupon_discount_end
            }
        }

        // Fetching tax
        const taxes = await ALL_MODELS.orderItems.aggregate([
            // Match
            { $match: filter },
            // lookup
            {
                $lookup: {
                    from: "productvariants",
                    localField: "productVariantId",
                    foreignField: "_id",
                    as: "productVariant",
                },
            },
            { $unwind: "$productVariant" },
            // group
            {
                $group: {
                    _id: "$sellerId",
                    aggregateNetPrice: { $sum: "$retailPrice" },
                    offerDiscount: { $sum: "$offerDiscount" },
                    couponDiscount: { $sum: "$couponDiscount" },
                    aggregateRefundedAmount: { $sum: "$RefundedAmount" },
                    avgProductTaxPercentage: {
                        $avg: { $toInt: "$productVariant.productTaxPercentage" },
                    },
                    avgVatPercentage: {
                        $avg: "$totalTax",
                    }
                },
            },
            {
                $addFields: {
                    totalDiscount: { $sum: ["$offerDiscount", "$couponDiscount"] },
                },
            },
            {
                $addFields: {
                    aggregateNetSale: {
                        $subtract: [
                            "$aggregateNetPrice",
                            { $add: ["$totalDiscount", "$aggregateRefundedAmount"] },
                        ],
                    },
                },
            },
            {
                $addFields: {
                    vatAmount: {
                        $multiply: [
                            "$aggregateNetPrice",
                            "$avgVatPercentage",
                        ],
                    },
                },
            },
            {
                $addFields: {
                    refundedTaxAmount: {
                        $cond: {
                            if: {
                                $eq: ["$avgProductTaxPercentage", 0]
                                // $or: [
                                //     {$eq: ["$avgProductTaxPercentage", 0]},
                                //     {$eq: ["$avgProductTaxPercentage", null]}
                                // ]
                            },
                            then: 0,
                            else: {
                                $multiply: [
                                    "$aggregateRefundedAmount",
                                    { $divide: ["$avgProductTaxPercentage", 100] },
                                ]
                            }
                        }
                    },
                },
            },
            {
                $addFields: {
                    calculatedTax: {
                        $subtract: ["$vatAmount", "$refundedTaxAmount"]
                    },
                },
            },
            // match
            { $match: filterSecond },
            // lookup
            {
                $lookup: {
                    from: "sellers",
                    localField: "_id",
                    foreignField: "_id",
                    as: "seller",
                },
            },
            { $unwind: "$seller" },
            { $match: searchFilter },
            // project
            {
                $project: {
                    sellerId: "$seller._id",
                    nameOfBussiness: "$seller.nameOfBussinessEnglish",
                    // totalVatAmount: 1,
                    // totalAmount: 1,
                    // totalTax: 1,
                    aggregateNetPrice: 1,
                    aggregateRefundedAmount: 1,
                    aggregateNetSale: 1,
                    offerDiscount: 1,
                    totalDiscount: 1,
                    avgProductTaxPercentage: 1,
                    refundedTaxAmount: 1,
                    avgVatPercentage: 1,
                    calculatedTax: 1,
                    vatAmount: 1,
                    sellerName: {
                        $concat: [
                            "$seller.sellerDetails.sellerfName",
                            " ",
                            "$seller.sellerDetails.sellerlName",
                        ],
                    },
                },
            },
            { $sort: { _id: -1 } },
        ]);


        var wb = XLSX.utils.book_new(); //new workbook
        let excelExportData = [];

        for (let index = 0; index < taxes.length; index++) {
            const element = taxes[index];

            excelExportData.push({
                SellerName: element.nameOfBussinessEnglish,
                NetPrice: element.aggregateNetPrice,
                Discount: element.totalDiscount,
                RefundedAmount: element.aggregateRefundedAmount,
                NetSale: element.aggregateNetSale,
                VatAmount: element.vatAmount,
                RefundedTaxAmount: element.refundedTaxAmount,
                CalculatedTax: element.calculatedTax,
            });
        }

        var temp = JSON.stringify(excelExportData);
        temp = JSON.parse(temp);
        var ws = XLSX.utils.json_to_sheet(temp);
        let today = new Date();

        let folder = `uploads/reports/admin-report/${req.userId}/`;
        //check if folder exist or not if not then create folder user createdirectory middleware
        await createDirectories(folder);

        var down = `${folder}tax_report_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
        XLSX.utils.book_append_sheet(wb, ws, "sheet1");
        XLSX.writeFile(wb, down);

        let newReport = new ALL_MODELS.reportModel({
            sellerId: req.userId,
            ReportName: "Tax Report",
            ReportLink: (req.headers.host + down).replace(/uploads\//g, "/"),
        });

        let data = await newReport.save();

        return res.send({
            message: "Your XL will start downloading now.",
            d: data,
        });

    } catch (error) { return res.status(403).send({ message: error.message }); }
}// End of tax_report


module.exports = {tax_report, tax_report_excel};