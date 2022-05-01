const { validationResult } = require("express-validator");
const ALL_MODELS = require("../../../../utilities/allModels");
let upload = require("./../../middlewares/AdminfileUpload");
let mongoose = require("mongoose");
let { sendNotification } = require("../../middlewares/sendNotification");

exports.getAdvertisementWithSearch = async (req, res) => {

    try {
        let { search, startDate, endDate, status } = req.body;

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
        let filter = {};
        if (search) {
            const regexp = new RegExp(search, "i");
            filter["$or"] = [
                { "campaignName": regexp },
                { "typeOfAdvertisement.advertisingType": regexp },
                { "whatToPromote.promotionType.name": regexp },
                { "duration": regexp },
                { "totalAmount": regexp },
                { "sellers.nameOfBussinessEnglish": regexp }

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
            let dt = convertDateTime(endDate);
            filter['$and'].push({ endDateTime1: { $lt: dt } })
        }

        let advertisementCampaign = await ALL_MODELS.advertisementCampaign.aggregate([
            {
                $lookup: {
                    from: "sellers",
                    localField: "sellerId",
                    foreignField: "_id",
                    as: "sellers"
                }
            },
            {
                $unwind: {
                    "path": "$sellers",
                    "preserveNullAndEmptyArrays": true
                }
            },
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

                    "sellers.sellerAddress": 0,
                    "sellers.socialMedia": 0,
                    "sellers.sellerDocuments": 0,
                    "sellers.questionnaire": 0,
                    "sellers.bussinessCoverImage": 0,
                    "sellers.emailAddressVerified": 0,
                    "sellers.adminVerified": 0,
                    "sellers.tapCustomerId": 0,
                    "sellers.sellerDetails": 0,
                    "sellers.vatNo": 0,
                    "sellers.supplierFrom": 0,
                    "sellers.emailAddress": 0,
                    "sellers.password": 0,
                    "sellers.countryCode": 0,
                    "sellers.mobilePhone": 0,
                    "sellers.deliveryMethod": 0,
                    "sellers.otp": 0,
                    "sellers.expireOtp": 0,
                    "sellers.createdAt": 0,
                    "sellers.updatedAt": 0,
                    "sellers.__v": 0,
                    "sellers.profileImage": 0,
                    "sellers.bankDetails": 0,
                    "sellers.indexNo": 0,
                    "sellers.sellerCountry": 0,
                    "sellers.mobileVerified": 0,
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

exports.advertisementCampaign = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {
        let advertisementCampaign = new ALL_MODELS.advertisementCampaign({
            adminId: req.userId,
            sellerId: req.body.sellerId || null,
            campaignName: req.body.campaignName,
            whatToPromote: JSON.parse(req.body.whatToPromote),
            typeOfAdvertisement: req.body.typeOfAdvertisement,
            additionalRemarks: req.body.additionalRemarks,
            startDateTime: new Date(parseInt(req.body.startDateTime)),
            endDateTime: new Date(parseInt(req.body.endDateTime)),
            totalAmount: req.body.totalAmount,
            tapPaymentDetails: JSON.parse(req.body.tapPaymentDetails),
            duration: req.body.duration,
            active: true,
            adminApproval: true
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
        return res.send({ message: "Advertisement has been added", d: data });
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }

}

exports.statusUpdate = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {
        if (!mongoose.Types.ObjectId.isValid(req.body.advertiseId)) {
            return res.send({ message: "There was no advertise found with given information!" })
        }
        let advertise = await ALL_MODELS.advertisementCampaign.findByIdAndUpdate(req.body.advertiseId);
        if (!advertise) {
            return res.status(403).send({ message: "No advertise found by the given information!" });
        }
        advertise.active = req.body.active
        advertise.save()
        return res.send({ message: "advertise status has been  updated successfully done" });
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }


}

exports.advertiseApproval = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    try {
        let advertise = await ALL_MODELS.advertisementCampaign.findOne({ _id: req.body.advertiseId })
            .populate([
                { path: 'sellerId', select: ['nameOfBussinessEnglish'] }
            ]);

        if (!advertise) {
            return res.status(403).send({ message: "No advertise found by the given information!" });
        }
        advertise.adminApproval = req.body.adminApproval
        await advertise.save()

        //Notification
        advertise.sellername = advertise.sellerId.nameOfBussinessEnglish
        if (req.body.adminApproval == true) {
            //sendNotification(req, req.userId, advertise.sellerId, '35', advertise, 'advertise', advertise._id)
        }
        else {
            //sendNotification(req, req.userId, advertise.sellerId, '36', advertise, 'advertise', advertise._id)
        }
        return res.send({ message: "Admin Approval has been updated." });
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }
}

exports.adminSingleAd = async (req, res) => {
    try {
        let advertisementCampaign = await ALL_MODELS.advertisementCampaign.findById(req.params.id)
            .populate({ path: "sellerId", select: ["_id", "sellerDetails", "nameOfBussinessEnglish"] })
        return res.send({ data: advertisementCampaign })
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }
}

exports.editAdvertisement = async (req, res, next) => {

    const advertiseId = req.params.id;
    let advertise = await ALL_MODELS.advertisementCampaign.findOne({ _id: advertiseId });
    if (!advertise)
        return res.status(404).send({
            message: "There was no advertise found with given information!",
        });

    if (req.body.whatToPromote) {
        req.body.whatToPromote = JSON.parse(req.body.whatToPromote);
    }

    let bodyData = req.body;

    if (bodyData.startDateTime) {
        bodyData.startDateTime = new Date(parseInt(bodyData.startDateTime))
    }
    if (bodyData.endDateTime) {
        bodyData.endDateTime = new Date(parseInt(bodyData.endDateTime))
    }

    const updateKeys = Object.keys(bodyData);
    updateKeys.forEach((update) => (advertise[update] = bodyData[update]));

    let uploadLocation = '';
    let language = JSON.parse(req.body.language);

    if (req.files) {
        let keys = Object.keys(req.files)

        if (language && language.length > 0 && keys.includes(`offersalesImage_${language[0]}`)) {
            //advertisementCampaign.advertisementImage = [];
            for (let index = 0; index < language.length; index++) {
                let ele = language[index];
                uploadLocation = `/advertisecampaign/${advertise['_id']}/${ele}`;

                if (keys.includes(`offersalesImage_${ele}`)) {
                    let a = await upload.fileUpload(req, next, `offersalesImage_${ele}`, uploadLocation);
                    //console.log(a);
                    let b = await advertise.advertisementImage.findIndex(x => x.language.toLowerCase() === ele.toLowerCase());
                    if (b != -1) {
                        advertise.advertisementImage[b].offersalesImageUrl = a[0]
                    }
                }
            }
        } else if (language && language.length > 0 && (keys.includes(`sliderImage_mobile_${language[0]}`) || keys.includes(`sliderImage_desktop_${language[0]}`))) { //&& 


            let isValid = null;
            for (let index = 0; index < language.length; index++) {
                const lang = language[index];
                if (!keys.includes(`sliderImage_desktop_${lang}`) && !keys.includes(`sliderImage_mobile_${lang}`)) {
                    isValid = false;
                }
            }

            if (isValid == false) {
                return res.status(403).send({ message: "Please upload desktop and mobile image for each" });
            }

            //advertisementCampaign['advertisementImage'] = [];
            for (let index = 0; index < language.length; index++) {
                const ele = language[index];
                uploadLocation = `/advertisecampaign/${advertise['_id']}/${ele}`;

                let b = await advertise.advertisementImage.findIndex(x => x.language.toLowerCase() === ele.toLowerCase());
                if (keys.includes(`sliderImage_desktop_${ele}`)) {
                    let desktop = await upload.fileUpload(req, next, `sliderImage_desktop_${ele}`, uploadLocation);

                    if (b != -1) {
                        advertise['advertisementImage'][b].sliderImage.desktopImageUrl = desktop[0]
                    }
                } if (keys.includes(`sliderImage_mobile_${ele}`)) {
                    let mobile = await upload.fileUpload(req, next, `sliderImage_mobile_${ele}`, uploadLocation);

                    if (b != -1) {
                        advertise['advertisementImage'][b].sliderImage.mobileImageUrl = mobile[0]
                    }
                }
            }
        } else {
            return res.status(403).send({ message: "Please upload correct image with appropriate languages" });
        }
    }

    await advertise.save();
    return res.send({ message: "Advertisement has been updated.", advertise });

}

