const { createDirectories } = require('./../../../middlewares/checkCreateFolder');
var XLSX = require("xlsx");

const ALL_MODELS = require("../../../../../utilities/allModels");

const returned_items_comment_report = async (req, res) => {
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
            let searchFilter = {};

            if (search) {
                  const regexp = new RegExp(search, "i");

                  searchFilter["$or"] = [
                        { "productvariant.productVariantDetails.productVariantName": regexp },
                        { "customer.firstName": regexp },
                        { "customer.lastName": regexp },
                        { "seller.sellerDetails.sellerfName": regexp },
                        { "seller.sellerDetails.sellerlName": regexp },
                        { "seller.nameOfBussinessEnglish": regexp },
                  ];
                  if (parseInt(search) != NaN) {
                        searchFilter["$or"].push({ "product_sold_count": parseInt(search) })
                        searchFilter["$or"].push({ "total_amount": parseInt(search) })
                  }
            }

            // Filter
            let filter = { $and: [] };

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
                  filter['$and'].push({ createdDate: { $gte: dt } })
            }
            if (end_date) {
                  end_date = new Date(end_date)
                  end_date.setHours(23); end_date.setMinutes(59); end_date.setSeconds(59);
                  // end_date.setDate(end_date.getDate() + 1)
                  let dt = convertDateTime(end_date);
                  filter['$and'].push({ createdDate: { $lte: dt } })
            }

            // Going to apply defalult 1 month date filter
            if (!start_date) {
                  let dt = convertDateTime(defaultDate);
                  filter['$and'].push({ createdDate: { $gte: dt } })
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
                  filterSecond['$and'].push({ qauntityRefunded: { $gte: quantity_refunded_start } })
            }
            if (quantity_refunded_end) {
                  if (!filterSecond['$and']) {
                        filterSecond['$and'] = []
                  }
                  filterSecond['$and'].push({ qauntityRefunded: { $lte: quantity_refunded_end } })
            }
            // End of quantity sold

            // total_amount
            if (total_amount_start) {
                  if (!filterSecond['$and']) {
                        filterSecond['$and'] = []
                  }
                  filterSecond['$and'].push({ grandTotal: { $gte: total_amount_start } })
            }
            if (total_amount_end) {
                  if (!filterSecond['$and']) {
                        filterSecond['$and'] = []
                  }
                  filterSecond['$and'].push({ grandTotal: { $lte: total_amount_end } })
            }
            // End of total_amount

            // Fetching order products
            const products = await ALL_MODELS.orderItems.aggregate([
                  { $match: { Returned: true } },
                  // Match
                  { $match: filter },
                  // Joining orderProducts collection with products collection
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
                              from: "customers",
                              localField: "order.customerId",
                              foreignField: "_id",
                              as: "customer"
                        }
                  },
                  { $unwind: "$customer" },
                  {
                        $lookup: {
                              from: "sellers",
                              localField: "sellerId",
                              foreignField: "_id",
                              as: "seller"
                        }
                  },
                  { $unwind: "$seller" },
                  {
                        $lookup: {
                              from: "productvariants",
                              localField: "productVariantId",
                              foreignField: "_id",
                              as: "productvariant",
                        },
                  },
                  { $unwind: "$productvariant" },
                  {
                        $lookup: {
                              from: "products",
                              localField: "productvariant.productId",
                              foreignField: "_id",
                              as: "product",
                        },
                  },
                  { $unwind: "$product" },
                  { $match: searchFilter },
                  {
                        $addFields: {
                              ReturnedBy: { $concat: ["$customer.firstName", "(Customer)"] }
                        }
                  },
                  {
                        $project: {
                              customer: "$customer.firstName",
                              seller: "$seller.sellerDetails",
                              nameOfBussinessEnglish: "$seller.nameOfBussinessEnglish",
                              unitPrice: "$productvariant.productNetPrice",
                              productVariantDetails: 1,
                              product: 1,
                              totalUnitPrice: 1,
                              grandTotal: 1,
                              qauntityRefunded: "$quantity",
                              ReturnedComment: 1,
                              RefundedBy: 1,
                              RefundedComment: 1,
                              ReturnedBy: 1
                        }
                  },
                  // Match
                  { $match: filterSecond },
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
                  totalCount = products[0].totalCount[0].count
            } catch (err) { }

            return res.json({
                  totalCount: totalCount,
                  data: products.length ? products[0].paginatedResults : [],
                  pageNo: pageNo
            });
      } catch (error) {
            return res.status(403).send({ message: error.message });
      }
}

