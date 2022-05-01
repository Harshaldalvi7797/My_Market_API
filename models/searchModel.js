let mongoose = require("mongoose")
let { setDateTime } = require("./setDateTime")
let ngThis = this;
let SearchSchema = new mongoose.Schema({
    customerId:
    {
        type: 'ObjectId',
        ref: "customers"

    },
    searchKeyWord:String,
    deviceIdentifier: String


},
    { timestamps: true }
)

let recommendationModel = mongoose.model('searchhistory', SearchSchema)

module.exports = recommendationModel