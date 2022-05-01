const { createDirectories } = require('./../../../middlewares/checkCreateFolder');
var XLSX = require("xlsx");

const ALL_MODELS = require("../../../../../utilities/allModels");

exports.merchant_statement_invoice_report = async (req, res) => {
      let { search, limit, page } = req.body;

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
                        { "seller.nameOfBussinessEnglish": regexp }
                  ];

                  if (parseFloat(search) != NaN) {
                        filter["$or"].push({ "_id": parseFloat(search) });
                  }
            }

            // Fetching order merchants
            const merchantInvoice = await ALL_MODELS.merchantinvoiceItemsModel.aggregate([
                  {
                        $lookup: {
                              from: "merchantinvoices",
                              localField: "merchantInvoiceId",
                              foreignField: "_id",
                              as: "merchantinvoice",
                        },
                  },
                  { $unwind: { path: "$merchantinvoice" } },
                  {
                        $lookup: {
                              from: "sellers",
                              localField: "merchantinvoice.sellerId",
                              foreignField: "_id",
                              as: "seller"
                        }
                  },
                  { $unwind: { path: "$seller" } },
                  {
                        $project: {
                              "seller.nameOfBussinessEnglish": 1,
                              "seller.nameOfBussinessArabic": 1,
                              invoiceNo: "$merchantinvoice.indexNo",
                              lineItem: 1,
                              invoiceDate: {
                                    $dateToString: {
                                          format: "%d-%m-%Y",
                                          date: {
                                                $toDate: {
                                                      $concat: [
                                                            { $toString: '$merchantinvoice.invoiceDate' }, "-",
                                                            { $toString: "$merchantinvoice.invoiceMonth" }, "-",
                                                            { $toString: "$merchantinvoice.invoiceYear" }
                                                      ]
                                                }
                                          }
                                    }
                              },
                              commission: 1,
                              postTaxAmount: 1,
                              taxPercent: { $toDouble: "10" },
                              //(comm.amt+advt.amt)/100*10

                        }
                  },
                  {
                        $group: {
                              _id: "$invoiceNo",
                              seller: { $first: "$seller" },
                              invoiceDate: { $first: "$invoiceDate" },
                              commission: { $sum: "$commission" },
                              taxPercent: { $first: "$taxPercent" },
                              advertisementCharges: {
                                    "$sum": {
                                          "$cond": [
                                                { "$eq": ["$lineItem", "Advertisement"] },
                                                "$postTaxAmount",
                                                0
                                          ]
                                    }
                              },
                              sales: {
                                    "$sum": {
                                          "$cond": [
                                                { "$eq": ["$lineItem", "Sale"] },
                                                "$postTaxAmount",
                                                0
                                          ]
                                    }
                              }
                        }
                  },
                  {
                        $addFields: {
                              taxAmount: { $multiply: [{ $divide: [{ $add: ["$commission", "$advertisementCharges", "$sales"] }, 100] }, "$taxPercent"] }
                        }
                  },
                  {
                        $addFields: {
                              total: { $subtract: [{ $add: ["$commission", "$advertisementCharges", "$sales"] }, "$taxAmount"] }
                        }
                  },
                  { $sort: { _id: -1 } },
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
                  totalCount = merchantInvoice[0].totalCount[0].count
            } catch (err) { }

            // console.log(merchantInvoice)
            return res.json({
                  totalCount: totalCount,
                  data: merchantInvoice.length ? merchantInvoice[0].paginatedResults : []
            });
      } catch (error) {
            return res.status(403).send({ message: error.message });
      }
}


