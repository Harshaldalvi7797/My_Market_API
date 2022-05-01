let allModels = require("../utilities/allModels")
const { validationResult } = require('express-validator');

exports.getAllBrands = async (req, res, next) => {
  allModels.brand.find().select(['-__v', '-createdAt', '-updatedAt']).then((brandData) => {
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
