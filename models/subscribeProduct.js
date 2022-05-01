const mongoose = require('mongoose');
let { setDateTime } = require("./setDateTime")
let ngThis = this;
const autoIncrement = require("mongoose-auto-increment");
const subscribeSchema = new mongoose.Schema({
    customerId: { type: 'ObjectId', ref: "customers" },
    productVariantId: { type: 'ObjectId', ref: "productVariants" },

    fromDate: String,
    toDate: String,
    subscriptionType: String,
    interval: String,
    quantity: String,
    deliveryAddress: {},
    details: [],
    deviceIdentifier: String,
    status: {
        type: String,
        enum: ["Active", "On_Hold", "Cancelled"],
        required: true,
        default: "Active"
    },
    onHold: {},
    createdDate: Number,
    updatedDate: Number,
    nextDueDate: Number,
    statusComment: { type: String, default: null },
    resolutionDate:{type:String}

}, { timestamps: true })
subscribeSchema.pre('save', function (next) {
    if (this.createdAt) {
        this.createdDate = setDateTime(this.createdAt)
    }
    if (this.updatedAt) {
        this.updatedDate = setDateTime(this.updatedAt)
    }  
   
    next()
});
autoIncrement.initialize(mongoose.connection);
subscribeSchema.plugin(autoIncrement.plugin, {
    model: "subscribeproducts", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});

module.exports = mongoose.model('subscribeproducts', subscribeSchema);