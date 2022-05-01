let mongoose = require("mongoose");
let { setDateTime } = require("./setDateTime")
const autoIncrement = require("mongoose-auto-increment");
const { ObjectId } = mongoose.Schema;
let ngThis = this;
let offerPricingSchema = new mongoose.Schema({

  sellerId: {
    type: 'ObjectId',
    ref: "sellers",
    default: null

  },
  adminId: {
    type: 'ObjectId',
    ref: "admins",
    default: null
  },

  offerName: { type: String, default: null },
  startDateTime: { type: Date },
  endDateTime: { type: Date },
  active: {
    type: Boolean,
    default: true
  },
  startDate: Number,
  endDate: Number,
  createdDate: Number,
  updatedDate: Number

},
  { timestamps: true }
);

/* function setDateTime1 (stringdate) {
  let date = new Date(stringdate);
  let year = date.getFullYear();
  let mnth = ("0" + (date.getMonth() + 1)).slice(-2);
  let day = ("0" + date.getDate()).slice(-2);
  return Number(`${year}${mnth}${day}`)
}
 */

offerPricingSchema.pre('save', function (next) {
  if (this.createdAt) {
    this.createdDate = setDateTime(this.createdAt)
  }
  if (this.updatedAt) {
    this.updatedDate = setDateTime(this.updatedAt)
  }
  if (this.startDateTime) {
    this.startDate = setDateTime(this.startDateTime)
  }
  if (this.endDateTime) {
    this.endDate = setDateTime(this.endDateTime)
  }

  next()
});
autoIncrement.initialize(mongoose.connection);

offerPricingSchema.plugin(autoIncrement.plugin, {
  model: "offerpricing", // collection or table name in which you want to apply auto increment
  field: "indexNo", // field of model which you want to auto increment
  startAt: 1000, // start your auto increment value from 1
  incrementBy: 1, // incremented by 1
});

// setDateTime1(this.startDateTime)
let offerPricingModal = mongoose.model("offerpricings", offerPricingSchema);
module.exports = offerPricingModal;