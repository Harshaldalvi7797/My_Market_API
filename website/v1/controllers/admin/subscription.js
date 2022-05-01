const ALL_MODELS = require("../../../../utilities/allModels");
const { validationResult } = require('express-validator');
let mongoose = require("mongoose");
var XLSX = require('xlsx');

exports.subscriptionWithSearch = async (req, res) => {
      let { search, paymentMethod, status, sellerCountry, customerCountry, subscriptionType } = req.body;
      let { limit, page } = req.body;
      if (!limit) { limit = 10 }
      if (!page) { page = 1 }

      let perPage = parseInt(limit)
      let pageNo = Math.max(0, parseInt(page))

      if (pageNo > 0) {
            pageNo = pageNo - 1;
      } else if (pageNo < 0) {
            pageNo = 0;
      }
      let filterSearch = {};
      let filter = {};

      if (paymentMethod) {
            try {
                  filter["$and"] = [{ paymentMethod: { $in: paymentMethod } }]
            } catch (error) {
                  console.log(error.message);
            }

      }

      if (status) {
            try {
                  if (!filter["$and"]) {
                        filter["$and"] = [{ "subscription.status": { $in: status } }]
                  } else {
                        filter["$and"].push({ "subscription.status": { $in: status } });
                  }
            } catch (error) {
                  console.log(error.message);
            }

      }

      if (sellerCountry) {
            try {
                  if (!filter["$and"]) {
                        filter["$and"] = [{ "seller.sellerFilterCountry": { $in: sellerCountry } }]
                  } else {
                        filter["$and"].push({ "seller.sellerFilterCountry": { $in: sellerCountry } });
                  }
            } catch (error) {
                  console.log(error.message);
            }
      }

      if (customerCountry) {
            try {
                  if (!filter["$and"]) {
                        filter["$and"] = [{ "customerDelhiveryDetails.shippingDetails.country": { $in: customerCountry } }]
                  } else {
                        filter["$and"].push({ "customerDelhiveryDetails.shippingDetails.country": { $in: customerCountry } });
                  }
            } catch (error) {
                  console.log(error.message);
            }
      }

      if (subscriptionType) {
            try {
                  filter["$and"] = [{ "subscription.subscriptionType": { $in: subscriptionType } }]
            } catch (error) {
                  console.log(error.message);
            }

      }

      if (search) {
            if (isNaN(parseInt(search))) {
                  //console.log(search.split(" "))
                  const regexp = new RegExp(search, "i");
                  filterSearch["$or"] = [
                        { "paymentMethod": regexp },
                        { "customer.fullName": regexp },
                        { "customerDelhiveryDetails.shippingDetails.country": regexp },
                        { "seller.nameOfBussinessEnglish": regexp },
                        { "seller.sellerCountry": regexp },
                        { "subscription.subscriptionType": regexp },
                        // { "order_shipping_id": regexp }
                  ];
            }
            if (!isNaN(parseInt(search))) {
                  if (!filterSearch["$or"]) { filterSearch["$or"] = [] }

                  let totalPrice = { $gt: parseFloat(search) - 1, $lt: parseFloat(search) + 1 };
                  // console.log(totalPrice);
                  filterSearch["$or"].push({ "subscription.indexNo": parseInt(search) });
                  filterSearch["$or"].push({ "totalPrice": totalPrice });
            }

      }

      try {
            let orderItemFilter = {
                  $expr: {
                        $and: [
                              { $eq: ["$orderId", "$$orderId"] },
                              { $eq: ["$sellerId", "$$sellerId"] }
                        ]
                  }
            }

            const orderShipping = await ALL_MODELS.orderModel.aggregate([
                  {
                        $lookup: {
                              from: "subscribeproducts",
                              localField: "subscriptionId",
                              foreignField: "_id",
                              as: "subscription",
                        }
                  },
                  { $match: { subscriptionId: { $ne: null } } },
                  { $unwind: "$subscription" },
                  {
                        $lookup: {
                              from: "ordershippings",
                              localField: "_id",
                              foreignField: "orderId",
                              as: "orderShippings",
                        }
                  },
                  {
                        $lookup: {
                              from: "customers",
                              localField: "customerId",
                              foreignField: "_id",
                              as: "customer",
                        },
                  },
                  { $unwind: "$customer" },
                  { $unwind: "$orderShippings" },
                  {
                        $lookup: {
                              from: "orderstatusupdates",
                              localField: "orderShippings._id",
                              foreignField: "orderShippingId",
                              as: "orderStatusUpdate",
                        }
                  },
                  {
                        $lookup: {
                              from: "sellers",
                              localField: "orderShippings.sellerId",
                              foreignField: "_id",
                              as: "sellers",
                        },
                  },
                  { $addFields: { orderStatus: { $last: "$orderStatusUpdate.status" } } },
                  {
                        $lookup: {
                              from: "orderitems",
                              let: {
                                    orderId: "$orderShippings.orderId",
                                    sellerId: "$orderShippings.sellerId",
                              },
                              pipeline: [
                                    {
                                          $match: orderItemFilter
                                    }
                              ],
                              as: "orderItems",
                        },
                  },
                  { $addFields: { "customer.fullName": { $concat: ["$customer.firstName", " ", "$customer.lastName"] } } },
                  {
                        $project: {
                              customer: 1,
                              customerDelhiveryDetails: 1,
                              orderShippings: 1,
                              seller: {
                                    nameOfBussinessEnglish: { $first: "$sellers.nameOfBussinessEnglish" },
                                    sellerCountry: { $replaceAll: { input: { $first: "$sellers.sellerCountry" }, find: "_", replacement: " " } },
                                    sellerFilterCountry: { $first: "$sellers.sellerCountry" }
                              },
                              // subscriptionId: 1,
                              subscription: 1,
                              paymentMethod: 1,
                              orderItems: 1,
                              totalPrice: { $sum: "$orderItems.grandTotal" },
                              indexNo: 1,
                              order_shipping_id: { $concat: ["#", { $toString: "$indexNo" }, "_", { $toString: "$orderShippings.indexNo" }] },
                              orderStatus: 1,
                              createdAt: 1,
                              updatedAt: 1
                        }
                  },
                  {
                        $project: {
                              "customer.tapCustomerId": 0,
                              "customer.__v": 0,
                              "customer.password": 0,
                              "customer.expireOtp": 0,
                              "customer.otp": 0,
                              "customer.resetpasswordtoken": 0,
                              "customer.emailAddressVerified": 0,
                              "customer.mobilePhoneVerified": 0,
                              "customer.googleLoginId": 0,
                              "customer.referralCode": 0,
                        }
                  },
                  { $match: filterSearch },
                  { $match: filter },
                  { $sort: { "orderShippings._id": -1 } },
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
            ])

            const orderShippingList = orderShipping.length ? orderShipping[0].paginatedResults : [];
            let totalCount = 0
            try {
                  totalCount = orderShipping[0].totalCount[0].count
            } catch (err) { }

            return res.send({ totalCount: totalCount, count: orderShippingList.length, data: orderShippingList })

      } catch (error) {
            return res.status(500).send({
                  message: error.message,
            });
      }
}

