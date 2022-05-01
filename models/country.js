let mongoose = require("mongoose");
let { setDateTime } = require("./setDateTime")
let ngThis = this;
let countrySchema = new mongoose.Schema({

    countryName : {
        type : String,
        default : "Bahrain"
    },
    countryShort : String,
    currencyName : String,
    currencyShort : String,
    active : {
        type : Boolean,
        default : false
    }

});

let countryModel = mongoose.model('country', countrySchema);
module.exports = countryModel;

