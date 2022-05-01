const request = require('request-promise');
const countries = require('country-data').countries;
let soap = require('soap');
let { writeLog } = require('./../../../utilities/log');

exports.createShipment = async (data, productGroup = "DOM", productType = "ONP") => {
      return new Promise((resolve, reject) => {

            let a = countries.all.filter(f => f.name.toLowerCase() == data.seller.sellerAddress.orderPickupAddress.companyOrderAddCountryCode.toLowerCase());
            let b = countries.all.filter(f => f.name.toLowerCase() == data.customer.address.country.toLowerCase());
           
            let today = Number(new Date());
                       
            const postData = {
                  Shipments: [
                        {
                              Shipper: {
                                    Reference1: "",
                                    Reference2: "",
                                    AccountNumber: "20016",
                                    PartyAddress: { //seller details
                                          Line1: data.seller.sellerAddress.orderPickupAddress.companyOrderAddLine1,
                                          Line2: data.seller.sellerAddress.orderPickupAddress.companyOrderAddLine2,
                                          Line3: "",
                                          City: data.seller.sellerAddress.orderPickupAddress.companyOrderAddCity,
                                          StateOrProvinceCode: "",
                                          PostCode: data.seller.sellerAddress.orderPickupAddress.companyOrderpostCode,
                                          CountryCode: a[0].alpha2
                                    },
                                    Contact: { //seller contact
                                          Department: "",
                                          PersonName: data.seller.sellerDetails.fullName,
                                          Title: "",
                                          CompanyName: data.seller.nameOfBussiness,
                                          PhoneNumber1: data.seller.mobilePhone,
                                          PhoneNumber1Ext: "",
                                          PhoneNumber2: "",
                                          PhoneNumber2Ext: "",
                                          FaxNumber: "",
                                          CellPhone: data.seller.mobilePhone,
                                          EmailAddress: data.seller.emailAddress,
                                          Type: ""
                                    }
                              },
                              Consignee: {
                                    Reference1: "",
                                    Reference2: "",
                                    AccountNumber: "",
                                    PartyAddress: { //customer details
                                          Line1: data.customer.address.addressLine1,
                                          Line2: data.customer.address.addressLine2,
                                          Line3: "",
                                          City: data.customer.address.city,
                                          StateOrProvinceCode: "",
                                          PostCode: data.customer.address.pincode || "",
                                          CountryCode: b[0].alpha2
                                    },
                                    Contact: { //customer contact
                                          Department: "",
                                          PersonName: data.customer.details.fullName,
                                          Title: "",
                                          CompanyName: data.customer.details.fullName,
                                          PhoneNumber1: data.customer.address.contactPhone,
                                          // PhoneNumber1: data.customer.details.mobilePhone,
                                          PhoneNumber1Ext: "",
                                          PhoneNumber2: "",
                                          PhoneNumber2Ext: "",
                                          FaxNumber: "",
                                          CellPhone: data.customer.details.mobilePhone,
                                          EmailAddress: data.customer.details.emailAddress,
                                          Type: ""
                                    }
                              },
                              ThirdParty: {
                                    Reference1: "",
                                    Reference2: "",
                                    AccountNumber: "",
                                    PartyAddress: {
                                          Line1: "",
                                          Line2: "",
                                          Line3: "",
                                          City: "",
                                          StateOrProvinceCode: "",
                                          PostCode: "",
                                          CountryCode: ""
                                    },
                                    Contact: {
                                          Department: "",
                                          PersonName: "",
                                          Title: "",
                                          CompanyName: "",
                                          PhoneNumber1: "",
                                          PhoneNumber1Ext: "",
                                          PhoneNumber2: "",
                                          PhoneNumber2Ext: "",
                                          FaxNumber: "",
                                          CellPhone: "",
                                          EmailAddress: "",
                                          Type: ""
                                    }
                              },
                              Reference1: `Shpt ${data.shipmentIndex}`,
                              Reference2: "",
                              Reference3: "",
                              ShippingDateTime: "/Date(" + today + ")/",
                              DueDate: "/Date(" + today + ")/",
                              Comments: `Shpt ${data.shipmentIndex}`,
                              PickupLocation: "Reception",
                              OperationsInstructions: "",
                              AccountingInstrcutions: "",
                              Details: {
                                    Dimensions: {
                                          Length: data.order.length,
                                          Width: data.order.width,
                                          Height: data.order.height,
                                          Unit: "cm"
                                    },
                                    ActualWeight: {
                                          Unit: "Kg",
                                          Value: data.order.totalWeight
                                    },
                                    ChargeableWeight: {
                                          Unit: "KG",
                                          Value: data.order.totalWeight
                                    },
                                    DescriptionOfGoods: null,
                                    GoodsOriginCountry: a[0].alpha2,
                                    NumberOfPieces: 1,
                                    ProductGroup: productGroup,//"EXP",
                                    ProductType: productType,//"PDX",
                                    PaymentType: "P",
                                    PaymentOptions: "",
                                    CustomsValueAmount: {
                                          CurrencyCode: "BHD",
                                          Value: 0.00
                                    },
                                    CashOnDeliveryAmount: {
                                          CurrencyCode: "BHD",
                                          Value: data.order.CashOnDeliveryAmount
                                    },
                                    CashAdditionalAmount: {
                                          CurrencyCode: "BHD",
                                          Value: 0
                                    },
                                    CashAdditionalAmountDescription: "",
                                    CollectAmount: {
                                          CurrencyCode: "BHD",
                                          Value: data.order.CollectAmount
                                    },
                                    Services: data.order.services,
                                    Items: data.order.products,
                                    InsuranceAmount: {
                                          Value: 0,
                                          CurrencyCode: "BHD"
                                    }
                              },
                              ForeignHAWB: "",
                              TransportType: 0,
                              PickupGUID: ""
                        }
                  ],
                  ClientInfo: {
                        AccountCountryCode: "JO",
                        AccountEntity: "AMM",
                        AccountNumber: 20016,
                        AccountPin: 331421,
                        UserName: "testingapi@aramex.com",
                        Password: "R123456789$r",
                        Version: "v1.0"
                  },
                  Transaction: {
                        Reference1: `Shpt ${data.shipmentIndex}`,
                        Reference2: "",
                        Reference3: "",
                        Reference4: "",
                        Reference5: ""
                  },
                  LabelInfo: {
                        ReportID: 9201,
                        ReportType: "URL"
                  }
            };

            // console.log(JSON.stringify(postData.Shipments[0].Consignee))
            // console.log("========================================");
            // console.log(JSON.stringify(postData.Shipments[0].Details))

            writeLog("input=> ", postData);
            const options = {
                  method: 'POST',
                  uri: 'https://ws.dev.aramex.net/shippingapi.v2/shipping/service_1_0.svc/json/CreateShipments',
                  body: postData,
                  json: true,
                  headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                  }
            }

            request(options)
                  .then(function (response) {
                        // console.log(response);
                        writeLog("output=> ", response);
                        resolve(response);
                  }).catch(function (err) {
                        // console.log(err);
                        reject(err);
                  })
      });
}

