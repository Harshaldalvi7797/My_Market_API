let mongoose = require("mongoose");
const autoIncrement = require("mongoose-auto-increment");
let { setDateTime } = require("./setDateTime")
let ngThis = this;
let currencySchema = new mongoose.Schema({
    currencyDetails: {
        language: String,
        countryName: String,
        currencyName: String,
        currencyShort: String
    },
    conversionRate: {
        from: { currencyShort: String, value: String },
        to: { currencyShort: String, value: String },
        decimal: {
            type: Number,
            default: 0
        }
    },
    active:
    {
        type: Boolean,
        default: false
    }
},
    { timestamps: true }
)
autoIncrement.initialize(mongoose.connection);

currencySchema.plugin(autoIncrement.plugin, {
    model: "currencies", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});

let currencyModel = mongoose.model('currencies', currencySchema)
module.exports = currencyModel