let allModels = require("../../../../utilities/allModels")
const { validationResult } = require('express-validator');
let mongoose = require("mongoose");
let upload = require("./../../middlewares/AdminfileUpload");
let upload1 = require("./../../middlewares/fileUpload");
let { createDirectories } = require('./../../middlewares/checkCreateFolder');
let { sendNotification } = require("../../middlewares/sendNotification");


exports.advertisementCampaign = async (req, res, next) => {
  const validationError = validationResult(req);
  if (!validationError.isEmpty()) {
    return res.status(403).send({ message: validationError.array() });
  }

  try {
    let advertisementCampaign = new allModels.advertisementCampaign({
      sellerId: req.userId,
      campaignName: req.body.campaignName,
      whatToPromote: JSON.parse(req.body.whatToPromote),
      typeOfAdvertisement: req.body.typeOfAdvertisement,
      additionalRemarks: req.body.additionalRemarks,
      startDateTime: req.body.startDateTime,
      endDateTime: req.body.endDateTime,
      totalAmount: req.body.totalAmount,
      tapPaymentDetails: JSON.parse(req.body.tapPaymentDetails),
      duration: req.body.duration,
      currency: req.body.currency
    })



    let language = JSON.parse(req.body.language);

    let uploadLocation = '';
    if (req.files) {
      let keys = Object.keys(req.files)

      if (language && language.length > 0 && keys.includes(`offersalesImage_${language[0]}`)) {
        advertisementCampaign.advertisementImage = [];
        for (let index = 0; index < language.length; index++) {
          let ele = language[index];
          uploadLocation = `/advertisecampaign/${advertisementCampaign['_id']}/${ele}`;

          if (keys.includes(`offersalesImage_${ele}`)) {
            let a = await upload.fileUpload(req, next, `offersalesImage_${ele}`, uploadLocation);
            //console.log(a);
            advertisementCampaign.advertisementImage.push({
              language: ele,
              offersalesImageUrl: a[0]
            });
          }
        }
      } else if (language && language.length > 0 && keys.includes(`sliderImage_mobile_${language[0]}`)) {
        // console.log(keys);

        let isValid = null;
        for (let index = 0; index < language.length; index++) {
          const lang = language[index];
          if (!keys.includes(`sliderImage_desktop_${lang}`) || !keys.includes(`sliderImage_mobile_${lang}`)) {
            isValid = false;
          }
        }

        if (isValid == false) {
          return res.status(403).send({ message: "Please upload desktop and mobile image for each" });
        }

        advertisementCampaign['advertisementImage'] = [];
        for (let index = 0; index < language.length; index++) {
          const ele = language[index];
          uploadLocation = `/advertisecampaign/${advertisementCampaign['_id']}/${ele}`;

          if (keys.includes(`sliderImage_desktop_${ele}`) && keys.includes(`sliderImage_mobile_${ele}`)) {
            let desktop = await upload.fileUpload(req, next, `sliderImage_desktop_${ele}`, uploadLocation);
            let mobile = await upload.fileUpload(req, next, `sliderImage_mobile_${ele}`, uploadLocation);

            advertisementCampaign['advertisementImage'].push({
              language: ele,
              sliderImage: {
                desktopImageUrl: desktop[0],
                mobileImageUrl: mobile[0]
              }
            });
          }
        }
      } else {
        return res.status(403).send({ message: "Please upload correct image with appropriate languages" });
      }

    } else {
      return res.status(403).send({ message: "Please upload image for slider or offer and sales" });
    }
    let data = await advertisementCampaign.save()

    //Notification Work
    let adminId = "61c961934280680ee8782e76"
    data.sellername = req.seller.nameOfBussinessEnglish
    sendNotification(req, req.userId, adminId, '42', data, 'advertise', data._id)

    return res.send({ message: "Ad campaign has been submitted, redirecting to payment.", d: data });
    /**----------------------------------------- */
    // let data = await advertisementCampaign.save()
    // return res.send({ message: "advertisementCampaign add successfully", d: data });

  }
  catch (error) {

    //console.log(error)
    return res.status(403).send({ message: error.message });
  }

}

exports.advertisementCampaignPaymentAdd = async (req, res) => {
  const validationError = validationResult(req);
  if (!validationError.isEmpty()) {
    return res.status(403).send({ message: validationError.array() });
  }

  let advertisementCampaign = await allModels.advertisementCampaign.findOne({ _id: req.body.id, sellerId: req.userId });

  if (!advertisementCampaign) {
    return res.status(403).send({ message: 'No valid advertisement campaign found.' });
  }

  let paymentDetails = req.body.tapPaymentDetails;
  let key = Object.keys(paymentDetails);
  if (key.length > 0) {
    if (key.indexOf("_id") != -1 && key.indexOf("customer") != -1 && key.indexOf("reciept") != -1 && key.indexOf("reference") != -1 && key.indexOf("transaction") != -1 && key.indexOf("source") != -1) {
      advertisementCampaign.tapPaymentDetails = paymentDetails
    } else {
      return res.status(403).send({ message: "Unable to proceed some information are missing from payment details" });
    }
  } else {
    return res.status(403).send({ message: "Invalid payment details provided" });
  }
  //advertisementCampaign.tapPaymentDetails = req.body.tapPaymentDetails;

  let data = await advertisementCampaign.save();
  return res.send({ message: 'Payment details updated successfully', data: data });
}

