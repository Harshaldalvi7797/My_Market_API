let mongoose = require("mongoose")
let { setDateTime } = require("./setDateTime")
let ngThis = this;
const { ObjectId } = mongoose.Schema;
let customerNotificationTokenSchema = new mongoose.Schema({
    customerNotificationId:
    {
        type: String,
        default: mongoose.Types.ObjectId,
        index: { unique: true }
    },
    customerId:
    {
        type: ObjectId,
        ref: "customers",
    },
    gcmToken: String,
    deviceType: String,
    deviceOs: String
},
    { timestamps: true }
)
let customerNotificationTokenModel = mongoose.model("customerNotificationToken", customerNotificationTokenSchema)
module.exports = customerNotificationTokenModel