exports.trackShipment = async (data) => {
      return new Promise((resolve, reject) => {
            const postData = {
                  Shipments: [
                        "34175695654"
                  ],
                  ClientInfo: {
                        AccountCountryCode: "JO",
                        AccountEntity: "AMM",
                        AccountNumber: 20016,
                        AccountPin: 331421,
                        UserName: "testingapi@aramex.com",
                        Password: "R123456789$r",
                        Version: "v1.0"
                  },
                  Transaction: {
                        Reference1: "",
                        Reference2: "",
                        Reference3: "",
                        Reference4: "",
                        Reference5: ""
                  },
                  GetLastTrackingUpdateOnly: false
            };

            // writeLog("input=> ", postData);
            const options = {
                  method: 'POST',
                  // uri: 'https://ws.dev.aramex.net/shippingapi.v2/shipping/service_1_0.svc/json/CreateShipments',
                  uri: 'https://ws.dev.aramex.net/shippingapi.v2/tracking/service_1_0.svc/json/TrackShipments',
                  body: postData,
                  json: true,
                  headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                  }
            }

            request(options)
                  .then(function (response) {
                        console.log(JSON.stringify(response));
                        // writeLog("output=> ", response);
                        resolve(response);
                  }).catch(function (err) {
                        console.log(JSON.stringify(err));
                        reject(err);
                  })
      })
}

