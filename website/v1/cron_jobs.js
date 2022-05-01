const nodeCron = require("node-cron");
const fetch = require('node-fetch');
let allModels = require("../../utilities/allModels");
let { sendNotification } = require("./middlewares/sendNotification");
var xecdApiClient = require('@xe/xecd-rates-client')
var countries = require('country-data').countries,
    currencies = require('country-data').currencies,
    languages = require('country-data').languages;


exports.productsOnSale = async () => {
    try {
        const job = nodeCron.schedule("1 12 * * * *", () => {
            sendSaleNotification()
        });

        job.start()

        sendSaleNotification = async () => {
            let productvariants = await allModels.offerPricingItem.find({
                active: true
            })
                .populate([
                    {
                        path: 'productVariantId', select: ['productVariantDetails', 'sellerId'],
                        populate: [
                            {
                                path: "brandId", select: ["brandDetails"]
                            }
                        ]
                    }
                ])
            for (let product of productvariants) {
                let productname = product.productVariantId.productVariantDetails[0].productVariantName
                let brandname = product.productVariantId.brandId.brandDetails[0].brandName

                product.productname = productname
                product.brandname = brandname

                //getting follower details
                let customers = await allModels.customer_seller_follow.find({
                    sellerId: product.productVariantId.sellerId
                })
                    .populate([
                        { path: 'customerId', select: ['firstName', 'lastName'] }
                    ])
                //console.log(customers)
                for (let customer of customers) {
                    product.customername = customer.customerId ? customer.customerId.firstName : null
                    await sendNotification(null, null, customer.customerId._id, '15', product, 'offer', product._id)
                }
            }
        }
    }
    catch (e) {
        console.log("Unable to start refresh xml product file cron job")
    }
}

exports.subscriptionEnding = async () => {
    try {
        const job = nodeCron.schedule("1 12 * * * *", () => {
            sendSubscriptionEndingNotification()
        });

        job.start()

        sendSubscriptionEndingNotification = async () => {
            let subscribers = await allModels.subscribeModel.find({
                status: "Active"
            })
                .populate([
                    {
                        path: 'productVariantId', select: ['productVariantDetails', 'sellerId'],
                    },
                    {
                        path: 'customerId', select: ['firstName', 'lastName'],
                    }
                ])
            for (let subscriber of subscribers) {
                let EndDate = new Date(parseInt(subscriber.toDate))
                let thirdDayStart = new Date()
                thirdDayStart.setDate(thirdDayStart.getDate() + 3)
                thirdDayStart.setHours(0, 0, 0)
                let thirdDayEnd = new Date()
                thirdDayEnd.setDate(thirdDayEnd.getDate() + 3)
                thirdDayEnd.setHours(23, 59, 59)

                if (thirdDayEnd >= EndDate && EndDate >= thirdDayStart) {
                    subscriber.customername = subscriber.customerId.firstName
                    subscriber.productname = subscriber.productVariantId.productVariantDetails[0].productVariantName
                    subscriber.subscriptionnumber = subscriber.indexNo
                    //Customer Notification
                    await sendNotification(null, null, subscriber.customerId._id, '9', subscriber, 'subscription', subscriber._id)
                    //Seller Notification
                    await sendNotification(null, null, subscriber.productVariantId.sellerId, '27', subscriber, 'subscription', subscriber._id)
                }
            }
        }
    }
    catch (e) {
        console.log("Unable to start refresh xml product file cron job")
    }
}


exports.updateCurrencyRateScheduler = async () => {
    // 12 hr schedular format '0 0 */12 * * *'
    // 10 sec schedular format "*/10 * * * * *"
    nodeCron.schedule("0 0 */12 * * *", function () {
        console.log("Updating Currency Rate.....");
        updateCurrencyRate();
    });
}

const updateCurrencyRate = async () => {
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

    }, 'BHD');
}