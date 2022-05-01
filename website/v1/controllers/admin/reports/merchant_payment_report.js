const { createDirectories } = require('./../../../middlewares/checkCreateFolder');
var XLSX = require("xlsx");

const ALL_MODELS = require("../../../../../utilities/allModels");

const merchant_payment_report = async (req, res) => {
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

    try {
        let filter = {};

        if (search) {
            const regexp = new RegExp(search, "i");
            filter["$or"] = [
                { "nameOfBussinessEnglish": regexp },
                { "sellerDetails.sellerlName": regexp },
                { "sellerDetails.sellerfName": regexp },

                { "sellerBankDetails.AccId": regexp },
                { "sellerBankDetails.AccName": regexp },
                { "sellerBankDetails.BankCode": regexp },
                { "sellerBankDetails.IBANNo": regexp },
                { "sellerBankDetails.BankName": regexp },
            ];
            if (parseFloat(search) != NaN) {
                filter["$or"].push({ "moneyHeldWithMerchant": parseFloat(search) });
                filter["$or"].push({ "cashTansactionHelWithMyarket": parseFloat(search) });
            }
        }

        // Fetching order merchants
        const merchants = await ALL_MODELS.orderItems.aggregate([
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
                    localField: "orderId",
                    foreignField: "orderId",
                    as: "ordershippings",
                },
            },
            { $unwind: "$ordershippings" },
            // { $sort: { "seller.indexNo": -1 } },
            {
                $group: {
                    _id: "$sellerId",
                    sellerIndexNo: { $first: "$seller.indexNo" },
                    nameOfBussinessEnglish: { $first: "$seller.nameOfBussinessEnglish" },
                    sellerBankDetails: { $first: "$seller.bankDetails" },
                    sellerDetails: { $first: "$seller.sellerDetails" },
                    amountToBeRecived: {
                        $sum: {
                            $cond: [
                                //Condition for money held with merchant
                                { $eq: ["$ordershippings.shippingMethod", "Self Delivery"] },
                                {
                                    $add: [{ $toDouble: { $toString: "$ordershippings.shippingPrice" } }, {
                                        $multiply: [{ $toDouble: { $toString: "$totalUnitPrice" } }, { $toDouble: { $toString: "$quantity" } }]
                                    }]
                                },
                                0
                            ]
                        }
                    },
                    amountToBePaid: {
                        $sum: {
                            $cond: [
                                //Condition for cash transaction held with My Market
                                { $eq: ["$ordershippings.shippingMethod", "MM Drive"] },
                                {
                                    $add: [{ $toDouble: { $toString: "$ordershippings.shippingPrice" } }, {
                                        $multiply: [{ $toDouble: { $toString: "$totalUnitPrice" } }, { $toDouble: { $toString: "$quantity" } }]
                                    }]
                                },
                                0
                            ]
                        }
                    },

                }
            },
            // { $sort: { "sellerIndexNo": -1 } },
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

        let totalCount = 0
        try {
            totalCount = merchants[0].totalCount[0].count
        } catch (err) { }

        return res.json({
            totalCount: totalCount,
            data: merchants.length ? merchants[0].paginatedResults : [],
            pageNo: pageNo
        });
    } catch (error) {
        return res.status(403).send({ message: error.message });
    }
}

