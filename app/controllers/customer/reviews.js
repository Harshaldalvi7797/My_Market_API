let allModels = require("../../../utilities/allModels")
const { validationResult } = require('express-validator');
let upload = require("../../middlewares/AdminfileUpload");
let mongoose = require("mongoose");

exports.productVariantReview = async (req, res, next) => {
      try {
            let reviews = await allModels.productVarientReview.findOne(
                  {
                        customerId: req.userId
                  }
            ).populate({
                  path: 'productVariantId',
                  select: ["_id", "productVariantDetails.pv_language", "productVariantDetails.productVariantName", "productVariantImages", "brandId"],
                  populate: [
                        {
                              path: 'brandId',
                              select: ["_id", "brandDetails"]
                        }
                  ]
            }).select(["_id", "description", "rating", "createdAt", "updatedAt"]);

            return res.send({ count: reviews.length, data: reviews });
      } catch (error) {
            return res.status(402).send({ message: error.message });
      }
}

exports.productVariantReviewAll = async (req, res, next) => {
      try {
            let productvariant = await allModels.productVariant.findById(req.params.productVariantId);
            if (productvariant.length == 0) { return res.status(402).send({ 'message': 'Invalid product variant' }); }

            let reviews = await allModels.productVarientReview.find({
                  productVariantId: productvariant._id
            }).sort([['createdAt', '-1']]).populate([{
                  path: 'customerId',
                  select: ["_id", "firstName", "lastName", "emailAddress"],
            }]).select(["_id", "productImages", "description", "rating", "likedislike", "createdAt", "updatedAt"])

            return res.send({ count: reviews.length, data: reviews });
      } catch (error) {
            return res.status(402).send({ message: 'invalid product variant id' });
      }

}

exports.addProductVariantReview = async (req, res, next) => {
      const validationError = validationResult(req);
      if (!validationError.isEmpty()) {
            return res.status(403).send({ message: validationError.array() });
      }
      let productvariant = await allModels.productVariant.findById(req.body.productVariantID);
      if (!productvariant) { return res.status(402).send({ 'message': 'Invalid product variant' }); }


      let review = await allModels.productVarientReview.findOne({
            $and: [
                  {
                        $or: [{ "customerId": req.userId }
                        ]
                  },
                  { "productVariantId": req.body.productVariantID }
            ]
      })

      if (review) {
            return res.send({ message: "You already review this product!" })
      }
      let reqBody = {
            productVariantId: productvariant._id,
            customerId: req.userId,
            description: req.body.reviewDesc,
            rating: req.body.rating,
            likedislike: [],
            productImages: []
      }

      let newreview = new allModels.productVarientReview(reqBody)
      let uploadLocation = `/${productvariant['_id']}/${req.userId}/` + newreview['_id'];
      try {
            await upload.fileUploadPath(req, next, "productImages", uploadLocation);
            newreview['productImages'] = req.filPath;
      }
      catch (error) {
            return error
      }
      let data = await newreview.save()
      return res.send({ message: "Product review has been added.", d: data });
}

exports.likeDislikeUpdate = async (req, res) => {
      let like = await allModels.productVarientReview.findById({
            _id: req.params.id
      })
      //console.log(like)
      if (!like) {
            return res.status(404).send({ message: "Invalid Id" });
      }
      let a = await like['likedislike'].findIndex(x => x.customerId.toString() === req.userId.toString());
      //console.log('=> ', a);
      if (a == -1) {
            like['likedislike'].push({ customerId: req.userId, isLike: req.body.isLike });
      } else {
            //console.log(req.body.isLike)
            like['likedislike'][a].isLike = req.body.isLike;
      }

      let data = await like.save()
      //console.log(data)
      return res.send({ message: "Like updated successfully..", data: data })
}

exports.deleteReview = async (req, res) => {
      try {
            const { id } = req.params;
            let productReview = await allModels.productVarientReview.findByIdAndDelete({ "_id": id })

            if (!productReview) {
                  return res.send({ message: "No Review found " })
            }
            return res.send({
                  message: "Review has been removed successfully"
            });

      }
      catch (error) {
            return res.status(403).send({ message: error.message });
      }
}

exports.customerReview = async (req, res) => {
      let customerReview = await allModels.productVarientReview.find({
            "customerId": req.userId
      }).sort([['createdAt', '-1']]).populate([
            {
                  path: 'productVariantId',
                  select: ["_id", "productVariantDetails", "productVariantImages", "brandId"],
                  populate: [
                        {
                              path: 'brandId',
                              select: ["_id", "brandDetails"]
                        }
                  ]
            },
            {
                  path: 'customerId',
                  select: ["_id", "emailAddress", "firstName", "lastName"]
            }
      ])

      return res.send({ count: customerReview.length, d: customerReview })
}

exports.editReview = async (req, res, next) => {
      let review = await allModels.productVarientReview.findOne({
            _id: req.body.id,
            customerId: req.userId
      })
      //console.log(req.userId);
      //console.log(req.body);
      if (!review) {
            return res.status(403).send({ message: "Review not found" });
      }
      try {
            const updateKeys = Object.keys(req.body);
            //console.log(updateKeys);
            updateKeys.forEach((update) => {
                  if (update != 'deletedImages') {
                        review[update] = req.body[update]
                  }
            });

            //review["description"] = req.body.description || review["description"];
            //review['rating'] = req.body.rating || review['rating'];

            if (req.files) {
                  let uploadLocation = `/${review['_id']}/${req.userId}/` + review['_id'];
                  await upload.fileUploadPath(req, next, "productImages", uploadLocation);

                  let reviewImages = review['productImages'];
                  review['productImages'] = [...req.filPath, ...reviewImages];
                  //console.log(review['productImages']);
            }

            if (req.body['deletedImages']) {
                  let deleteImage = JSON.parse(req.body['deletedImages'])
                  //console.log(deleteImage)
                  for (let index = 0; index < deleteImage.length; index++) {
                        const element = deleteImage[index];

                        const i = review['productImages'].findIndex(obj => obj.path == element);
                        if (i > -1) {
                              review['productImages'].splice(i, 1);
                        }
                  }
            }

            //console.log(review['productImages']);

            let data = await review.save()
            return res.send({ message: "Your review has been updated", d: data });
      } catch (error) {
            return res.status(403).send({ message: error.message });
      }
}