exports.fetchCountires = async () => {
      return new Promise((resolve, reject) => {
            const postData = {
                  ClientInfo: {
                        AccountCountryCode: "JO",
                        AccountEntity: "AMM",
                        AccountNumber: 20016,
                        AccountPin: 331421,
                        UserName: "testingapi@aramex.com",
                        Password: "R123456789$r",
                        Version: "v1.0"
                  }
            };

            const options = {
                  method: 'POST',
                  uri: "https://ws.dev.aramex.net/shippingapi.V2/location/Service_1_0.svc/json/FetchCountries",
                  body: postData,
                  json: true,
                  headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                  }
            }

            request(options)
                  .then(function (response) {
                        // console.log(response);
                        resolve(response);
                  }).catch(function (err) {
                        // console.log(err);
                        reject(err);
                  })
      });
}

exports.fetchCountry = async (countryCode) => {
      return new Promise((resolve, reject) => {
            const postData = {
                  ClientInfo: {
                        AccountCountryCode: "JO",
                        AccountEntity: "AMM",
                        AccountNumber: 20016,
                        AccountPin: 331421,
                        UserName: "testingapi@aramex.com",
                        Password: "R123456789$r",
                        Version: "v1.0"
                  },
                  Code: countryCode
            };
            const options = {
                  method: 'POST',
                  uri: 'https://ws.dev.aramex.net/shippingapi.V2/location/Service_1_0.svc/json/FetchCountry',
                  body: postData,
                  json: true,
                  headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                  }
            }

            request(options)
                  .then(function (response) {
                        // console.log(response);
                        resolve(response);
                  }).catch(function (err) {
                        // console.log(err);
                        reject(err);
                  })
      });
}

exports.fetchCities = async (countryCode) => {
      return new Promise((resolve, reject) => {

            const postData = {
                  ClientInfo: {
                        UserName: "dev@mymrkt.work",
                        Password: "SxunfQqK$7q$un",
                        Version: "v1.0",
                        AccountNumber: "60515295",
                        AccountPin: "115265",
                        AccountEntity: "BAH",
                        AccountCountryCode: "BH"
                  },
                  CountryCode: countryCode,
            };
            const options = {
                  method: 'POST',
                  uri: 'https://ws.aramex.net/shippingapi.V2/location/Service_1_0.svc/json/FetchCities',
                  body: postData,
                  json: true,
                  headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                  }
            }

            request(options)
                  .then(function (response) {
                        // console.log(response);
                        resolve(response);
                  }).catch(function (err) {
                        // console.log(err);
                        reject(err);
                  })
      });
}

exports.fetchOffices = async (countryCode) => {
      return new Promise((resolve, reject) => {
            const postData = {
                  ClientInfo: {
                        AccountCountryCode: "JO",
                        AccountEntity: "AMM",
                        AccountNumber: 20016,
                        AccountPin: 331421,
                        UserName: "testingapi@aramex.com",
                        Password: "R123456789$r",
                        Version: "v1.0"
                  },
                  CountryCode: countryCode
            };
            const options = {
                  method: 'POST',
                  uri: 'https://ws.dev.aramex.net/shippingapi.V2/location/Service_1_0.svc/json/FetchOffices',
                  body: postData,
                  json: true,
                  headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                  }
            }

            request(options)
                  .then(function (response) {
                        // console.log(response);
                        resolve(response);
                  }).catch(function (err) {
                        // console.log(err);
                        reject(err);
                  })
      });
}

