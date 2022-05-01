let express = require("express");
let allModels = require('./utilities/allModels');
let { body, validationResult } = require("express-validator");
let router = express.Router();
var XLSX = require('xlsx');
var https = require('https');

const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

require("dotenv").config();
var xecdApiClient = require('@xe/xecd-rates-client')
const publicIp = require('public-ip');

var countries = require('country-data').countries,
      currencies = require('country-data').currencies,
      languages = require('country-data').languages;

exports.test = (app) => {

      router.post('/donotuse/seller/delete', [
            body("sellerEmail").notEmpty().isEmail().withMessage("Please enter a valid email address."),
      ], async (req, res) => {
            const validationError = validationResult(req);
            if (!validationError.isEmpty()) {
                  return res.status(403).send({ message: validationError.array() });
            }

            let seller = await allModels.seller.findOne({
                  emailAddress: req.body.sellerEmail
            }).remove();
            return res.send({ deletedCount: seller.deletedCount })
      });


      router.get('/donotuse/currency/rate', async (req, res) => {
            var xecdConfig = {
                  username: process.env.XXUSERNAME,
                  password: process.env.XXPASSWORD,
                  apiUrl: 'https://xecdapi.xe.com/v1/'
            };

            var client = new xecdApiClient.XECD(xecdConfig);

            client.convertFrom(function (err, data) {
                  //console.log(data);
                  try {
                        let currency = ['AED', 'KWD', 'BHD', 'SAR', 'QAR', 'OMR', 'INR', 'USD'];
                        data['to'] = data['to'].filter(a => {
                              return currency.includes(a.quotecurrency);
                        });

                        let allCountries = countries.all;
                        // console.log(allCountries)

                        data['to'].forEach(async el => {
                              try {
                                    let a = allCountries.filter(list => {
                                          return list.currencies[0] == el['quotecurrency']
                                    })
                                    a[0]['currencyName'] = currencies[el['quotecurrency']].name;
                                    a[0]['language'] = languages.all.filter(ab => {
                                          return ab.alpha3.toLowerCase() == a[0]['languages'][0].toLowerCase();
                                    })[0].name.toLowerCase();
                                    //console.log(el, a);

                                    let getCurrency = await allModels.currency.findOne({
                                          'currencyDetails.countryName': a[0]['name']
                                    })

                                    let getCurrencyDecimal = await allModels.currencyDecimal.findOne({
                                          'currencyShort': el['quotecurrency']
                                    }).lean();
                                    if (!getCurrencyDecimal) {
                                          getCurrencyDecimal['currencyDecimal'] = 0;
                                    }

                                    //console.log(getCurrencyDecimal['currencyDecimal'], el['quotecurrency'])
                                    if (!getCurrency) {
                                          let addCurrency = new allModels.currency({
                                                currencyDetails: {
                                                      language: a[0]['language'],
                                                      countryName: a[0]['name'],
                                                      currencyName: a[0]['currencyName'],
                                                      currencyShort: el['quotecurrency']
                                                },
                                                conversionRate: {
                                                      from: { currencyShort: 'BHD', value: '1' },
                                                      to: { currencyShort: el['quotecurrency'], value: el['mid'] },
                                                      decimal: getCurrencyDecimal['currencyDecimal']
                                                }
                                          });
                                          await addCurrency.save()
                                    } else {
                                          getCurrency.conversionRate.to.value = el['mid'];
                                          getCurrency.conversionRate.to.value = el['mid'];
                                          await getCurrency.save()
                                    }
                              } catch (err) { }
                        });
                  } catch (err) { }
                  return res.send({ data: data });

            }, 'BHD');//, 'INR', 'AED', 100



      });

      router.get('/donotuse/ip', async (req, res) => {
            //console.log(await publicIp.v4());
            let ipV4 = await publicIp.v4()
            //=> '46.5.21.123'

            return res.send({ message: "ip address get", ipV4 })

            //console.log(await publicIp.v6());

      })


      router.get('/donotuse/category', async (req, res) => {
            /* const { search } = req.query;

            const filter = {};
            if (search) {
                const regexp = new RegExp(search, "i");
                filter["$or"] = [
                    { "productVariants.productVariantDetails.productVariantName": regexp },
    
                ];
            }
            let a = await mongoose.connection.collection("cartview").find(filter).toArray(); //limit(2).skip(0) */

            let date = new Date();
            date.setMinutes(00);
            date.setHours(00);
            date.setSeconds(00);
            date.setDate(date.getDate() - 8);

            return res.send({ data: date, date: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}` });
      })

      router.post('/download', async (req, res) => {
            var wb = XLSX.utils.book_new(); //new workbook
            let cart = await allModels.cartModel.find({
            }).populate([
                  { path: "customerId", select: ["firstName"] },
                  {
                        path: 'productVariants.productVariantId',
                        select: ["productVariantDetails.productVariantName"],
                  }]
            )

            let excelExportData = []

            for (let index = 0; index < cart.length; index++) {
                  const ele = cart[index];
                  // ele.customerId.firstName= null ? "" : ele.customerId.firstName

                  for (let i = 0; i < ele['productVariants'].length; i++) {
                        const element = ele['productVariants'][i];
                        // console.log(ele.customerId)
                        excelExportData.push({
                              _id: ele.id,
                              Name: ele.customerId == null ? null : ele.customerId.firstName,
                              deviceIdentifier: ele.deviceIdentifier,
                              productVariantId: element.productVariantId._id,
                              english_productVariantName: element.productVariantId.productVariantDetails[0].productVariantName,
                              arabic_productVariantName: element.productVariantId.productVariantDetails[1].productVariantName,
                              quantity: element.quantity,
                              createdAt: element.createdAt
                        });
                  }
            }
            // console.log(excelExportData)
            var temp = JSON.stringify(excelExportData);
            temp = JSON.parse(temp);
            var ws = XLSX.utils.json_to_sheet(temp);
            let today = new Date();
            var down = __dirname + `/uploads/cartExport_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`
            XLSX.utils.book_append_sheet(wb, ws, "sheet1");
            XLSX.writeFile(wb, down);
            return res.download(down);
            //return res.send({ d: cart })
      })


      router.get('/donotuse/seller', async (req, res) => {
            let allseller = await allModels.seller.find({});
            for (let index = 0; index < allseller.length; index++) {
                  const ele = allseller[index];

                  let seller = await allModels.seller.findOne({ _id: ele._id });
                  await seller.save()
                  /* if (!seller.tapCustomerId) {
                        if (seller) {
                              const postData = {
                                    "first_name": seller.sellerDetails.sellerfName,
                                    "last_name": seller.sellerDetails.sellerlName,
                                    "email": seller.emailAddress,
                                    "phone": {
                                          "country_code": seller.countryCode,
                                          "number": seller.mobilePhone
                                    },
                                    "currency": "BHD"
                              };

                              const request = require('request-promise');

                              const options = {
                                    method: 'POST',
                                    uri: 'https://api.tap.company/v2/customers',
                                    body: postData,
                                    json: true,
                                    headers: {
                                          'Content-Type': 'application/json',
                                          'Authorization': 'Bearer sk_test_XKokBfNWv6FIYuTMg5sLPjhJ'
                                    }
                              }

                              request(options)
                                    .then(function (response) {
                                          seller.tapCustomerId = response.id
                                          seller.save();
                                          //console.log(response);
                                    }).catch(function (err) {
                                          console.log('err');
                                    })
                        }
                  } else {
                        await seller.save();
                  } */
            }
            return res.send({ message: 'success' });

      })

      router.get('/donotuse/order', async (req, res) => {
            const request = require('request-promise');
            var convert = require('xml-js');
            let jsonData = {
                  "ns2:SmsResponse": {
                        "_attributes": {
                              "xmlns:ns2": "http://esms.etisalcom.net/sp"
                        },
                        "ns1:Id": {
                              "_attributes": {
                                    "xmlns:ns1": "http://esms.etisalcom.net/types"
                              },
                              "_text": "7086758"
                        },
                        "ns1:From": {
                              "_attributes": {
                                    "xmlns:ns1": "http://esms.etisalcom.net/types"
                              },
                              "_text": "My Market"
                        },
                        "ns1:At": {
                              "_attributes": {
                                    "xmlns:ns1": "http://esms.etisalcom.net/types"
                              },
                              "_text": "2021-11-08T13:01:02.000+03:00"
                        },
                        "Numbers": {
                              "_attributes": {
                                    "xmlns": "http://esms.etisalcom.net/types"
                              },
                              "Number": {
                                    "To": {
                                          "_text": "918898457107"
                                    },
                                    "Status": {
                                          "_text": "PENDING"
                                    },
                                    "Time": {
                                          "_text": "2021-11-08T13:01:02.378+03:00"
                                    }
                              }
                        }
                  }
            }
            delete jsonData["ns2:SmsResponse"]["_attributes"];

            let key = Object.keys(jsonData["ns2:SmsResponse"]);
            for (let index = 0; index < key.length; index++) {
                  const ele = key[index];
                  delete jsonData["ns2:SmsResponse"][ele]["_attributes"]

                  if (ele.includes("ns1")) {
                        jsonData["ns2:SmsResponse"][ele.split(":")[1]] = jsonData["ns2:SmsResponse"][ele]['_text']
                        delete jsonData["ns2:SmsResponse"][ele]
                  } else if (ele == "Numbers") {
                        jsonData["ns2:SmsResponse"][ele]["Number"]["To"] = jsonData["ns2:SmsResponse"][ele]["Number"]["To"]["_text"]
                        jsonData["ns2:SmsResponse"][ele]["Number"]["Time"] = jsonData["ns2:SmsResponse"][ele]["Number"]["Time"]["_text"]
                        jsonData["ns2:SmsResponse"][ele]["Number"]["Status"] = jsonData["ns2:SmsResponse"][ele]["Number"]["Status"]["_text"]
                  }
            }

            const options = {
                  method: 'GET',
                  uri: `https://esms.etisalcom.net:9443/smsportal/services/SpHttp/getdlr?user=mymarket&pass=AmE853@KNr&id=${jsonData["ns2:SmsResponse"]['Id']}`,
            }

            request(options)
                  .then(function (response) {
                        //console.log(response);
                        let result = convert.xml2json(response, { compact: true, spaces: 4 });
                        return res.send(result);
                  }).catch(function (err) {
                        console.log(err);
                  })

            // return res.send(jsonData["ns2:SmsResponse"]);
            /* const options = {
                  method: 'GET',
                  uri: 'https://esms.etisalcom.net:9443/smsportal/services/SpHttp/sendsms?user=mymarket&pass=AmE853@KNr&from=My+Market&to=918898457107&text=Test+message+from+HTTP+API+for+My+Market',
            }

            request(options)
                  .then(function (response) {
                        //console.log(response);
                        let result = convert.xml2json(response, { compact: true, spaces: 4 });
                        return res.send(result["ns2:SmsResponse"]);
                  }).catch(function (err) {
                        console.log(err);
                  }) */
      });

      router.post("/donotuse/shipping", async (req, res) => {
            let shipping = new allModels.orderShippingNew({
                  orderId: req.body.orderId,
                  sellerId: req.body.sellerId,
                  shippingMethod: req.body.shippingMethod,
                  shippingPrice: req.body.shippingPrice,
                  externalAWB: req.body.externalAWB
            })

            let data = await shipping.save()

            return res.send({ data: data })



      })

      router.post("/donotuse/shipping/status", async (req, res) => {
            let shippingStatus = new allModels.orderStatusUpdate({
                  orderShippingId: req.body.orderShippingId,
                  description: req.body.description,
                  status: req.body.status
            })
            let data = await shippingStatus.save()
            return res.send({ data: data })
      })

      router.get("/donotuse/pv", async (req, res) => {

            let pv = await allModels.permissions.find({})

            for (let index = 0; index < pv.length; index++) {
                  const ele = pv[index];
                  let pvEdit = await allModels.permissions.findOne({ _id: ele._id });
                  // pvEdit.indexNo = 1001 + index;
                  pvEdit.code = parseInt(pvEdit.code);
                  //pvEdit.RefundChargesPaidBy = "";
                  //pvEdit.RefundedTo = "";
                  //pvEdit.CancelledBy = "";

                  await pvEdit.save();
            }
            return res.send({ data: "success" })
      })
      router.post("/donotuse/order", async (req, res) => {
            let orderItem = new allModels.orderModel(req.body)
            let data = await orderItem.save()
            return res.send({ data: data })
      });

      router.get("/donotuse/aramex", async (req, res) => {
            let data = {
                  seller: null,
                  customer: { details: null, address: null },
                  order: { id: null, products: null }
            }
            data.seller = await allModels.seller.findOne({ _id: "6161502e7d64e78a2ca258bf" });
            data.customer.details = await allModels.customer.findOne({ _id: "61d98332db6b9f39857a1e6b" });
            data.customer.address = await allModels.customerAddress.findOne({ customerId: "61d98332db6b9f39857a1e6b" });

            let aramex = require("./app/middlewares/aramex");
            let cities = await aramex.fetchCities("BH");
            // let countries = await aramex.fetchCountires();
            // let country = await aramex.fetchCountry("BH");
            let rate = await aramex.calculateRate(data);
            // let a = await aramex.createShipment(data);
            return res.send({ rate: rate, cities: cities, data: data }); //country: country, countries: countries,

            // let office = await aramex.fetchOffices("IN");
            /* let address = await aramex.validateAddress({
                  Line1: "Flat 203, Pawan palace",
                  Line2: "Ganesh nagar, chinchpada road, Kalyan(E)",
                  City: "Thane",
                  PostCode: "421306",
                  CountryCode: "IN"

            }); */
            //, cities: cities, office: office
            /* let rate = await aramex.calculateRate({
                  OriginAddress: {
                        Line1: "Flat 203, Pawan palace",
                        Line2: "Ganesh nagar, chinchpada road, Kalyan(E)",
                        City: "Thane",
                        PostCode: "421306",
                        StateOrProvinceCode: "",
                        CountryCode: "IN"
                  },
                  DestinationAddress: {
                        Line1: "Flat 203, Pawan palace",
                        Line2: "Ganesh nagar, chinchpada road, Kalyan(E)",
                        City: "Thane",
                        PostCode: "421306",
                        StateOrProvinceCode: "",
                        CountryCode: "IN"
                  }
            }); */

            //return res.send({ cities: cities }); //country: country, address: address
      })

      router.get("/donotuse/pvspecification", async (req, res) => {
            let a = await allModels.productVariant.aggregate([
                  {
                        $match: {
                              $and: [
                                    { "sellerId": ObjectId('6159a4c59d35c02f816f4e98') },
                                    { productVariantSpecifications: { $ne: [] } },
                                    { "productVariantSpecifications": { $ne: null } },
                                    { productId: ObjectId('6159a5090709242f88e774cb') }
                              ]
                        }
                  },
                  { $unwind: "$productVariantSpecifications" },
                  {
                        $match: {
                              productVariantSpecifications: {
                                    $elemMatch: {
                                          'showOnProductPage': true,
                                    }
                              }
                        }
                  },
                  {
                        $group: {
                              _id: "$_id",
                              sellerId: { $first: "$sellerId" },
                              productVariantDetails: { $first: "$productVariantDetails" },
                              specifications: {
                                    $addToSet: {
                                          field: { $first: "$productVariantSpecifications.field" },
                                          value: { $first: "$productVariantSpecifications.value" }
                                    }
                              },
                              // productVariantSpecifications: { $push: "$productVariantSpecifications" }
                        }
                  },
                  {
                        $project: {
                              sellerId: 1,
                              specifications: 1,

                              // productVariantSpecifications: 1,
                              productVariantDetails: 1

                        }
                  }

            ]);
            return res.send({ count: a.length, data: a });
      });

      app.use(router);


}
