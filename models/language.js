let mongoose = require("mongoose");
let { setDateTime } = require("./setDateTime")
let ngThis = this;
let languageSchema = new mongoose.Schema({

    language : {
        type : String,
        default : "English"
    },
    languageShort : {
        type : String,
        default : "EN"
    },
    direction : String,
    active : {
        type : Boolean,
        default : false
    }
});

let languageModel = mongoose.model('language', languageSchema);
module.exports = languageModel;