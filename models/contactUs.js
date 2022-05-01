let mongoose = require("mongoose");
let { setDateTime } = require("./setDateTime")
let ngThis = this;
let contactUsSchema = new mongoose.Schema({
    name: String,
    emailAddress: {
        type: String

    },
    mobilePhone: {
        type: String

    },
    message: String,
    createdDate:Number,
    updatedDate:Number
});

let contactUsModel = mongoose.model("contactUs", contactUsSchema);
module.exports = contactUsModel;