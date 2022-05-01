let mongoose = require("mongoose")
let { setDateTime } = require("./setDateTime")
let ngThis = this;
const { ObjectId } = mongoose.Schema;
let customerAddressSchema = new mongoose.Schema({
    customerId:
    {
        type: ObjectId,
        ref: "customers"

    },
    addressName: String,
    addressType: String,
    isDefault: {
        type: Boolean,
        default: false
    },
    contactNumber: String,
    addressLine1: String,
    addressLine2: String,
    addressLine3: String,
    city: String,
    state: String,
    country: String,
    pincode: Number,

    poBox: String,
    blockNumber: String,
    postCode: String,
    
    latitude: String,
    longitude: String,
    active: {
        type: Boolean,
        default: false
    },
},
    { timestamps: true }
)
let customerAddressModel = mongoose.model("customeraddresses", customerAddressSchema)
module.exports = customerAddressModel
