let mongoose = require("mongoose")
let { setDateTime } = require("./setDateTime")
let ngThis = this;
const autoIncrement = require("mongoose-auto-increment");

let suggestIdeaSchema = new mongoose.Schema({
    name: String,
    emailAddress: String,
    mobileNumber: String,
    countryCode: String,
    idea: String
},
    { timestamps: true }
)

autoIncrement.initialize(mongoose.connection);

suggestIdeaSchema.plugin(autoIncrement.plugin, {
    model: "suggestideas", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});

let suggestIdeaModel = mongoose.model('suggestideas', suggestIdeaSchema)

module.exports = suggestIdeaModel