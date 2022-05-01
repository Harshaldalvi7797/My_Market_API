// Third party modules
const mongoose = require("mongoose");
let { setDateTime } = require("./setDateTime")
let ngThis = this;
const { ObjectId } = mongoose;

const notificationSchema = new mongoose.Schema(
  {
    customerId: { type: ObjectId, ref: "customers", default: null },
    adminIds: {
      type: [ObjectId],
      ref: "admins",
      default: null
    },
    sellerId: { type: ObjectId, ref: "sellers", default: null },

    notificationType: {
      type: String,
      // enum: ["order", "message", "return", "offer", "other"],
      required: true,
    },
    notificationTypeId: { type: ObjectId /*, required: true */ },
    notificationFrom: { type: ObjectId },
    notificationNameEnglish: { type: String, required: true },
    notificationNameArabic: { type: String, required: true },
    notificationReceiveOn: {
      type: [String],
      enum: ["website", "app", "email", "sms"],
      required: true,
    },
    isNotificationSent: { type: Boolean, default: false },
    seenBy: { type: String, default: null },

    deviceId: { type: String, default: null },
    createdDate: Number,
    updatedDate: Number

  },
  { timestamps: true }
);


module.exports = mongoose.model("notifications", notificationSchema);