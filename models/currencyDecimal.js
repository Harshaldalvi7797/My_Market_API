let mongoose = require("mongoose");
let { setDateTime } = require("./setDateTime")
const autoIncrement = require("mongoose-auto-increment");
let ngThis = this;
let currencyDecimalSchema = new mongoose.Schema({
      currencyShort: String,
      currencyName: String,
      currencyDecimal: Number,
      active:
      {
            type: Boolean,
            default: false
      }
},
      { timestamps: true }
)
autoIncrement.initialize(mongoose.connection);

currencyDecimalSchema.plugin(autoIncrement.plugin, {
      model: "currenciesdecimal", // collection or table name in which you want to apply auto increment
      field: "indexNo", // field of model which you want to auto increment
      startAt: 1000, // start your auto increment value from 1
      incrementBy: 1, // incremented by 1
});
let currencyModel = mongoose.model('currenciesdecimal', currencyDecimalSchema)
module.exports = currencyModel