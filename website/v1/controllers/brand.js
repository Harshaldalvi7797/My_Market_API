let allModels = require("../../../utilities/allModels");
let upload = require("./../middlewares/AdminfileUpload");
const { validationResult } = require('express-validator');
let { sendNotification } = require("../middlewares/sendNotification");

exports.getAllBrands = async (req, res, next) => {

  let brands = await allModels.brand.find()
    .collation({ 'locale': 'en' })
    .select(['-__v', '-createdAt', '-updatedAt'])
    .sort([['brandDetails.brandName', '1']])

  return res.send({ data: brands })
}

exports.getSingleBrand = async (req, res) => {
  allModels.brand.findById(req.params.id).select(['-__v', '-createdAt', '-updatedAt']).then((brandData) => {
    return res.status(res.statusCode).send({
      "statusCode": "001",
      "message": "Success",
      "data": brandData
    });
  }).catch(e => {
    //console.log(e);
    return res.status(res.statusCode).send({
      "statusCode": "002",
      "message": e
    });
  });
}

exports.addBrand = async (req, res, next) => {
  const validationError = validationResult(req);
  if (!validationError.isEmpty()) {
    return res.status(403).send({ message: validationError.array() });
  }
  let reqData = req.body;
  let brandDetails = null;
  try {
    brandDetails = JSON.parse(reqData.brandDetails);
  } catch (error) {
    return res.status(403).send({ message: "brand details has invalid format" });
  }


  for (let index = 0; index < brandDetails.length; index++) {
    const element = brandDetails[index];
    let sameBrand = await allModels.brand.findOne({ "brandDetails.brandName": element.brandName })

    if (sameBrand) {
      return res.status(409).send({ d: sameBrand, message: "This brand is already available in My Market." })
    }
  }
  let newBrand = new allModels.brand({
    brandDetails: brandDetails
  })
  let uploadLocation = `/brands` + `/${newBrand['_id']}`
  if (req.files) {

    if (req.files['brandThumbnailImage']) {
      await upload.fileUpload(req, next, 'brandThumbnailImage', uploadLocation);
      newBrand['brandThumbnailImage'] = req.filPath[0];
    }

    if (req.files['brandCoverImage']) {
      await upload.fileUpload(req, next, 'brandCoverImage', uploadLocation);
      newBrand['brandCoverImage'] = req.filPath[0];
    }
  }
  let data = await newBrand.save()

  let seller = await allModels.seller.findOne({ '_id': req.userId })
  if (seller) {
    //Sending Notification
    let adminId = '61c961934280680ee8782e76'
    data.sellername = seller.nameOfBussiness
    sendNotification(req, req.userId, adminId, '41', data, "brand", data._id)
  }

  return res.send({ message: "Brand has been added", d: data });
}
//fetch products with brand id
exports.getproductsByBrand = async (req, res, next) => {
  let products = await allModels.product.find(
    {
      brandId: req.query.brandId
    }
  )
  //console.log(products)
  return res.send({ count: products.length, data: products })
}
// exports.Brand = async (req, res, next) => {
//   const allBrands = await allModels.brand.find(
//     {},
//     { brandId: 1, brandDetails: 1, brandThumbnail: 1 }
//   );

//   if (allBrands.length) {
//   return res.json({
//       response: allBrands,
//     });
//   } else {
//   return res.json({ response: "No Data Found" });
//   }
// };



// exports.SpecificBrand = async (req, res, next) => {
//   if (Object.keys(req.body).length === 0) {
//     return res.json({ response: "Please Provide brandId" });
//   }
//   const SpecificBrandDetails = await allModels.brand.find({
//     brandId: req.body.brandId,
//   });

//   const ProductDetails = await allModels.product.find({
//     productId: req.body.productId,
//   });

//   if (SpecificBrandDetails.length || ProductDetails.length) {
//   return res.json({
//       searchedBrand: SpecificBrandDetails,
//       searchedBrandProducts: ProductDetails,
//     });
//   } else {
//   return res.json({ response: "No Data Found" });
//   }
// };





