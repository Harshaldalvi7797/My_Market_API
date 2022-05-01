const mongoose = require("mongoose");
let { setDateTime } = require("./setDateTime")
const autoIncrement = require("mongoose-auto-increment");
let ngThis = this;
const advertisingPricingSchema = new mongoose.Schema({
    advertisingType: { type: String, required: true },
    // advertisingType: { type: String, enum: ["Home Page - Top Slider", "Home Page - Bottom Slider", "Offers & Sales Section"], required: true },
    oneDayPricing: { type: Number, default: null },
    threeDayPricing: { type: Number, default: null },
    oneWeekPricing: { type: Number, default: null },
    active: {
        type: Boolean,
        default: false
    },
    createdDate: Number,
    updatedDate: Number
}, { timestamps: true })

advertisingPricingSchema.pre('save', function (next) {

    if (this.createdAt) {
        this.createdDate = setDateTime(this.createdAt)
    }
    if (this.updatedAt) {
        this.updatedDate = setDateTime(this.updatedAt)
    }
    next()
});
advertisingPricingSchema.plugin(autoIncrement.plugin, {
    model: "advertisingpricings", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});
const Advertisingpricing = mongoose.model("advertisingpricings", advertisingPricingSchema);
module.exports = Advertisingpricing;