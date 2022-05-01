let mongoose = require("mongoose");
var allModels = require("../../../utilities/allModels");
let upload = require("./../middlewares/AdminfileUpload");


exports.getOfferLinks = async (req, res, next) => {
  allModels.offerLink.find()
    .populate("createdBy")
    .select(["-__v", "-createdAt", "-updatedAt"])
    .then((offerData) => {
      return res.status(res.statusCode).send({
        statusCode: "001",
        message: "Success",
        data: offerData,
      });
    })
    .catch((e) => {
      //console.log(e);
      return res.status(res.statusCode).send({
        statusCode: "002",
        message: e,
      });
    });
};
exports.deleteOffer = async (req, res, next) => {
  try {
    const data = await allModels.offerLink.findByIdAndRemove(req.params.id);
    return res.send({ message: " Deleted!" })
  }
  catch (err) {
    return res.status(400).send(err);
  }
}