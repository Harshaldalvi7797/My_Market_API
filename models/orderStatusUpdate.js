let mongoose = require("mongoose")
const { ObjectId } = mongoose.Schema;
let { setDateTime } = require("./setDateTime")
let ngThis = this;
const autoIncrement = require("mongoose-auto-increment");
let orderStatusUpdateSchema = new mongoose.Schema({

    orderShippingId: { type: ObjectId, ref: "ordershipping" },

    description: { type: String, default: null },
    status: {
        type: String,
        enum: ["Processing", "Shipped", "Delivered", "On_Hold", "New", "Cancelled", "Refunded", "Ready_To_Pickup"],
        required: true,
        default: "New"
    },
    cancelComment: { type: String, default: null },
    updatedBy: { type: String, default: "api" },
    statusUpdatedate: { type: Number },
    createdDate: Number,
    updatedDate: Number
},
    { timestamps: true }
)
orderStatusUpdateSchema.pre('save', function (next) {

    if (this.createdAt) {
        this.createdDate = setDateTime(this.createdAt)
      }
      if (this.updatedAt) {
        this.updatedDate = setDateTime(this.updatedAt)
      }
      if (this.statusUpdatedate) {
        this.updatedDate = setDateTime(this.updatedAt)
      }
    // this.statusUpdatedate = setDateTime(this.updatedAt)
    next()
});
orderStatusUpdateSchema.plugin(autoIncrement.plugin, {
    model: "orderstatusupdate", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});
let orderStatusUpdate = mongoose.model("orderstatusupdate", orderStatusUpdateSchema)
module.exports = orderStatusUpdate