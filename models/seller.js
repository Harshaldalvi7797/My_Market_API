let mongoose = require("mongoose")
let config = require("config");
let jwt = require("jsonwebtoken");
let { setDateTime } = require("./setDateTime")
const autoIncrement = require("mongoose-auto-increment");

let ngThis = this;

let sellerSchema = new mongoose.Schema({
    sellerDetails: {
        sellerfName: { type: String, default: null },
        sellerlName: { type: String, default: null }
    },
    sellerAddress: {
        companyAddress: {
            companyAdd1: { type: String, default: null },
            companyAdd2: { type: String, default: null },
            companyCity: { type: String, default: null },
            companyCountry: { type: String, default: null },
            companyPincode: { type: String, default: null },
            companypoBox: { type: String, default: null },
            companyblockNumber: { type: String, default: null },
            companypostCode: { type: String, default: null },
        },
        orderPickupAddress: {
            companyOrderPick: { type: String, default: null },
            companyOrderAddLine1: { type: String, default: null },
            companyOrderAddLine2: { type: String, default: null },
            companyOrderAddCity: { type: String, default: null },
            companyOrderAddCountryCode: { type: String, default: null },
            companyOrderPincode: { type: String, default: null },
            companyOrderpoBox: { type: String, default: null },
            companyOrderblockNumber: { type: String, default: null },
            companyOrderpostCode: { type: String, default: null },
        }
    },
    sellerDocuments: [Object],
    questionnaire: [],
    supplierFrom: String,
    nameOfBussinessEnglish: { type: String, default: null },
    nameOfBussinessArabic: { type: String, default: null },
    bussinessCoverImage: { type: String, default: null },
    profileImage: { type: String, default: null },
    emailAddress: { type: String },
    emailAddressVerified: { type: Boolean, default: false },
    mobileVerified: { type: Boolean, default: false },
    adminVerified: { type: Boolean, default: false },
    mobilePhone: { type: String, unique: true },
    countryCode: String,
    sellerCountry: { type: String, default: null },
    password: { type: String, required: false },
    otp: String,
    expireOtp: Date,
    gender: String,
    dateOfBirth: Date,
    dateOfIncorporation: Date,
    imageFile: String,
    defaultLanguage: String,
    resetpasswordtoken: String,
    resetpasswordexpire: Date,
    image: { type: String },
    name: String,
    search: { type: String, text: true },
    commissionPercentage: { type: Number, default: 0 },
    vatNo: String,
    vatExpiryDate: { type: Date },
    tapCustomerId: {
        type: String,
        default: null
    },
    deliveryMethod: { type: String, enum: ["MM Drive", "Self Delivery", null], default: null },
    socialMedia:
    {
        facebook: { type: String, default: null },
        twitter: { type: String, default: null },
        pinterest: { type: String, default: null },
        instagram: { type: String, default: null }
    },
    bankDetails: {}
},
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        timestamps: true
    }
)
sellerSchema.methods.sellerToken = function () {
    let token = jwt.sign(
        { _id: this._id },
        //config.get("apitoken")
        process.env.JWT_SECRET

    );

    process.env.API_TOKEN = token;
    return token;
};

sellerSchema.pre('save', function (next) {
    if (this.sellerAddress && this.sellerAddress.orderPickupAddress && this.sellerAddress.orderPickupAddress.companyOrderAddCountryCode) {
        this.sellerCountry = this.sellerAddress.orderPickupAddress.companyOrderAddCountryCode.replace(/ /g, "_").toUpperCase();
    }
    next();
});

autoIncrement.initialize(mongoose.connection);

sellerSchema.plugin(autoIncrement.plugin, {
    model: "sellers", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});

sellerSchema.virtual('sellerDetails.fullName').get(function () {
    if (!this.sellerDetails.sellerfName) {
        this.sellerDetails.sellerfName = null
    }
    if (!this.sellerDetails.sellerlName) {
        this.sellerDetails.sellerlName = null
    }
    return `${this.sellerDetails.sellerfName} ${this.sellerDetails.sellerlName}`;
});

let sellerModel = mongoose.model("sellers", sellerSchema)
module.exports = sellerModel


















