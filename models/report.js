let mongoose = require("mongoose")
let {setDateTime} = require("./setDateTime")

let ReportSchema = new mongoose.Schema({
    adminId:
    {
        type: 'ObjectId',
        ref: "admins",
        default: null

    },
    sellerId: {
        type: "ObjectId",
        ref: "sellers",
        default: null
    },
    ReportName: String,
    ReportLink: String


},
    { timestamps: true }
)

let reportModel = mongoose.model('reports', ReportSchema)

module.exports = reportModel