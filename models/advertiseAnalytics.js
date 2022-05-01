const mongoose = require('mongoose');
let { setDateTime } = require("./setDateTime")
let ngThis = this;
const advertiseAnalyticsSchema = new mongoose.Schema({
    customerId:
    {
        type: 'ObjectId',
        ref: "customers"
    },
    deviceIdentifier: String,
    sellerId:
    {
        type: 'ObjectId',
        ref: "sellers"

    },
    advertiseId: { type: 'ObjectId', ref: "advertisementcampaigns" },
    clickCount: { type: Number, default: 0 },
    createdDate: Number,
    updatedDate: Number

}, { timestamps: true })

advertiseAnalyticsSchema.pre('save', function (next) {
    if (this.createdAt) {
        this.createdDate = setDateTime(this.createdAt)
    }
    if (this.updatedAt) {
        this.updatedDate = setDateTime(this.updatedAt)
    }   
    next()
});


module.exports = mongoose.model('advertiseanalytics', advertiseAnalyticsSchema);
