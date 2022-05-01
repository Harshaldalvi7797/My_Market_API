let mongoose = require("mongoose")
const { ObjectId } = mongoose.Schema;
let { setDateTime } = require("./setDateTime")
const autoIncrement = require("mongoose-auto-increment");

let role = new mongoose.Schema({
      name: { type: String, unique: true, required: true, },
      permissions: [{ type: ObjectId, ref: "permissions" }],
      status: { type: Boolean, default: false },
      createdDate: Number,
      updatedDate: Number
}, { timestamps: true }
)


role.pre('save', function (next) {
      if (this.createdAt) {
            this.createdDate = setDateTime(this.createdAt)
      }
      if (this.updatedAt) {
            this.updatedDate = setDateTime(this.updatedAt)
      }

      next()
});

autoIncrement.initialize(mongoose.connection);
role.plugin(autoIncrement.plugin, {
      model: "roles", // collection or table name in which you want to apply auto increment
      field: "indexNo", // field of model which you want to auto increment
      startAt: 1000, // start your auto increment value from 1
      incrementBy: 1, // incremented by 1
});

let roleModel = mongoose.model("roles", role)
module.exports = roleModel