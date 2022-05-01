const mongoose = require('mongoose');
let { setDateTime } = require("./setDateTime")
const autoIncrement = require("mongoose-auto-increment");

let ngThis = this;
const wishlsitSchema = new mongoose.Schema({
    customerId:
    {
        type: 'ObjectId',
        ref: "customers"

    },
    productVariants: [
        {
            productVariantId: { type: 'ObjectId', ref: "productVariants" },
            createdAt: { type: Date, default: Date.now },
            createdDate: Number,
            pvIndexNo: String
        }],
    status: { type: String, default: 0 }, // 0 = cart, 1 = added to payment
    deviceIdentifier: String,
    createdDate: Number,
    updatedDate: Number

}, { timestamps: true })


autoIncrement.initialize(mongoose.connection);

wishlsitSchema.plugin(autoIncrement.plugin, {
    model: "wishlist", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});

wishlsitSchema.pre('save', function (next) {

    if (this.productVariants && this.productVariants[this.productVariants.length - 1] && this.productVariants[this.productVariants.length - 1].createdAt) {
        this.productVariants[this.productVariants.length - 1].createdDate = setDateTime(this.productVariants[this.productVariants.length - 1].createdAt)
        try {
            this.productVariants.forEach((element,index) => {
                this.productVariants[index].pvIndexNo = this.indexNo.toString() + "_" + index.toString()
            });
        }
        catch (error) { }
    }

    if (this.createdAt) {
        this.createdDate = setDateTime(this.createdAt)
    }
    if (this.updatedAt) {
        this.updatedDate = setDateTime(this.updatedAt)
    }
    next()
});
module.exports = mongoose.model('wishlist', wishlsitSchema);