exports.getAdvertisementCampaign = async (req, res) => {

  try {
    let { search, startDate, endDate, status } = req.body;

    let { limit, page } = req.body;

    //pagination
    if (!limit) { limit = 10 }
    if (!page) { page = 1 }

    let perPage = parseInt(limit)
    let pageNo = Math.max(0, parseInt(page))

    if (pageNo > 0) {
      pageNo = pageNo - 1;
    } else if (pageNo < 0) {
      pageNo = 0;
    }


    let filter = {};
    if (search) {
      const regexp = new RegExp(search, "i");
      filter["$or"] = [
        { "campaignName": regexp },
        { "typeOfAdvertisement.advertisingType": regexp },
        { "whatToPromote.promotionType.name": regexp },
        { "durationToDisplay": regexp },
        { "totalAmount": regexp }
      ];
      if (parseInt(search) != NaN) {
        filter["$or"].push({ "indexNo": parseInt(search) })
      }

    }
    if (status || startDate || endDate) {
      filter["$and"] = [];
    }
    if (status) {
      filter["$and"].push({ "active": { $in: status } });
    }
    if (startDate) {
      startDate = new Date(startDate)
      startDate.setHours(23); startDate.setMinutes(59); startDate.setSeconds(59);
      startDate.setDate(startDate.getDate() - 1)
      let dt = convertDateTime(startDate);
      filter['$and'].push({ startDateTime1: { $gt: dt } })
    }
    if (endDate) {
      endDate = new Date(endDate)
      endDate.setHours(23); endDate.setMinutes(59); endDate.setSeconds(59);
      // end_date.setDate(end_date.getDate() + 1)
      let dt = convertDateTime(endDate);
      filter['$and'].push({ endDateTime1: { $lt: dt } })
    }
    let advertisementCampaign = await allModels.advertisementCampaign.aggregate([
      { $match: { "sellerId": mongoose.Types.ObjectId(req.userId) } },
      {
        $lookup: {
          from: 'advertisingpricings',
          localField: 'typeOfAdvertisement',
          foreignField: '_id',
          as: 'typeOfAdvertisement'
        }
      },
      {
        $lookup: {
          from: 'whattopromotes',
          localField: 'whatToPromote.promotionType',
          foreignField: '_id',
          as: 'whatToPromote.promotionType'
        }
      },
      {
        $addFields: {
          durationToDisplay: {
            $cond: {
              if: {//duration: "threeDayPricing"
                $eq: ["$duration", "threeDayPricing"]
              },
              then: "Three Days",
              else: {
                $cond: {
                  if: {//duration: "threeDayPricing"
                    $eq: ["$duration", "oneDayPricing"]
                  },
                  then: "One Day",
                  else: {
                    $cond: {
                      if: {//duration: "threeDayPricing"
                        $eq: ["$duration", "oneWeekPricing"]
                      },
                      then: "One Week",
                      else: null
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $project: {
          'whatToPromote.promotionType.__v': 0,
          'whatToPromote.promotionType.isId': 0,
          'whatToPromote.promotionType.adminId': 0,
          'whatToPromote.promotionType.createdAt': 0,
          'whatToPromote.promotionType.updatedAt': 0,
          'whatToPromote.promotionType.active': 0,
          'whatToPromote.promotionType.adminApproval': 0,

          'typeOfAdvertisement.__v': 0,
          'typeOfAdvertisement.createdAt': 0,
          'typeOfAdvertisement.updatedAt': 0,

          '__v': 0
        }
      },
      { $match: filter },
      { $sort: { "indexNo": - 1 } },
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
    const advertisementCampaignList = advertisementCampaign.length ? advertisementCampaign[0].paginatedResults : [];
    let totalCount = 0
    try {
      totalCount = advertisementCampaign[0].totalCount[0].count
    } catch (err) { }
    return res.send({ totalCount: totalCount, count: advertisementCampaignList.length, d: advertisementCampaignList })


  }
  catch (error) {
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
  return Number(`${year}${mnth}${day}${hr}${min}${sec}`)
}

exports.sellerProductvariants = async (req, res, next) => {

  try {
    let productvariants = await allModels.productVariant.find({ "sellerId": req.userId })
      .select(["_id", "sellerId", "productVariantDetails.productVariantName"])

    return res.send({ count: productvariants.length, productvariants })

  }
  catch (error) {
    return res.status(403).send({ message: error.message });
  }

}

exports.singleCampaign = async (req, res) => {

  let campaign = null;
  try {
    campaign = await allModels.advertisementCampaign.findOne({ _id: req.params.id, }).populate([
      { path: 'whatToPromote.promotionType', select: ["name"] },
      { path: 'typeOfAdvertisement', select: ["-__v", "-updatedAt", "-createdAt"] },


    ])
      .select(['-__v', '-createdAt', '-updatedAt', '-whatToPromote.id'])
  }
  catch (error) {
    if (!campaign) {
      // allModels.log.writeLog(req, "Invalid product Id");
      return res.status(404).send({ message: "Invalid campaign Id" });
    }
  }
  return res.send({ d: campaign })

}

exports.updateStatus = async (req, res) => {
  try {

    let advertise = await allModels.advertisementCampaign.findOne({
      "_id": req.body.advertiseId,
      "sellerId": req.userId
    });
    if (!advertise) {
      return res.status(403).send({ message: "There was no advertise found with given information!" });
    }

    advertise.active = req.body.active
    advertise.save()
    return res.send({ message: "advertise status hs been updated successfully done" });
  }
  catch (error) {
    return res.status(403).send({ message: error.message });
  }
}