exports.subscriptionExportExcel = async (req, res) => {
      try {
            const orderShipping = await subscriptionGetDataByFilter(req);
            let excelExportData = []

            for (let index = 0; index < orderShipping.length; index++) {
                  let element = orderShipping[index]
                  let startDate = new Date(parseInt(element.subscription.fromDate));
                  let endDate = new Date(parseInt(element.subscription.toDate));

                  excelExportData.push({
                        "Subscription#": element.subscription.indexNo,
                        "Total Price": element.totalPrice,
                        "Payment Method": element.paymentMethod,
                        "Subscription Interval": element.subscription.interval + "" + element.subscription.subscriptionType,
                        "Seller": element.seller.nameOfBussinessEnglish,
                        "Customer": element.customer.fullName,
                        "Seller Country": element.seller.sellerCountry,
                        "Customer Country": element.customerDelhiveryDetails.shippingDetails.country,
                        "Billing Address": element.customerDelhiveryDetails.billingDetails.addressLine1 + " " + element.customerDelhiveryDetails.billingDetails.addressLine2,
                        "Shipping Address": element.customerDelhiveryDetails.shippingDetails.addressLine1 + " " + element.customerDelhiveryDetails.shippingDetails.addressLine2,
                        "Start Date": `${startDate.getDate()}-${startDate.getMonth() + 1}-${startDate.getFullYear()} ${startDate.toLocaleTimeString()}`,
                        "End Date": `${endDate.getDate()}-${endDate.getMonth() + 1}-${endDate.getFullYear()} ${endDate.toLocaleTimeString()}`,
                        "Status": element.subscription.status
                  })
            }

            var wb = XLSX.utils.book_new(); //new workbook
            var temp = JSON.stringify(excelExportData);
            temp = JSON.parse(temp);
            var ws = XLSX.utils.json_to_sheet(temp);
            let today = new Date();
            var down = `uploads/reports/subscriptionlistExport_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`

            XLSX.utils.book_append_sheet(wb, ws, "sheet1");
            XLSX.writeFile(wb, down);


            let newReport = new ALL_MODELS.reportModel({
                  adminId: req.userId,
                  ReportName: "subscriptionlistExcel",
                  ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
            })

            let data = await newReport.save()

            return res.send({ message: "Your download will begin now.", data: data })

      } catch (error) {
            return res.status(500).send({
                  message: error.message,
            });
      }
}

