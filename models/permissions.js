let mongoose = require("mongoose")
const { ObjectId } = mongoose.Schema;
let { setDateTime } = require("./setDateTime")
const autoIncrement = require("mongoose-auto-increment");

let permissions = new mongoose.Schema({
      name: String,
      code: String
},
      { timestamps: true }
)


autoIncrement.initialize(mongoose.connection);
permissions.plugin(autoIncrement.plugin, {
      model: "permissions", // collection or table name in which you want to apply auto increment
      field: "indexNo", // field of model which you want to auto increment
      startAt: 1000, // start your auto increment value from 1
      incrementBy: 1, // incremented by 1
});

let roleModel = mongoose.model("permissions", permissions)
module.exports = roleModel