// sellerproductvariantofferview
// [{
//     $lookup: {
//         from: 'productvariants',
//         localField: '_id',
//         foreignField: 'sellerId',
//         as: 'productvariants'
//     }
// }, {
//     $lookup: {
//         from: 'offerpricings',
//         localField: '_id',
//         foreignField: 'sellerId',
//         as: 'offer'
//     }
// }, {
//     $lookup: {
//         from: 'offerpricingitems',
//         localField: 'offer._id',
//         foreignField: 'offerpricingId',
//         as: 'offerItems'
//     }
// }, {
//     $lookup: {
//         from: 'products',
//         localField: 'productvariants.productId',
//         foreignField: '_id',
//         as: 'productList'
//     }
// }, {
//     $lookup: {
//         from: 'brands',
//         localField: 'productList.brandId',
//         foreignField: '_id',
//         as: 'brandList'
//     }
// }, {
    // {
    //     from: 'categories',
    //     localField: 'productList.productCategories.categoryLevel1Id',
    //     foreignField: '_id',
    //     as: 'categoryList'
    //   }
// }, {
//     $project: {
//         sellerDetails: 1,
//         productvariants: 1,
//         offer: 1,
//         offerItems: 1,
//         'productList._id': 1,
//         'productList.productDetails': 1,
//         'productList.brandId': 1,
//         'brandList._id': 1,
//         'brandList.brandDetails': 1,
//         'categoryList._id': 1,
//         'categoryList.categoryDetails': 1
//     }
// }]

// let sellerSchema = new mongoose.Schema({
//     sellerId:
//     {
//         type: String,
//         default: mongoose.Types.ObjectId,
//         index: { unique: true }
//     },
//     sellerDetails: [],
//     sellerAddress: {
//         companyName: { type: String, default: null },
//         companyAdd1: { type: String, default: null },
//         companyAdd2: { type: String, default: null },
//         companyCity: { type: String, default: null },
//         companyCountry: { type: String, default: null },

//         companyOrderName: { type: String, default: null },
//         companyOrderAdd1: { type: String, default: null },
//         companyOrderAdd2: { type: String, default: null },
//         companyOrderCity: { type: String, default: null },
//         companyOrderCountryCode: { type: String, default: null },

//         companyOrderPin: { type: String, default: null },
//         companyOrderOwnDriver: { type: Boolean, default: false },

//         companyCouponCode: { type: String, default: null },
//         companyOrderPick: { type: Boolean, default: false },
//     },
//     sellerDocuments: [Object],
//     questionnaire: [],
//     supplierFrom: String,
//     nameOfBussiness: String,
//     sellerProfile: String,
//     bussinessCoverImage: [],
//     emailAddress:
//     {
//         type: String
//     },
//     emailAddressVerified: {
//         type: Boolean,
//         default: false
//     },
//     mobilePhone:
//     {
//         type: String,
//         unique: true
//     },
//     countryCode: String,
//     password: { type: String, required: false },
//     otp: String,
//     expireOtp: Date,
//     gender: String,
//     dateOfBirth: Date,
//     dateOfIncorporation: Date,
//     imageFile: String,
//     defaultLanguage: String,
//     resetpasswordtoken: String,
//     resetpasswordexpire: Date,
//     image: { type: String },
//     name: String,
//     search: { type: String, text: true }
// },
//     { timestamps: true }
// )
// sellerSchema.methods.sellerToken = function () {
//     let token = jwt.sign(
//         { _id: this._id },
//         //config.get("apitoken")
//         process.env.JWT_SECRET

//     );

//     process.env.API_TOKEN = token;
//     return token;
// };
// let sellerModel = mongoose.model("sellers", sellerSchema)
// module.exports = sellerModel

/*
{
    "seller_id": "",
    "password":"",
    "otp":"",
    "expireOtp":"",
    "emailAddressVerified":"",
    "mobileVerified":"",
    "sellerDocuments":"",
    "questionnaire":"",
    "supplierFrom":"",
    "seller_details": {
        "firstname": "",
        "lastname": "",
        "email": "",
        "mobile": "",
        "countryCode":"",
        "address": {
            "addressName": "",
            "address1": "",
            "address2": "",
            "city": "",
            "state": "",
            "country": "",
            "pincode": "",
            "zipcode": "",
            "pobox": ""
        }
    },
    "seller_company_details": {
        "name": "",
        "email": "",
        "mobile": "",
        "countryCode":"",
        "address": {
            "addressName": "",
            "address1": "",
            "address2": "",
            "city": "",
            "state": "",
            "country": "",
            "pincode": "",
            "zipcode": "",
            "pobox": ""
        }
    }
} */
