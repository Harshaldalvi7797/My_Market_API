let mongoose = require("mongoose");
const autoIncrement = require("mongoose-auto-increment");

let { setDateTime } = require("./setDateTime")
let ngThis = this;
let faqSchema = new mongoose.Schema({

    questionEnglish: { type: String },
    answerEnglish: { type: String },
    questionArabic: { type: String },
    answerArabic: { type: String },
    orderNo: String,
    active: {
        type: Boolean,
        default: false
    }
},
    { timestamps: true }
);

faqSchema.plugin(autoIncrement.plugin, {
    model: "faq", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});



let faqModel = mongoose.model('faq', faqSchema);


module.exports = faqModel;