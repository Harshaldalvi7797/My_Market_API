let allModels = require('../../../../utilities/allModels');
const { validationResult } = require('express-validator');
let mongoose = require("mongoose")
let upload = require("./../../middlewares/AdminfileUpload");
let { sendNotification } = require("../../middlewares/sendNotification");

exports.productVariantReview = async (req, res) => {
      let { limit, page } = req.query;

      if (!limit) { limit = 10 }
      if (!page) { page = 1 }

      let perPage = parseInt(limit)
      let pageNo = Math.max(0, parseInt(page))

      if (pageNo > 0) {
            pageNo = pageNo - 1;
      } else if (pageNo < 0) {
            pageNo = 0;
      }

      let reviews = await allModels.productVarientReview.find({
            customerId: req.userId
      }).populate({
            path: 'productVariantId',
            select: ["_id", "productVariantDetails.pv_language", "productVariantDetails.productVariantName", "productVariantImages", "brandId"],
            populate: [
                  {
                        path: 'brandId',
                        select: ["_id", "brandDetails"]
                  }
            ]
      }).limit(perPage).skip(perPage * pageNo);

      let totalCount = await allModels.productVarientReview.find({ customerId: req.userId });
      return res.send({ totalCount: totalCount.length, count: reviews.length, data: reviews });
}

exports.productVariantReviewAll = async (req, res, next) => {
      try {
            let { limit, page } = req.query;

            if (!limit) { limit = 10 }
            if (!page) { page = 1 }

            let perPage = parseInt(limit)
            let pageNo = Math.max(0, parseInt(page))

            if (pageNo > 0) {
                  pageNo = pageNo - 1;
            } else if (pageNo < 0) {
                  pageNo = 0;
            }

            let productvariant = await allModels.productVariant.findById(req.params.productVariantId);
            if (!productvariant) { return res.status(402).send({ 'message': 'Invalid product variant' }); }

            let reviews = await allModels.productVarientReview.find({ productVariantId: productvariant._id })
                  .sort([['createdAt', '-1']])
                  .populate([
                        {
                              path: 'customerId',
                              select: ["_id", "firstName", "lastName", "emailAddress"],
                        }
                  ])
                  .select(["_id", "productImages", "description", "rating", "likedislike", "createdAt", "updatedAt"])
                  .limit(perPage).skip(perPage * pageNo);

            let totalCount = await allModels.productVarientReview.find({ productVariantId: productvariant._id });
            return res.send({ totalCount: totalCount.length, count: reviews.length, data: reviews });
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
      let reqBody = {
            productVariantId: productvariant._id,
            customerId: req.userId,
            description: req.body.reviewDesc || null,
            rating: req.body.rating,
            likedislike: [],
            productImages: []
      }
      let review = new allModels.productVarientReview(reqBody)

      if (req.files) {
            let uploadLocation = `/${productvariant['_id']}/${req.userId}/` + review['_id'];
            try {
                  await upload.fileUploadPath(req, next, "productImages", uploadLocation);
                  review['productImages'] = req.filPath;
            }
            catch (error) {
                  return error
            }
      } else {
            review['productImages'] = []
      }
      let data = await review.save()

      //Sending Notification
      data.customername= req.customer.firstName.toUpperCase()
      data.productname= productvariant.productVariantDetails[0].productVariantName
      
      sendNotification(req, req.userId, productvariant.sellerId, '33', data, 'review', data._id)
      //End Sending Notification

      return res.send({ message: "Your review has been added", d: data });
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
      //Array Update end


      let data = await like.save()
      //console.log(data)
      return res.send({ message: "Like updated successfully..", data: data })
}

exports.updateReview = async (req, res, next) => {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(403).send({ message: "Invalid review id" });
      }
      let review = await allModels.productVarientReview.findOne({
            _id: req.params.id,
            customerId: req.userId
      });

      if (!review) {
            return res.status(403).send({ message: "There was no review found with given information!" });
      }
      const updateKeys = Object.keys(req.body);
      updateKeys.forEach((update) => (review[update] = req.body[update]));

      try {
            if (req.files) {
                  let allImages = review['productImages'];

                  let uploadLocation = `/${review['productVariantId']}/${req.userId}/` + review['_id'];
                  await upload.fileUploadPath(req, next, "productImages", uploadLocation);
                  if (!allImages || allImages.length <= 0) {
                        review['productImages'] = req.filPath;
                        await review.save();
                  } else if (allImages.length > 0) {
                        let review1 = await allModels.productVarientReview.findOne({
                              _id: req.params.id,
                              customerId: req.userId
                        });
                        review1['productImages'] = [...review1['productImages'], ...req.filPath];
                        await review1.save();
                  }

            } else {
                  await review.save();
            }
            return res.send({ message: "Product review have been updated." });
      } catch (error) {
            return res.send({ message: error.message });
      }

}

exports.deleteReview = async (req, res) => {
      let review = await allModels.productVarientReview.findOne({
            _id: req.params.id,
            customerId: req.userId
      });
 if (!review) {
            return res.status(403).send({ message: "There was no review found with given information!" });
      }
      await review.delete();
      return res.send({ message: "Review deleted successfully" });
}

exports.deleteReviewPhotos = async (req, res, next) => {
      let pvr = await allModels.productVarientReview.findById({
            _id: req.body.id,
            customerId: req.userId
      });

      if (!pvr) {
            return res.status(404).send({ message: "Invalid review Id" });
      }

      try {
            let images = pvr['productImages'];
            let a = await images.findIndex(x => x.path.toString() === req.body.deleteImg);
            if (a != -1) {
                  pvr['productImages'].splice(a, 1);
                  await pvr.save();
                  return res.send({ message: "Photo deleted successfully." });
            } else {
                  return res.send({ message: "Photo not found." });
            }
      } catch (error) {
            return res.send({ message: error.message });
      }
}