exports.validateAddress = async (addreses) => {
      return new Promise((resolve, reject) => {
            const postData = {
                  ClientInfo: {
                        UserName: "dev@mymrkt.work",
                        Password: "SxunfQqK$7q$un",
                        Version: "v1.0",
                        AccountNumber: "60515295",
                        AccountPin: "115265",
                        AccountEntity: "BAH",
                        AccountCountryCode: "BH"
                  },
                  Address: {
                        Line1: addreses.Line1,
                        Line2: addreses.Line2,
                        Line3: "",
                        City: addreses.City,
                        StateOrProvinceCode: "",
                        PostCode: addreses.PostCode,
                        CountryCode: addreses.CountryCode
                  }
            };

            // let url = "wsdl/aramex-location-apis-wsdl.wsdl";
            const options = {
                  method: 'POST',
                  uri: 'https://ws.aramex.net/shippingapi.V2/location/Service_1_0.svc/json/ValidateAddress',
                  body: postData,
                  json: true,
                  headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                  }
            }

            request(options)
                  .then(function (response) {
                        //  console.log(response);
                        resolve(response);
                  }).catch(function (err) {
                        //  console.log(err);
                        reject(err);
                  })
      });
}

exports.calculateRate = async (data, productGroup = "DOM", productType = "ONP") => {
      //productGroup (For international "EXP") (For same country "DOM")
      //productType  (For international "PPX") (For same country "ONP")
      return new Promise((resolve, reject) => {
            let a = countries.all.filter(f => f.name.toLowerCase() == data.seller.sellerAddress.orderPickupAddress.companyOrderAddCountryCode.toLowerCase());
            let b = countries.all.filter(f => f.name.toLowerCase() == data.customer.address.country.toLowerCase());

            let postData = {
                  ClientInfo: {
                        UserName: "dev@mymrkt.work",
                        Password: "SxunfQqK$7q$un",
                        Version: "v1.0",
                        AccountNumber: "60515295",
                        AccountPin: "115265",
                        AccountEntity: "BAH",
                        AccountCountryCode: "BH"
                  },
                  OriginAddress: {
                        Line1: data.seller.sellerAddress.orderPickupAddress.companyOrderAddLine1,
                        Line2: data.seller.sellerAddress.orderPickupAddress.companyOrderAddLine2,
                        Line3: "",
                        City: data.seller.sellerAddress.orderPickupAddress.companyOrderAddCity,
                        StateOrProvinceCode: "",
                        PostCode: data.seller.sellerAddress.orderPickupAddress.companyOrderpostCode,
                        CountryCode: a[0].alpha2
                  },
                  DestinationAddress: {
                        Line1: data.customer.address.addressLine1,
                        Line2: data.customer.address.addressLine2,
                        Line3: "",
                        City: data.customer.address.city,
                        StateOrProvinceCode: "",
                        PostCode: data.customer.address.postCode,
                        CountryCode: b[0].alpha2
                  },
                  ShipmentDetails: {
                        Dimensions: {
                              Length: data.shippingDimensions.Length,
                              Width: data.shippingDimensions.Width,
                              Height: data.shippingDimensions.Height,
                              Unit: "CM"
                        },
                        ActualWeight: {
                              Unit: "KG",
                              Value: data.shippingActualWeight
                        },
                        ChargeableWeight: {
                              Unit: "KG",
                              Value: data.shippingActualWeight
                        },
                        DescriptionOfGoods: "",
                        GoodsOriginCountry: "",
                        NumberOfPieces: 1,
                        ProductGroup: productGroup,
                        ProductType: productType,
                        PaymentType: "P",
                        PaymentOptions: ""
                  }
            }
            console.log(JSON.stringify(postData.ShipmentDetails));

            let url = "wsdl/aramex-rates-calculator-wsdl.wsdl";
            soap.createClient(url, function (err, client) {
                  if (err) {
                        console.log("error=> ", err);
                        reject(err)
                  } else {
                        client.CalculateRate(postData, (err, res) => {
                              console.log(JSON.stringify(res))
                              writeLog("", "=============Start Aramex Rate Calculation=====================")
                              writeLog("Input Request", postData)
                              writeLog("Output Request", res)
                              writeLog("", "=============End Aramex Rate Calculation=====================")
                              resolve(res);
                        })
                  }

            });
      });
}