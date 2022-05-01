const mongoose = require('mongoose');
const autoIncrement = require("mongoose-auto-increment");
let { setDateTime } = require("./setDateTime")
let ngThis = this;
const cartSchema = new mongoose.Schema({
  customerId: {
    type: 'ObjectId',
    ref: "customers"
  },
  productVariants: [
    {
      productVariantId: { type: 'ObjectId', ref: "productVariants" },
      quantity: '',
      createdAt: { type: Date, default: Date.now },
      createdDate: Number
    }],
  status: { type: String, default: 0 }, // 0 = cart, 1 = added to payment
  deviceIdentifier: String,
  createdDate: Number,
  updatedDate: Number

}, { timestamps: true })


cartSchema.pre('save', function (next) {

  // console.log(this.productVariants)
  if (this.productVariants && this.productVariants[this.productVariants.length - 1] && this.productVariants[this.productVariants.length - 1].createdAt) {
    this.productVariants[this.productVariants.length - 1].createdDate = setDateTime(this.productVariants[this.productVariants.length - 1].createdAt)
  }

  if (this.createdAt) {
    this.createdDate = setDateTime(this.createdAt)
  }
  if (this.updatedAt) {
    this.updatedDate = setDateTime(this.updatedAt)
  }
  next()
});

autoIncrement.initialize(mongoose.connection);

cartSchema.plugin(autoIncrement.plugin, {
  model: "cart", // collection or table name in which you want to apply auto increment
  field: "indexNo", // field of model which you want to auto increment
  startAt: 1000, // start your auto increment value from 1
  incrementBy: 1, // incremented by 1
});

module.exports = mongoose.model('cart', cartSchema);


//view query
/* [{$lookup: {
    from: 'productvariants',
    localField: 'productVariants.productVariantId',
    foreignField: '_id',
    as: 'productVariants'
  }}, {$lookup: {
    from: 'brands',
    localField: 'productVariants.brandId',
    foreignField: '_id',
    as: 'brand'
  }}, {$lookup: {
    from: 'customers',
    localField: 'customerId',
    foreignField: '_id',
    as: 'customerId'
  }}, {$project: {
    'customerId._id': 1,
    'customerId.firstName': 1,
    'customerId.lastName': 1,
    'productVariants._id': 1,
    'productVariants.productVariantDetails': 1,
    'productVariants.brandId': 1,
    'brand._id': 1,
    'brand.brandDetails': 1
  }}] */