const merchant_payment_report_excel = async (req, res) => {
    let {
        search
    } = req.body;

    try {
        let filter = {};

        if (search) {
            const regexp = new RegExp(search, "i");
            filter["$or"] = [
                { "nameOfBussinessEnglish": regexp },
                { "sellerDetails.sellerlName": regexp },
                { "sellerDetails.sellerfName": regexp },

                { "sellerBankDetails.AccId": regexp },
                { "sellerBankDetails.AccName": regexp },
                { "sellerBankDetails.BankCode": regexp },
                { "sellerBankDetails.IBANNo": regexp },
                { "sellerBankDetails.BankName": regexp },
            ];
            if (parseFloat(search) != NaN) {
                filter["$or"].push({ "moneyHeldWithMerchant": parseFloat(search) });
                filter["$or"].push({ "cashTansactionHelWithMyarket": parseFloat(search) });
            }
        }

        // Fetching order merchants
        const merchants = await ALL_MODELS.orderItems.aggregate([
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
                    localField: "orderId",
                    foreignField: "orderId",
                    as: "ordershippings",
                },
            },
            { $unwind: "$ordershippings" },
            // { $sort: { "seller.indexNo": -1 } },
            {
                $group: {
                    _id: "$sellerId",
                    sellerIndexNo: { $first: "$seller.indexNo" },
                    nameOfBussinessEnglish: { $first: "$seller.nameOfBussinessEnglish" },
                    sellerBankDetails: { $first: "$seller.bankDetails" },
                    sellerDetails: { $first: "$seller.sellerDetails" },
                    amountToBeRecived: {
                        $sum: {
                            $cond: [
                                //Condition for money held with merchant
                                { $eq: ["$ordershippings.shippingMethod", "Self Delivery"] },
                                {
                                    $add: [{ $toDouble: { $toString: "$ordershippings.shippingPrice" } }, {
                                        $multiply: [{ $toDouble: { $toString: "$totalUnitPrice" } }, { $toDouble: { $toString: "$quantity" } }]
                                    }]
                                },
                                0
                            ]
                        }
                    },
                    amountToBePaid: {
                        $sum: {
                            $cond: [
                                //Condition for cash transaction held with My Market
                                { $eq: ["$ordershippings.shippingMethod", "MM Drive"] },
                                {
                                    $add: [{ $toDouble: { $toString: "$ordershippings.shippingPrice" } }, {
                                        $multiply: [{ $toDouble: { $toString: "$totalUnitPrice" } }, { $toDouble: { $toString: "$quantity" } }]
                                    }]
                                },
                                0
                            ]
                        }
                    },

                }
            },
            // { $sort: { "sellerIndexNo": -1 } },
            { $match: filter },
        ]);


       var wb = XLSX.utils.book_new(); //new workbook
        let excelExportData = [];

        for (let index = 0; index < merchants.length; index++) {
            const element = merchants[index];
            if (element.sellerBankDetails) {
                excelExportData.push({
                    sellerfName: element.sellerDetails.sellerfName,
                    sellerlName: element.sellerDetails.sellerlName,
                    nameOfBussinessEnglish: element.nameOfBussinessEnglish,
                    
                    AccId: element.sellerBankDetails.AccId,
                    AccName: element.sellerBankDetails.AccName,
                    BankCode: element.sellerBankDetails.BankCode,
                    IBANNo: element.sellerBankDetails.IBANNo,
                    BankName: element.sellerBankDetails.BankName,
                });
            }
        }

        var temp = JSON.stringify(excelExportData);
        console.log(temp);

         temp = JSON.parse(temp);
        var ws = XLSX.utils.json_to_sheet(temp);
        let today = new Date();

        let folder = `uploads/reports/admin-report/${req.userId}/`;
        //check if folder exist or not if not then create folder user createdirectory middleware
        await createDirectories(folder);

        var down = `${folder}merchant_payment_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
        XLSX.utils.book_append_sheet(wb, ws, "sheet1");
        XLSX.writeFile(wb, down);

        let newReport = new ALL_MODELS.reportModel({
            sellerId: req.userId,
            ReportName: "Merchant Payment Report",
            ReportLink: (req.headers.host + down).replace(/uploads\//g, "/"),
        });

        let data = await newReport.save();

        return res.send({
            message: "Your XL will start downloading now.",
            d: data,
        });
    } catch (error) {
        return res.status(403).send({ message: error.message });
    }
}
module.exports = { merchant_payment_report, merchant_payment_report_excel };