exports.merchant_statement_invoice_report_excel_export = async (req, res) => {
      let { search } = req.body;

      try {
            let filter = {};

            if (search) {
                  const regexp = new RegExp(search, "i");
                  filter["$or"] = [
                        { "seller.nameOfBussinessEnglish": regexp }
                  ];

                  if (parseFloat(search) != NaN) {
                        filter["$or"].push({ "_id": parseFloat(search) });
                  }
            }

            // Fetching order merchants
            const merchantInvoice = await ALL_MODELS.merchantinvoiceItemsModel.aggregate([
                  {
                        $lookup: {
                              from: "merchantinvoices",
                              localField: "merchantInvoiceId",
                              foreignField: "_id",
                              as: "merchantinvoice",
                        },
                  },
                  { $unwind: { path: "$merchantinvoice" } },
                  {
                        $lookup: {
                              from: "sellers",
                              localField: "merchantinvoice.sellerId",
                              foreignField: "_id",
                              as: "seller"
                        }
                  },
                  { $unwind: { path: "$seller" } },
                  {
                        $project: {
                              "seller.nameOfBussinessEnglish": 1,
                              "seller.nameOfBussinessArabic": 1,
                              invoiceNo: "$merchantinvoice.indexNo",
                              lineItem: 1,
                              invoiceDate: {
                                    $dateToString: {
                                          format: "%d-%m-%Y",
                                          date: {
                                                $toDate: {
                                                      $concat: [
                                                            { $toString: '$merchantinvoice.invoiceDate' }, "-",
                                                            { $toString: "$merchantinvoice.invoiceMonth" }, "-",
                                                            { $toString: "$merchantinvoice.invoiceYear" }
                                                      ]
                                                }
                                          }
                                    }
                              },
                              commission: 1,
                              postTaxAmount: 1,
                              taxPercent: { $toDouble: "10" },
                              //(comm.amt+advt.amt)/100*10

                        }
                  },
                  {
                        $group: {
                              _id: "$invoiceNo",
                              seller: { $first: "$seller" },
                              invoiceDate: { $first: "$invoiceDate" },
                              commission: { $sum: "$commission" },
                              taxPercent: { $first: "$taxPercent" },
                              advertisementCharges: {
                                    "$sum": {
                                          "$cond": [
                                                { "$eq": ["$lineItem", "Advertisement"] },
                                                "$postTaxAmount",
                                                0
                                          ]
                                    }
                              },
                              sales: {
                                    "$sum": {
                                          "$cond": [
                                                { "$eq": ["$lineItem", "Sale"] },
                                                "$postTaxAmount",
                                                0
                                          ]
                                    }
                              }
                        }
                  },
                  {
                        $addFields: {
                              taxAmount: { $multiply: [{ $divide: [{ $add: ["$commission", "$advertisementCharges", "$sales"] }, 100] }, "$taxPercent"] }
                        }
                  },
                  {
                        $addFields: {
                              total: { $subtract: [{ $add: ["$commission", "$advertisementCharges", "$sales"] }, "$taxAmount"] }
                        }
                  },
                  { $sort: { _id: -1 } },
                  { $match: filter }
            ]);

            var wb = XLSX.utils.book_new(); //new workbook
            let excelExportData = [];

            for (let index = 0; index < merchantInvoice.length; index++) {
                  const element = merchantInvoice[index];

                  excelExportData.push({
                        "InvoiceNo": element._id,
                        "MerchantName": element.seller.nameOfBussinessEnglish,
                        "InvoiceDate": element.invoiceDate,
                        "CommissionAmount": "BHD " + element.commission,
                        "AdvertisementCharges": "BHD " + element.advertisementCharges,
                        "AnyOtherChargesIfAny(Sales)": "BHD " + element.sales,
                        "VatIfAny": "BHD " + element.taxAmount,
                        "Total": element.total,
                  });
            }

            var temp = JSON.stringify(excelExportData);
            temp = JSON.parse(temp);
            var ws = XLSX.utils.json_to_sheet(temp);
            let today = new Date();

            let folder = `uploads/reports/admin-report/${req.userId}/`;
            //check if folder exist or not if not then create folder user createdirectory middleware
            await createDirectories(folder);

            var down = `${folder}invoice_details_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
            XLSX.utils.book_append_sheet(wb, ws, "sheet1");
            XLSX.writeFile(wb, down);

            let newReport = new ALL_MODELS.reportModel({
                  sellerId: req.userId,
                  ReportName: "Invoice details Report",
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


exports.merchant_statement_invoice_report_single = async (req, res) => {
      let { invoiceNo } = req.body;

      try {

            // Fetching order merchants
            const merchantInvoice = await ALL_MODELS.merchantinvoiceItemsModel.aggregate([
                  {
                        $lookup: {
                              from: "merchantinvoices",
                              localField: "merchantInvoiceId",
                              foreignField: "_id",
                              as: "merchantinvoice",
                        },
                  },
                  { $unwind: { path: "$merchantinvoice" } },
                  {
                        $lookup: {
                              from: "sellers",
                              localField: "merchantinvoice.sellerId",
                              foreignField: "_id",
                              as: "seller"
                        }
                  },
                  { $unwind: { path: "$seller" } },
                  {
                        $project: {
                              "seller.nameOfBussinessEnglish": 1,
                              "seller.nameOfBussinessArabic": 1,
                              "seller.sellerAddress": 1,
                              invoiceNo: "$merchantinvoice.indexNo",
                              lineItem: 1,
                              invoiceDate: {
                                    $dateToString: {
                                          format: "%d-%m-%Y",
                                          date: {
                                                $toDate: {
                                                      $concat: [
                                                            { $toString: '$merchantinvoice.invoiceDate' }, "-",
                                                            { $toString: "$merchantinvoice.invoiceMonth" }, "-",
                                                            { $toString: "$merchantinvoice.invoiceYear" }
                                                      ]
                                                }
                                          }
                                    }
                              },
                              commission: 1,
                              postTaxAmount: 1,
                              taxPercent: { $toDouble: "10" },
                              //(comm.amt+advt.amt)/100*10

                        }
                  },
                  {
                        $group: {
                              _id: "$invoiceNo",
                              seller: { $first: "$seller" },
                              invoiceDate: { $first: "$invoiceDate" },
                              commission: { $sum: "$commission" },
                              taxPercent: { $first: "$taxPercent" },
                              advertisementCharges: {
                                    "$sum": {
                                          "$cond": [
                                                { "$eq": ["$lineItem", "Advertisement"] },
                                                "$postTaxAmount",
                                                0
                                          ]
                                    }
                              },
                              sales: {
                                    "$sum": {
                                          "$cond": [
                                                { "$eq": ["$lineItem", "Sale"] },
                                                "$postTaxAmount",
                                                0
                                          ]
                                    }
                              }
                        }
                  },
                  {
                        $addFields: {
                              endDate: { $toDate: "$invoiceDate" },
                              taxAmount: { $multiply: [{ $divide: [{ $add: ["$commission", "$advertisementCharges", "$sales"] }, 100] }, "$taxPercent"] }
                        }
                  },
                  {
                        $addFields: {
                              startDate: { $dateToString: { format: "%d-%m-%Y", date: { $toDate: { $concat: ["01-", { $toString: { $month: "$endDate" } }, "-", { $toString: { $year: "$endDate" } }] } } } },
                              endDate: { $dateToString: { format: "%d-%m-%Y", date: { $toDate: { $concat: [{ $toString: { $dayOfMonth: "$endDate" } }, "-", { $toString: { $month: "$endDate" } }, "-", { $toString: { $year: "$endDate" } }] } } } },
                              total: { $subtract: [{ $add: ["$commission", "$advertisementCharges", "$sales"] }, "$taxAmount"] },
                        }
                  },
                  { $match: { _id: invoiceNo } }
            ]);

            return res.json({
                  data: merchantInvoice
            });
      } catch (error) {
            return res.status(403).send({ message: error.message });
      }
}