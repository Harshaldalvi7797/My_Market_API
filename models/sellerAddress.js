// let mongoose = require("mongoose")
// let { ObjectId } = mongoose.Schema;
// let sellerAddressSchema = new mongoose.Schema({
//     sellerAddressId:
//     {
//         type: String,
//         default: mongoose.Types.ObjectId,
//         index: { unique: true }
//     },
//     sellerId:
//     {
//         type: ObjectId,
//         ref: "sellers",

//     },
//     companyName: String,
//     addressName: String,
//     addressType: String,
//     isDefault: Boolean,
//     contactNumber: String,
//     addressLine1: String,
//     addressLine2: String,
//     addressLine3: String,
//     city: String,
//     state: String,
//     country: String,
//     countryCode: String,
//     pinCode: String,
//     pinBox: String,
//     poBox: String,
//     latitude: String,
//     longitude: String,
//     pickUpAddress: String,
//     active: {
//         type: Boolean,
//         default: false
//     }
// },
//     { timestamps: true }
// )
// let sellerAddress = mongoose.model("sellerAddresses", sellerAddressSchema)
// module.exports = { sellerAddress } 