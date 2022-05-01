const path = require("path");
var XLSX = require('xlsx');

// Third party modules
const { ObjectId } = require("mongoose").Types;
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');
// Local modules

const ALL_MODELS = require("../../../../../utilities/allModels");

const returned_product_report = async (req, res) => {
      let {
            start_date, end_date,
            quantity_refunded_start, quantity_refunded_end,
            total_amount_start, total_amount_end,
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

            const sellerId = ObjectId(req.userId);
            let Searchfilter = {};

            if (search) {
                  const regexp = new RegExp(search, "i");

                  Searchfilter["$or"] = [
                        { "productVariantDetails.productVariantName": regexp },
                  ];

                  if (parseInt(search) != NaN) {
                        Searchfilter["$or"].push({ "grandTotal": parseInt(search) })
                        Searchfilter["$or"].push({ "totalUnitPrice": parseInt(search) })
                  }
            }

            // Filter
            let filter = {
                  $and: [
                        {
                              $or: [
                                    { Refunded: true },
                                    { Returned: true },
                              ]
                        }
                  ]
            };

            /**
             * Filtering according to date
             */
            const defaultDate = new Date();
            defaultDate.setHours(00); defaultDate.setMinutes(00); defaultDate.setSeconds(00);
            defaultDate.setMonth(defaultDate.getMonth() - 1);

            // console.log(new Date(start_date));

            if (start_date) {
                  start_date = new Date(start_date)
                  start_date.setHours(23); start_date.setMinutes(59); start_date.setSeconds(59);
                  start_date.setDate(start_date.getDate() - 1)
                  let dt = convertDateTime(start_date);
                  filter['$and'].push({ createdDate: { $gt: dt } })
            }
            if (end_date) {
                  end_date = new Date(end_date)
                  end_date.setHours(23); end_date.setMinutes(59); end_date.setSeconds(59);
                  // end_date.setDate(end_date.getDate() + 1)
                  let dt = convertDateTime(end_date);
                  filter['$and'].push({ createdDate: { $lt: dt } })
            }

            // Going to apply defalult 1 month date filter
            if (!start_date) {
                  let dt = convertDateTime(defaultDate);
                  filter['$and'].push({ createdDate: { $gt: dt } })
            }

            /**
             * Filtering quantity sold and total quantity
             */
            let filterSecond = {};

            // quantity sold
            if (quantity_refunded_start) {
                  if (!filterSecond['$and']) {
                        filterSecond['$and'] = []
                  }
                  filterSecond['$and'].push({ qauntityRefunded: { $gt: (Number(quantity_refunded_start) - 1) } })
            }
            if (quantity_refunded_end) {
                  if (!filterSecond['$and']) {
                        filterSecond['$and'] = []
                  }
                  filterSecond['$and'].push({ qauntityRefunded: { $lt: (Number(quantity_refunded_end) + 1) } })
            }
            // End of quantity sold

            // total_amount
            if (total_amount_start) {
                  if (!filterSecond['$and']) {
                        filterSecond['$and'] = []
                  }
                  filterSecond['$and'].push({ grandTotal: { $gt: (Number(total_amount_start) - 1) } })
            }
            if (total_amount_end) {
                  if (!filterSecond['$and']) {
                        filterSecond['$and'] = []
                  }
                  filterSecond['$and'].push({ grandTotal: { $lt: (Number(total_amount_end) + 1) } })
            }
            // End of total_amount

            // Fetching order products
            const products = await ALL_MODELS.orderItems.aggregate([
                  { $match: { sellerId: sellerId } },
                  // Match 
                  { $match: filter },
                  // Match
                  { $match: filterSecond },
                  // Joining orderProducts collection with products collection
                  {
                        $lookup: {
                              from: "productvariants",
                              localField: "productVariantId",
                              foreignField: "_id",
                              as: "productvariant"
                        }
                  },
                  { $unwind: "$productvariant" },
                  {
                        $lookup: {
                              from: "products",
                              localField: "productvariant.productId",
                              foreignField: "_id",
                              as: "product"
                        }
                  },
                  { $unwind: "$product" },
                  {
                        $project: {
                              product: 1,
                              productVariantDetails: 1,
                              totalUnitPrice: 1,
                              grandTotal: 1,
                              qauntityRefunded: "$quantity",
                              ReturnedComment: 1,
                              RefundedComment: 1,

                        }
                  },
                  { $match: Searchfilter },
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
                  totalCount = products[0].totalCount[0].count
            } catch (err) { }

            return res.json({
                  totalCount: totalCount,
                  data: products.length ? products[0].paginatedResults : [],
                  pageNo: pageNo
            });


      } catch (error) { return res.status(403).send({ message: error.message }); }


}

const returned_product_report_excel = async (req, res, next) => {
      let {
            start_date, end_date,
            quantity_refunded_start, quantity_refunded_end,
            total_amount_start, total_amount_end,
            search
      } = req.body;

      try {
            const sellerId = ObjectId(req.userId);
            let Searchfilter = {};

            if (search) {
                  const regexp = new RegExp(search, "i");

                  Searchfilter["$or"] = [
                        { "productVariantDetails.productVariantName": regexp },
                  ];

                  if (parseInt(search) != NaN) {
                        Searchfilter["$or"].push({ "grandTotal": parseInt(search) })
                        Searchfilter["$or"].push({ "totalUnitPrice": parseInt(search) })
                  }
            }

            // Filter
            let filter = {
                  $and: [
                        {
                              $or: [
                                    { Refunded: true },
                                    { Returned: true },
                              ]
                        }
                  ]
            };

            /**
             * Filtering according to date
             */
            const defaultDate = new Date();
            defaultDate.setHours(00); defaultDate.setMinutes(00); defaultDate.setSeconds(00);
            defaultDate.setMonth(defaultDate.getMonth() - 1);

            // console.log(new Date(start_date));

            if (start_date) {
                  start_date = new Date(start_date)
                  start_date.setHours(23); start_date.setMinutes(59); start_date.setSeconds(59);
                  start_date.setDate(start_date.getDate() - 1)
                  let dt = convertDateTime(start_date);
                  filter['$and'].push({ createdDate: { $gt: dt } })
            }
            if (end_date) {
                  end_date = new Date(end_date)
                  end_date.setHours(23); end_date.setMinutes(59); end_date.setSeconds(59);
                  // end_date.setDate(end_date.getDate() + 1)
                  let dt = convertDateTime(end_date);
                  filter['$and'].push({ createdDate: { $lt: dt } })
            }

            // Going to apply defalult 1 month date filter
            if (!start_date) {
                  let dt = convertDateTime(defaultDate);
                  filter['$and'].push({ createdDate: { $gt: dt } })
            }

            /**
             * Filtering quantity sold and total quantity
             */
            let filterSecond = {};

            // quantity sold
            if (quantity_refunded_start) {
                  if (!filterSecond['$and']) {
                        filterSecond['$and'] = []
                  }
                  filterSecond['$and'].push({ qauntityRefunded: { $gt: (Number(quantity_refunded_start) - 1) } })
            }
            if (quantity_refunded_end) {
                  if (!filterSecond['$and']) {
                        filterSecond['$and'] = []
                  }
                  filterSecond['$and'].push({ qauntityRefunded: { $lt: (Number(quantity_refunded_end) + 1) } })
            }
            // End of quantity sold

            // total_amount
            if (total_amount_start) {
                  if (!filterSecond['$and']) {
                        filterSecond['$and'] = []
                  }
                  filterSecond['$and'].push({ grandTotal: { $gt: (Number(total_amount_start) - 1) } })
            }
            if (total_amount_end) {
                  if (!filterSecond['$and']) {
                        filterSecond['$and'] = []
                  }
                  filterSecond['$and'].push({ grandTotal: { $lt: (Number(total_amount_end) + 1) } })
            }
            // End of total_amount

            // Fetching order products
            const products = await ALL_MODELS.orderItems.aggregate([
                  { $match: { sellerId: sellerId } },
                  // Match 
                  { $match: filter },
                  // Match
                  { $match: filterSecond },
                  // Joining orderProducts collection with products collection
                  {
                        $lookup: {
                              from: "productvariants",
                              localField: "productVariantId",
                              foreignField: "_id",
                              as: "productvariant"
                        }
                  },
                  { $unwind: "$productvariant" },
                  {
                        $lookup: {
                              from: "products",
                              localField: "productvariant.productId",
                              foreignField: "_id",
                              as: "product"
                        }
                  },
                  { $unwind: "$product" },
                  {
                        $project: {
                              product: 1,
                              productVariantDetails: 1,
                              totalUnitPrice: 1,
                              grandTotal: 1,
                              qauntityRefunded: "$quantity",
                              ReturnedComment: 1,
                              RefundedComment: 1,

                        }
                  },
                  { $match: Searchfilter }
            ]);

            var wb = XLSX.utils.book_new(); //new workbook
            let excelExportData = [];

            for (let index = 0; index < products.length; index++) {
                  const element = products[index];
                  excelExportData.push({
                        product: element.product.productDetails[0].productName,
                        productVariantDetails: element.productVariantDetails[0].productVariantName,
                        totalUnitPrice: element.totalUnitPrice,
                        grandTotal: element.grandTotal,
                        qauntityRefunded: element.qauntityRefunded,
                        ReturnedComment: element.ReturnedComment,
                  });
            }
            // excelExportData.push(products)

            var temp = JSON.stringify(excelExportData);
            temp = JSON.parse(temp);
            var ws = XLSX.utils.json_to_sheet(temp);
            let today = new Date();

            let folder = `uploads/reports/seller-report/${req.userId}/`;
            //check if folder exist or not if not then create folder user createdirectory middleware
            await createDirectories(folder);

            var down = `${folder}return_products_report_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
            XLSX.utils.book_append_sheet(wb, ws, "sheet1");
            XLSX.writeFile(wb, down);

            let newReport = new ALL_MODELS.reportModel({
                  sellerId: req.userId,
                  ReportName: "products Report",
                  ReportLink: (req.headers.host + down).replace(/uploads\//g, "/"),
            });

            let data = await newReport.save();

            return res.send({
                  message: "products Report has been Downloded!",
                  d: data,
            });
      } catch (error) {
            console.log(error)
            return res.status(403).send({ message: error.message });
      }
}; // End of products_report excel

const convertDateTime = (createdAt) => {
      let date = createdAt;
      let year = date.getFullYear();
      let mnth = ("0" + (date.getMonth() + 1)).slice(-2);
      let day = ("0" + date.getDate()).slice(-2);
      let hr = ("0" + date.getHours()).slice(-2);
      let min = ("0" + date.getMinutes()).slice(-2);
      let sec = ("0" + date.getSeconds()).slice(-2);

      // this.orderDate = `${year}-${mnth}-${day}T${hr}:${min}:${sec}`
      return Number(`${year}${mnth}${day}${hr}${min}${sec}`);
};

module.exports = { returned_product_report, returned_product_report_excel }