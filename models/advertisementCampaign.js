const mongoose = require("mongoose");
let { setDateTime } = require("./setDateTime")
let ngThis = this;
const autoIncrement = require("mongoose-auto-increment");
const advertisementCampaignSchema = new mongoose.Schema({
    adminId: { type: 'ObjectId', ref: "admins", default: null },
    sellerId:
    {
        type: 'ObjectId',
        ref: "sellers",
        default: null
    },
    campaignName: { type: String, required: true },
    //typeOfAdvertisement: { type: String, enum: ["Home Page - Top Slider", "Home Page - Bottom Slider", "Offers & Sales Section"], required: true },
    typeOfAdvertisement: { type: 'ObjectId', ref: "advertisingpricings" },
    whatToPromote: {
        promotionType: {
            type: 'ObjectId',
            ref: "whatToPromote"
        },
        id: { type: 'ObjectId', default: null }, //variantId, brandId, categoryId, produdctId
        name: { type: String } //category,product,brand
    },
    /* whatToPromote: {
        promotionType: {
            type: String, enum: ["Brand", "Category", "ProductVariant", "Product", "NewArrival",
                "Trending"],
        },
        id: { type: 'ObjectId', default: null }
    }, */
    advertisementImage: [
        {
            language: { type: String, required: true },
            offersalesImageUrl: { type: String, default: null },
            sliderImage: {
                desktopImageUrl: { type: String, default: null },
                mobileImageUrl: { type: String, default: null },
            }
        }
    ],
    currency: String,
    additionalRemarks: { type: String, default: null },
    duration: { type: String, default: null },
    startDateTime: { type: Date, required: true },
    endDateTime: { type: Date, required: true },
    startDateTime1: { type: Number },
    endDateTime1: { type:Number },
    totalAmount: { type: Number, default: null },
    tapPaymentDetails: { type: 'Object', required: true },
    active: {
        type: Boolean,
        default: false
    },
    adminApproval: { type: Boolean, default: false },
    createdDate:Number,
    updatedDate:Number

}, { timestamps: true })


advertisementCampaignSchema.pre('save', function (next) {

    if (this.createdAt) {
        this.createdDate = setDateTime(this.createdAt)
    }
    if (this.updatedAt) {
        this.updatedDate = setDateTime(this.updatedAt)
    }
    if (this.startDateTime) {
        this.startDateTime1 = setDateTime(this.startDateTime)
    }
    if (this.endDateTime) {
        this.endDateTime1 = setDateTime(this.endDateTime)
    }
    
    next()
});
advertisementCampaignSchema.plugin(autoIncrement.plugin, {
    model: "advertisementcampaign", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
  });

const advertisementCampaign = mongoose.model("advertisementcampaign", advertisementCampaignSchema);
module.exports = advertisementCampaign;


/*
advertisementcampaignsview

[{
    $lookup: {
        from: 'whattopromotes',
        localField: 'whatToPromote.promotionType',
        foreignField: '_id',
        as: 'whatToPromote'
    }
}, {
    $project: {
        'whatToPromote.__v': 0,
        'whatToPromote.createdAt': 0,
        'whatToPromote.updatedAt': 0,
        __v: 0
    }
}] */

// {
//     from: 'whattopromotes',
//     localField: 'whatToPromote.promotionType',
//     foreignField: '_id',
//     as: 'promotionType'
//   }
//   {
//     from: 'advertisingpricings',
//     localField: 'typeOfAdvertisement',
//     foreignField: '_id',
//     as: 'typeOfAdvertisement'
//   }
//   {
//     from: 'sellers',
//     localField: 'sellerId',
//     foreignField: '_id',
//     as: 'seller'
//   }
//   {
//     from: 'productvariants',
//     localField: 'whatToPromote.id',
//     foreignField: '_id',
//     as: 'productvariant'
//   }
//   {
//     from: 'products',
//     localField: 'whatToPromote.id',
//     foreignField: '_id',
//     as: 'product'
//   }
//   {
//     from: 'categories',
//     localField: 'whatToPromote.id',
//     foreignField: '_id',
//     as: 'category'
//   }
//   {
//     from: 'brands',
//     localField: 'whatToPromote.id',
//     foreignField: '_id',
//     as: 'brand'
//   }
//   {
//     'whatToPromote.__v': 0,
//     'whatToPromote.createdAt': 0,
//     'whatToPromote.updatedAt': 0,
//     __v: 0
//   }