const returned_items_comment_report_excel = async (req, res) => {
      let {
            start_date, end_date,
            quantity_refunded_start, quantity_refunded_end,
            total_amount_start, total_amount_end,
            search
      } = req.body;

      try {
            let searchFilter = {};

            if (search) {
                  const regexp = new RegExp(search, "i");

                  searchFilter["$or"] = [
                        { "productvariant.productVariantDetails.productVariantName": regexp },
                        { "customer.firstName": regexp },
                        { "customer.lastName": regexp },
                        { "seller.sellerDetails.sellerfName": regexp },
                        { "seller.sellerDetails.sellerlName": regexp },
                        { "seller.nameOfBussinessEnglish": regexp },
                  ];
                  if (parseInt(search) != NaN) {
                        searchFilter["$or"].push({ "product_sold_count": parseInt(search) })
                        searchFilter["$or"].push({ "total_amount": parseInt(search) })
                  }
            }

            // Filter
            let filter = { $and: [] };

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
                  filter['$and'].push({ createdDate: { $gte: dt } })
            }
            if (end_date) {
                  end_date = new Date(end_date)
                  end_date.setHours(23); end_date.setMinutes(59); end_date.setSeconds(59);
                  // end_date.setDate(end_date.getDate() + 1)
                  let dt = convertDateTime(end_date);
                  filter['$and'].push({ createdDate: { $lte: dt } })
            }

            // Going to apply defalult 1 month date filter
            if (!start_date) {
                  let dt = convertDateTime(defaultDate);
                  filter['$and'].push({ createdDate: { $gte: dt } })
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
                  filterSecond['$and'].push({ qauntityRefunded: { $gte: quantity_refunded_start } })
            }
            if (quantity_refunded_end) {
                  if (!filterSecond['$and']) {
                        filterSecond['$and'] = []
                  }
                  filterSecond['$and'].push({ qauntityRefunded: { $lte: quantity_refunded_end } })
            }
            // End of quantity sold

            // total_amount
            if (total_amount_start) {
                  if (!filterSecond['$and']) {
                        filterSecond['$and'] = []
                  }
                  filterSecond['$and'].push({ grandTotal: { $gte: total_amount_start } })
            }
            if (total_amount_end) {
                  if (!filterSecond['$and']) {
                        filterSecond['$and'] = []
                  }
                  filterSecond['$and'].push({ grandTotal: { $lte: total_amount_end } })
            }
            // End of total_amount

            // Fetching order products
            const products = await ALL_MODELS.orderItems.aggregate([
                  { $match: { Returned: true } },
                  // Match
                  { $match: filter },
                  
                  // Joining orderProducts collection with products collection
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
                              from: "customers",
                              localField: "order.customerId",
                              foreignField: "_id",
                              as: "customer"
                        }
                  },
                  { $unwind: "$customer" },
                  {
                        $lookup: {
                              from: "sellers",
                              localField: "sellerId",
                              foreignField: "_id",
                              as: "seller"
                        }
                  },
                  { $unwind: "$seller" },
                  {
                        $lookup: {
                              from: "productvariants",
                              localField: "productVariantId",
                              foreignField: "_id",
                              as: "productvariant",
                        },
                  },
                  { $unwind: "$productvariant" },
                  {
                        $lookup: {
                              from: "products",
                              localField: "productvariant.productId",
                              foreignField: "_id",
                              as: "product",
                        },
                  },
                  { $unwind: "$product" },
                  { $match: searchFilter },
                  {
                        $project: {
                              customer: "$customer.firstName",
                              seller: "$seller.sellerDetails",
                              nameOfBussinessEnglish: "$seller.nameOfBussinessEnglish",
                              unitPrice: "$productvariant.productNetPrice",
                              productVariantDetails: 1,
                              product: 1,
                              totalUnitPrice: 1,
                              grandTotal: 1,
                              qauntityRefunded: "$quantity",
                              ReturnedComment: 1,
                        },
                  },
                   // Match
                   { $match: filterSecond },
            ]);

            var wb = XLSX.utils.book_new(); //new workbook
            let excelExportData = [];

            for (let index = 0; index < products.length; index++) {
                  const element = products[index];

                  excelExportData.push({
                        customer: element.customer,
                        seller: element.seller,
                        unitPrice: element.unitPrice,
                        productVariantDetails: element.productVariantDetails[0].productVariantName,
                        totalUnitPrice: element.totalUnitPrice,
                        grandTotal: element.grandTotal,
                        qauntityRefunded: element.qauntityRefunded,
                        ReturnedComment: element.ReturnedComment,
                  });
            }

            var temp = JSON.stringify(excelExportData);
            temp = JSON.parse(temp);
            var ws = XLSX.utils.json_to_sheet(temp);
            let today = new Date();

            let folder = `uploads/reports/admin-report/${req.userId}/`;
            //check if folder exist or not if not then create folder user createdirectory middleware
            await createDirectories(folder);

            var down = `${folder}returned_items_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
            XLSX.utils.book_append_sheet(wb, ws, "sheet1");
            XLSX.writeFile(wb, down);

            let newReport = new ALL_MODELS.reportModel({
                  sellerId: req.userId,
                  ReportName: "Returned Items Report",
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

module.exports = { returned_items_comment_report, returned_items_comment_report_excel };