exports.subscriptionSummary = async (req, res) => {

}

exports.subscriptionBulkStatusUpdate = async (req, res) => {
      const validationError = validationResult(req);
      if (!validationError.isEmpty()) {
            return res.status(403).send({ message: validationError.array() });
      }

      let { statusSet, subscriptionList } = req.body;
      let { search, paymentMethod, status, sellerCountry, customerCountry, subscriptionType } = req.body;
      if (search || paymentMethod || status || sellerCountry || customerCountry || subscriptionType) {
            let data = await subscriptionGetDataByFilter(req);
            subscriptionList = [];
            for (let index = 0; index < data.length; index++) {
                  const element = data[index];
                  subscriptionList.push(element.subscription._id);
            }
      }

      let filter = {}
      if (typeof subscriptionList == "object") {
            filter = {
                  $and: [
                        { _id: { $in: subscriptionList } },
                        { status: { $ne: "Cancelled" } }
                  ]
            }

            await subscriptionUpdateOrderItem(filter, statusSet);
            await ALL_MODELS.subscribeModel.updateMany(filter, { $set: { "status": statusSet } });
            return res.send({ message: "Subscription status updated successfully" });
      } else if (typeof subscriptionList == "string" && subscriptionList == "all") {
            filter = {
                  $and: [
                        { status: { $ne: "Cancelled" } }
                  ]
            }

            await subscriptionUpdateOrderItem(filter, statusSet);
            await ALL_MODELS.subscribeModel.updateMany(filter, { $set: { "status": statusSet } });
            return res.send({ message: "Subscription status updated successfully" });
      }

}

const subscriptionUpdateOrderItem = async (filter, statusSet) => {
      // console.log(JSON.stringify(filter))
      if (statusSet == "Cancelled") {
            let subscription = await ALL_MODELS.subscribeModel.find(filter);
            let order = await ALL_MODELS.orderModel.find({ subscriptionId: { $in: subscription.map(data => data._id) } });

            let data = {
                  "Cancelled": true,
                  "CancelledComment": "Cancelled by Admin",
                  "CancelledDateTime": new Date()
            }
            let search = order.map(data => data._id);
            // console.log(search)
            await ALL_MODELS.orderItems.updateMany({ orderId: { $in: search } }, { $set: data })

      }
}

