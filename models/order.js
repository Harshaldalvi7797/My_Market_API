let mongoose = require("mongoose")
let { ObjectId } = mongoose.Schema;
const autoIncrement = require("mongoose-auto-increment");
let { setDateTime } = require("./setDateTime")
let ngThis = this;
let orderSchema = new mongoose.Schema({
    orderId: String,
    customerId: { type: ObjectId, ref: "customers" },
    deviceIdentifier: String,    
    customerDelhiveryDetails: {
        billingDetails: {
            customerName: String,
            companyName: String,
            addressLine1: String,
            addressLine2: String,
            addressLine3: String,
            pincode: String,
            poBox: String,
            city: String,
            state: String,
            country: String,
            mobilePhone: String,
            contactPhone: String,
            emailAddress: String
        },
        shippingDetails: {
            customerName: String,
            companyName: String,
            addressLine1: String,
            addressLine2: String,
            addressLine3: String,
            pincode: String,
            poBox: String,
            city: String,
            state: String,
            country: String,
            mobilePhone: String,
            contactPhone: String,
            emailAddress: String
        }
    },
    subscriptionId: { type: ObjectId, ref: "subscribeproducts", default: null },
    subscriptionIndexNo: { type: String, default: null },
   
    payment: {
        type: Object,
        default: { _id: "", customer: {}, reciept: {}, reference: {}, transaction: {}, source: {} }
    },
    paymentMethod: {
        type: String,
        enum: ["ONLINE", "CASH", "MY_MARKET_WALLET"],
        // required: true,
    },

    createdDate: Number,
    updatedDate: Number

},
    { timestamps: true }

)


orderSchema.pre('save', function (next) {
    if (!this.payment || this.payment == null || this.payment == undefined) {
        this.payment = {}
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

orderSchema.plugin(autoIncrement.plugin, {
    model: "orders", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});
let orderModel = mongoose.model("orders", orderSchema)
module.exports = orderModel

