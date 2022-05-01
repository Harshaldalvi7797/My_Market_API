const mongoose = require('mongoose');
const autoIncrement = require("mongoose-auto-increment");
let { setDateTime } = require("./setDateTime")
const notifySchema = new mongoose.Schema({
  customerId:
  {
    type: 'ObjectId',
    ref: "customers"
  },
  productVariantId: { type: 'ObjectId', ref: "productVariants" },
  status: { type: String, default: 0 },
  deviceIdentifier: String,
  createdDate: Number,
  updatedDate: Number

}, { timestamps: true })


notifySchema.pre('save', function (next) {
  if (this.createdAt) {
    this.createdDate = setDateTime(this.createdAt)
  }
  if (this.updatedAt) {
    this.updatedDate = setDateTime(this.updatedAt)
  }

  next()
});

autoIncrement.initialize(mongoose.connection);

notifySchema.plugin(autoIncrement.plugin, {
  model: "notify", // collection or table name in which you want to apply auto increment
  field: "indexNo", // field of model which you want to auto increment
  startAt: 1000, // start your auto increment value from 1
  incrementBy: 1, // incremented by 1
});

module.exports = mongoose.model('notify', notifySchema);

