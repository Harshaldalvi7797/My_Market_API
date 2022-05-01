let mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;
let { setDateTime } = require("./setDateTime")
let ngThis = this;
let customerSellerMessaging = new mongoose.Schema({

  to: ObjectId,
  from: ObjectId,
  message: String,
  isSeen: { type: Boolean, default: false }
  ,
  media: [],
  // media: {
  //   type: [String],
  //   default: null,
  // },
  reply: {
    type: ObjectId,
    default: null,
  },
  customerArchive: { type: Boolean, default: false },
  messageDateTime: { type: String },
  createdDate: Number,
  updatedDate: Number
}, { timestamps: true });


customerSellerMessaging.pre('save', function (next) {
  if (this.createdAt) {
    this.createdDate = setDateTime(this.createdAt)
  }
  if (this.updatedAt) {
    this.updatedDate = setDateTime(this.updatedAt)
  }

  next()
});
let customerSellerMessagingModel = mongoose.model(
  "customerSellerMessaging",
  customerSellerMessaging
);

module.exports = customerSellerMessagingModel;
