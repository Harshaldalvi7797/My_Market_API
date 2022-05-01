let mongoose = require("mongoose")
const { ObjectId } = mongoose.Schema;
let { setDateTime } = require("./setDateTime")
const autoIncrement = require("mongoose-auto-increment");

let orderShippingSchema = new mongoose.Schema({
    orderId: { type: ObjectId, ref: "orders" },
    sellerId: { type: ObjectId, ref: "sellers" },
    shippingMethod: { type: String, default: null },
    shippingPrice: { type: Number, default: 0 },

    receipt: {
        englishReceipt: { type: String, default: null },
        arabicReceipt: { type: String, default: null },
    },
    externalAWB: { type: Number, default: 0 },
    createdDate: Number,
    updatedDate: Number,
    deliveryDate: Number
},
    { timestamps: true }
)


orderShippingSchema.pre('save', function (next) {

    if (this.createdAt) {
        this.createdDate = setDateTime(this.createdAt)
      }
      if (this.updatedAt) {
        this.updatedDate = setDateTime(this.updatedAt)
      }
    next()
});

autoIncrement.initialize(mongoose.connection);
orderShippingSchema.plugin(autoIncrement.plugin, {
    model: "ordershipping", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});

let orderShippingModelNew = mongoose.model("ordershipping", orderShippingSchema)
module.exports = orderShippingModelNew