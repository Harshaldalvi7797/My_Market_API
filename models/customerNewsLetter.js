let mongoose = require("mongoose")
let { setDateTime } = require("./setDateTime")
const autoIncrement = require("mongoose-auto-increment");
let ngThis = this;
const { ObjectId } = mongoose.Schema;
let customerNewsLetterSchema = new mongoose.Schema({
    customerNewsLetterId: {
        type: String,
        default: mongoose.Types.ObjectId,
        index: { unique: true }
    },
    customerId:
    {
        type: ObjectId,
        ref: "customers"
    },
    emailAddress: {
        type: String,
        unique: true
    },
    smsActive: String,
    emailActive: String,
    newsLetterFrequency: String,
    acceptTerms: String
},
    { timestamps: true }
)

customerNewsLetterSchema.plugin(autoIncrement.plugin, {
    model: "customerNewsLetter", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});

let customerNewsLetterModel = mongoose.model("customerNewsLetter", customerNewsLetterSchema)

module.exports = customerNewsLetterModel