const subscriptionGetDataByFilter = async (req) => {
      try {
            let { search, paymentMethod, status, sellerCountry, customerCountry, subscriptionType } = req.body;

            let filterSearch = {};
            let filter = {};

            if (paymentMethod) {
                  try {
                        filter["$and"] = [{ paymentMethod: { $in: paymentMethod } }]
                  } catch (error) {
                        console.log(error.message);
                  }

            }

            if (status) {
                  try {
                        if (!filter["$and"]) {
                              filter["$and"] = [{ "subscription.status": { $in: status } }]
                        } else {
                              filter["$and"].push({ "subscription.status": { $in: status } });
                        }
                  } catch (error) {
                        console.log(error.message);
                  }
            }

            if (sellerCountry) {
                  try {
                        if (!filter["$and"]) {
                              filter["$and"] = [{ "seller.sellerFilterCountry": { $in: sellerCountry } }]
                        } else {
                              filter["$and"].push({ "seller.sellerFilterCountry": { $in: sellerCountry } });
                        }
                  } catch (error) {
                        console.log(error.message);
                  }
            }

            if (customerCountry) {
                  try {
                        if (!filter["$and"]) {
                              filter["$and"] = [{ "customerDelhiveryDetails.shippingDetails.country": { $in: customerCountry } }]
                        } else {
                              filter["$and"].push({ "customerDelhiveryDetails.shippingDetails.country": { $in: customerCountry } });
                        }
                  } catch (error) {
                        console.log(error.message);
                  }
            }

            if (subscriptionType) {
                  try {
                        filter["$and"] = [{ "subscription.subscriptionType": { $in: subscriptionType } }]
                  } catch (error) {
                        console.log(error.message);
                  }

            }

            if (search) {
                  if (isNaN(parseInt(search))) {
                        //console.log(search.split(" "))
                        const regexp = new RegExp(search, "i");
                        filterSearch["$or"] = [
                              { "paymentMethod": regexp },
                              { "customer.fullName": regexp },
                              { "customerDelhiveryDetails.shippingDetails.country": regexp },
                              { "seller.nameOfBussinessEnglish": regexp },
                              { "seller.sellerCountry": regexp },
                              { "subscription.subscriptionType": regexp },
                              // { "order_shipping_id": regexp }
                        ];
                  }
                  if (!isNaN(parseInt(search))) {
                        if (!filterSearch["$or"]) { filterSearch["$or"] = [] }

                        let totalPrice = { $gt: parseFloat(search) - 1, $lt: parseFloat(search) + 1 };
                        // console.log(totalPrice);
                        filterSearch["$or"].push({ "subscription.indexNo": parseInt(search) });
                        filterSearch["$or"].push({ "totalPrice": totalPrice });
                  }

            }

            let orderItemFilter = {
                  $expr: {
                        $and: [
                              { $eq: ["$orderId", "$$orderId"] },
                              { $eq: ["$sellerId", "$$sellerId"] }
                        ]
                  }
            }

            const orderShipping = await ALL_MODELS.orderModel.aggregate([
                  {
                        $lookup: {
                              from: "subscribeproducts",
                              localField: "subscriptionId",
                              foreignField: "_id",
                              as: "subscription",
                        }
                  },
                  { $match: { subscriptionId: { $ne: null } } },
                  { $unwind: "$subscription" },
                  {
                        $lookup: {
                              from: "ordershippings",
                              localField: "_id",
                              foreignField: "orderId",
                              as: "orderShippings",
                        }
                  },
                  {
                        $lookup: {
                              from: "customers",
                              localField: "customerId",
                              foreignField: "_id",
                              as: "customer",
                        },
                  },
                  { $unwind: "$customer" },
                  { $unwind: "$orderShippings" },
                  {
                        $lookup: {
                              from: "orderstatusupdates",
                              localField: "orderShippings._id",
                              foreignField: "orderShippingId",
                              as: "orderStatusUpdate",
                        }
                  },
                  {
                        $lookup: {
                              from: "sellers",
                              localField: "orderShippings.sellerId",
                              foreignField: "_id",
                              as: "sellers",
                        },
                  },
                  { $addFields: { orderStatus: { $last: "$orderStatusUpdate.status" } } },
                  {
                        $lookup: {
                              from: "orderitems",
                              let: {
                                    orderId: "$orderShippings.orderId",
                                    sellerId: "$orderShippings.sellerId",
                              },
                              pipeline: [
                                    {
                                          $match: orderItemFilter
                                    }
                              ],
                              as: "orderItems",
                        },
                  },
                  { $addFields: { "customer.fullName": { $concat: ["$customer.firstName", " ", "$customer.lastName"] } } },
                  {
                        $project: {
                              customer: 1,
                              customerDelhiveryDetails: 1,
                              orderShippings: 1,
                              seller: {
                                    nameOfBussinessEnglish: { $first: "$sellers.nameOfBussinessEnglish" },
                                    sellerCountry: { $replaceAll: { input: { $first: "$sellers.sellerCountry" }, find: "_", replacement: " " } },
                                    sellerFilterCountry: { $first: "$sellers.sellerCountry" }
                              },
                              // subscriptionId: 1,
                              subscription: 1,
                              paymentMethod: 1,
                              orderItems: 1,
                              totalPrice: { $sum: "$orderItems.grandTotal" },
                              indexNo: 1,
                              order_shipping_id: { $concat: ["#", { $toString: "$indexNo" }, "_", { $toString: "$orderShippings.indexNo" }] },
                              orderStatus: 1
                        }
                  },
                  {
                        $project: {
                              "customer.tapCustomerId": 0,
                              "customer.__v": 0,
                              "customer.password": 0,
                              "customer.expireOtp": 0,
                              "customer.otp": 0,
                              "customer.resetpasswordtoken": 0,
                              "customer.emailAddressVerified": 0,
                              "customer.mobilePhoneVerified": 0,
                              "customer.googleLoginId": 0,
                              "customer.referralCode": 0,
                        }
                  },
                  { $match: filterSearch },
                  { $match: filter },
                  { $sort: { "orderShippings._id": -1 } }
            ]);

            return orderShipping;
      } catch (err) { return false }
}