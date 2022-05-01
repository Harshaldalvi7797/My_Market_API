let allModels = require("../../../../utilities/allModels")
const { validationResult } = require('express-validator');
const path = require("path");
const uuid = require("uuid")
const remove_null_keys = require("../../../../utilities/remove_null_keys");
// let { createDirectories } = require('./../../middlewares/checkCreateFolder');
let upload = require("./../../middlewares/fileUpload");
let mongoose = require("mongoose")

exports.addProductvariant = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let reqData = req.body;

    try {
        let product = await allModels.product.findOne({
            _id: reqData.productId
        }).select(['-__v', '-createdAt', '-updatedAt']);

        if (!product) { return res.status(403).send({ message: "Invalid product id selected" }); }

        //add product variant record
        let newProductVariant = new allModels.productVariant({
            productId: reqData.productId,
            brandId: product['brandId'],
            sellerId: req.userId,

            productSKU: reqData.productSKU,
            productVariantDetails: reqData.productVariantDetails,//array of object

            productCurrency: reqData.productCurrency,
            productGrossPrice: reqData.productGrossPrice,
            productNetPrice: reqData.productNetPrice,
            productTaxPercentage: reqData.productTaxPercentage,
            productTaxName: reqData.productTaxName,
            productTaxPrice: reqData.productTaxPrice,

            orderQuantityMax: reqData.orderQuantityMax,
            orderQuantityMin: reqData.orderQuantityMin,

            inventoryQuantity: reqData.inventoryQuantity,
            inventoryReOrderLevel: reqData.inventoryReOrderLevel,
            inventoryReOrderQuantity: reqData.inventoryReOrderQuantity,

            shipmentWidth: reqData.shipmentWidth,
            shipmentLength: reqData.shipmentLength,
            shipmentHeight: reqData.shipmentHeight,
            shipmentWeight: reqData.shipmentWeight,

            subscription: reqData.subscription,
            subscriptionPrice: reqData.subscriptionPrice,
            subscriptionPriceWithoutTax: reqData.subscriptionPriceWithoutTax,
            subscriptionTaxAmount: reqData.subscriptionTaxAmount,

            sale: reqData.sale,
            saleTaxAmount: reqData.saleTaxAmount,
            salepricewithoutTax: reqData.salepricewithoutTax,
            salePrice: reqData.salePrice,
            salePricePercentage: reqData.salePricePercentage,

            savingPercentage: reqData.savingPercentage,

            tags: reqData.tags,

        });

        /**----------------------------------------- */
        let uploadLocation = newProductVariant['productId'] + `/${newProductVariant['_id']}`;
        //console.log(uploadLocation);
        //console.log(newProductVariant);
        try {
            await upload.fileUpload(req, next, "productVariantImages", uploadLocation);
            newProductVariant['productVariantImages'] = req.filPath;
        } catch (error) {

        }


        let data = await newProductVariant.save()
        return res.send({ message: "Product has been added.", d: data });

    }
    catch (error) {
        //console.log(error)
        return res.status().send({ message: error });
    }

}

exports.updateProductVariant = async (req, res, next) => {
    const valid = mongoose.Types.ObjectId.isValid(req.params.id);

    if (!valid)
        return res.status(402).send({ message: "Invalid product variant id" });

    try {
        let  productVariant = await allModels.productVariant.findById({
            _id: req.params.id
           
        }).select(['-__v', '-createdAt', '-updatedAt']);
       

        if (!productVariant)
            return res.status(404).send({ message: "Invalid Product variant Id" });


        const product = await allModels.product.findOne({
            _id: req.body.productId
        });

        if (!product) return res.status(403).send({ message: "Invalid product id selected" });

        //Array Update
        // let productVariantDetails = {}
        // productVariantDetails = req.body.productVariantDetails ? req.body.productVariantDetails : productVariant.productVariantDetails

        // productVariant.productVariantDetails = productVariantDetails
        // productVariant.productSKU = req.body.productSKU ? req.body.productSKU : productVariant.productSKU
        // productVariant.tags = req.body.tags ? req.body.tags : productVariant.tags

        // productVariant.productCurrency = req.body.productCurrency ? req.body.productCurrency : productVariant.productCurrency
        // productVariant.productGrossPrice = req.body.productGrossPrice ? req.body.productGrossPrice : productVariant.productGrossPrice
        // productVariant.productNetPrice = req.body.productNetPrice ? req.body.productNetPrice : productVariant.productNetPrice

        // productVariant.productTaxPercentage = req.body.productTaxPercentage ? req.body.productTaxPercentage : productVariant.productTaxPercentage
        // productVariant.productTaxPrice = req.body.productTaxPrice ? req.body.productTaxPrice : productVariant.productTaxPrice
        // productVariant.productTaxName = req.body.productTaxName ? req.body.productTaxName : productVariant.productTaxName

        // productVariant.orderQuantityMax = req.body.orderQuantityMax ? req.body.orderQuantityMax : productVariant.orderQuantityMax
        // productVariant.orderQuantityMin = req.body.orderQuantityMin ? req.body.orderQuantityMin : productVariant.orderQuantityMin

        // productVariant.inventoryQuantity = req.body.inventoryQuantity ? req.body.inventoryQuantity : productVariant.inventoryQuantity
        // productVariant.inventoryReOrderLevel = req.body.inventoryReOrderLevel ? req.body.inventoryReOrderLevel : productVariant.inventoryReOrderLevel
        // productVariant.inventoryReOrderQuantity = req.body.inventoryReOrderQuantity ? req.body.inventoryReOrderQuantity : productVariant.inventoryReOrderQuantity

        // productVariant.shipmentWidth = req.body.shipmentWidth ? req.body.shipmentWidth : productVariant.shipmentWidth
        // productVariant.shipmentLength = req.body.shipmentLength ? req.body.shipmentLength : productVariant.shipmentLength
        // productVariant.shipmentHeight = req.body.shipmentHeight ? req.body.shipmentHeight : productVariant.shipmentHeight
        // productVariant.shipmentWeight = req.body.shipmentWeight ? req.body.shipmentWeight : productVariant.shipmentWeight

        // productVariant.subscription = req.body.subscription ? req.body.subscription : productVariant.subscription
        // productVariant.subscriptionPrice = req.body.subscriptionPrice ? req.body.subscriptionPrice : productVariant.subscriptionPrice
        // productVariant.subscriptionPriceWithoutTax = req.body.subscriptionPriceWithoutTax ? req.body.subscriptionPriceWithoutTax : productVariant.subscriptionPriceWithoutTax
        // productVariant.subscriptionTaxAmount = req.body.subscriptionTaxAmount ? req.body.subscriptionTaxAmount : productVariant.subscriptionTaxAmount


        // productVariant.sale = req.body.sale ? req.body.sale : productVariant.sale
        // productVariant.saleTaxAmount = req.body.saleTaxAmount ? req.body.saleTaxAmount : productVariant.saleTaxAmount
        // productVariant.salepricewithoutTax = req.body.salepricewithoutTax ? req.body.salepricewithoutTax : productVariant.salepricewithoutTax
        // productVariant.salePrice = req.body.salePrice ? req.body.salePrice : productVariant.salePrice
        // productVariant.salePricePercentage = req.body.salePricePercentage ? req.body.salePricePercentage : productVariant.salePricePercentage

        // productVariant.savingPercentage = req.body.savingPercentage ? req.body.savingPercentage : productVariant.savingPercentage
        // productVariant.active = (req.body.active != undefined) ? req.body.active : productVariant.active

        //console.log(req.body.active, productVariant.active)
        // let uploadLocation = productVariant['productId'] + `/${productVariant['_id']}`
         try {
             await upload.fileUpload(req, next, "productVariantImages", uploadLocation);
             productVariant['productVariantImages'] = req.filPath ? req.filPath : productVariant['productVariantImages']
             productVariant['productVariantImages'] = req.filPath
// if(req.body.imagw_id ==== )

// productVariant.productVariantImages.forEach(async  el=> 
//  {
//         if(el.images_id == req.body.images_id)
//         {
//             console.log("Ss")
//             let uploadLocation = productVariant['productId'] + `/${productVariant['_id']}`
//             await upload.fileUpload(req, next, "productVariantImages", uploadLocation);
//              //productVariant['productVariantImages'] = req.filPath ? req.filPath : productVariant['productVariantImages']
//              el.path= req.filePath
//              console.log(el.path= "DSdsd")
//         }}
//     )

// for (let index = 0; index < productVariant.productVariantImages.length; index++) {
//     const element = productVariant.productVariantImages[index];
//     console.log(element.image_id === req.body.image_id);
//     if(element.image_id === req.body.image_id) {

      

//         try {
//             const uploadLocation = productVariant['productId'] + `/${productVariant['_id']}`;
//             await upload.fileUpload(req, next, "productVariantImages", uploadLocation);
           
//             productVariant.productVariantImages[index].path = "path";

//         } catch(error) {
//             console.log(error);
//         }
    
//     }}
        
        //productVariant['productVariantImages'] = req.filPath ? req.filPath : productVariant['productVariantImages']
        //  element.path= "req.filePath"
             
            //  console.log(eleme.path= "DSdsd")
        
       
    
    

       

         }
         
         
         catch (error) { }
        
        //  console.log(productVariant)
         let data= await   productVariant.save();
          return res.send({ message: "Product variant details has been updated." ,d: data})
    } catch (error) {
        return res.status(402).send({ message: error });
    }

}// End of updateProductVariant method

exports.fetchproductVariant = async (req, res) => {
    let data = await allModels.productVariant.find()
    .populate([
        {
            path: 'productId',
            select: ["_id", "productDetails", "brandId", "productCategories"],
            populate: [
                {
                    path: 'brandId',
                    select: ["_id", "brandDetails"]
                },
                {
                    path: 'productCategories.categoryId',
                    select: ["_id", "categoryDetails"]
                }
            ]
        },
        {
            path: 'sellerId',
            select: ["_id", "nameOfBussinessEnglish"]
        },
    ]).select(["-createdAt", "-__v", "-updatedAt"])
    //.select(['-__v', '-createdAt', '-updatedAt']);
    //console.log(data)
  return res.send({ d: data });
}


exports.fetchproductVariantByProductId = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    //console.log(req.query.id, req.userId);
    var valid = mongoose.Types.ObjectId.isValid(req.query.id);
    if (valid) {
        let data = await allModels.productVariant.find({
            productId: req.query.id,
            sellerId: req.userId
        })
        .populate([
            {
                path: 'productId',
                select: ["_id", "productDetails", "brandId", "productCategories"],
                populate: [
                    {
                        path: 'brandId',
                        select: ["_id", "brandDetails"]
                    },
                    {
                        path: 'productCategories.categoryId',
                        select: ["_id", "categoryDetails"]
                    }
                ]
            },
            {
                path: 'sellerId',
                select: ["_id", "nameOfBussinessEnglish"]
            },
        ]).select(["-createdAt", "-__v", "-updatedAt"])
        //.select(['-__v', '-createdAt', '-updatedAt']);
        //console.log("hi", data)
        return res.send({ count: data.length, d: data });
    } else {
        return res.status(403).send({ message: 'invalid product id', d: [] });
    }
}


exports.updatePhotoOrder = async (req, res) => {
    var valid = mongoose.Types.ObjectId.isValid(req.params.id);

    if (!valid) {
        return res.status(402).send({ message: "Invalid product variant id" });
    }

    try {
        let productVariant = await allModels.productVariant.findById({
            _id: req.params.id,
            sellerId: req.userId
        })

        if (!productVariant) {
            return res.status(404).send({ message: "Invalid Product variant Id" });
        }

        let variantImages = [];
        if (req.body.data.photoOrder) {
            await productVariant.productVariantImages.forEach((el, i) => {
                let row = { photoOrder: "", path: "" };
                try {
                    row.path = req.body.data.path[i];
                    //console.log(row.path);
                } catch (error) { }
                try {
                    row.photoOrder = req.body.data.photoOrder[i];
                    //console.log(row.photoOrder);
                } catch (error) { }
                variantImages.push(row);
            });
        }
        productVariant.productVariantImages = variantImages;

        variantImages.forEach((el, i) => {
            if (el.path == null) {
                productVariant.productVariantImages.splice(i, 1);
            }
        });

        await productVariant.save();

        return res.send({ message: "productVariant images has been updated." })

    } catch (error) {
        return res.status(402).send({ message: JSON.stringify(error.message) });
    }
}

exports.updateProductVariantPhoto = async (req, res, next) => {
    let productVariant = await allModels.productVariant.findById({
        _id: req.params.id,
        sellerId: req.userId
    });

    if (!productVariant) {
        return res.status(404).send({ message: "Invalid Product variant Id" });
    }

    let uploadLocation = productVariant['productId'] + `/${productVariant['_id']}`
    try {
        await upload.fileUpload(req, next, "productVariantImages", uploadLocation);
        // productVariant['productVariantImages'] = req.filPath ? req.filPath : productVariant['productVariantImages'];
        var imgData = [];
        await productVariant['productVariantImages'].forEach(el => {
            imgData.push(el);
        });
        await req.filPath.forEach(el => {
            imgData.push(el);
        })

        productVariant['productVariantImages'] = imgData;
        await productVariant.save();

        return res.send({ message: "product variant image has been updated." });
    } catch (error) {
        return res.send({ message: error.message });
    }
}
exports.getProductVariants = async (req, res) => {

    let productVariant = await allModels.productVariant.find({
        sellerId: req.userId
    })
        .populate({
            path: 'productId',
            select: ["_id", "productDetails", "brandId", "productCategories", "active"],
            populate: [
                {
                    path: 'brandId',
                    select: ["_id", "brandDetails"]
                },
                {
                    path: 'productCategories.categoryId',
                    select: ["_id", "categoryDetails"]
                }
            ]
        })
        .select(["_id", "productId"]).lean();


    let productList = productVariant.filter((li, idx, self) => self.map(itm =>
        itm['productId']).indexOf(li['productId']) === idx
    );
    //console.log(productList);


    for (let i = 0; i < productList.length; i++) {
        productList[i]['productVariants'] = await allModels.productVariant.find({
            productId: productList[i]['productId'],
            sellerId: req.userId

        });
        // return res.send({ count: product.length, data: product })
    }



    return res.send({ count: productList.length, data: productList })
}

// exports.getProductVariants = async (req, res) => {

//     let productVariant = await allModels.productVariant.find({ sellerId: req.userId }).populate({
//         path: 'productId',
//         select: ["_id", "productDetails", "brandId", "productCategories"],
//         populate: [
//             {
//                 path: 'brandId',
//                 select: ["_id", "brandDetails"]
//             },
//             {
//                 path: 'productCategories.categoryId',
//                 select: ["_id", "categoryDetails"]
//             }
//         ]
//     }).select(["_id", "productVariantDetails", "productSKU", "productTaxPrice", "productId", "active"])


//     // let check = productVariant.filter((li, idx, self) => self.map(itm =>
//     //     itm.productId).indexOf(li.productId) === idx

//     // );
//     // console.log(check)

//     // for (let i = 0; i < productVariant.length; i++) {
//     //     let id = productVariant[i]['productId']
//     //     let product = []
//     //     product.push({ productId: id })
//     //     // console.log(product)

//     //     let check = product.filter((li, idx, self) => self.map(itm =>
//     //         itm.productId._id).indexOf(li.productId._id) === idx

//     //     );
//     //     console.log("duplicate remove", check)

//     //     // return res.send({ count: product.length, data: product })
//     // }



//     return res.send({ count: productVariant.length, data: productVariant })
// }


// exports.getProductVariants = async (req, res) => {

//     let productVariant = await allModels.productVariant.find({
//         sellerId: req.userId
//     })
//         .populate({
//             path: 'productId',
//             select: ["_id", "productDetails", "brandId", "productCategories"],
//             /*  populate: [
//                  {
//                      path: 'brandId',
//                      select: ["_id", "brandDetails"]
//                  },
//                  {
//                      path: 'productCategories.categoryId',
//                      select: ["_id", "categoryDetails"]
//                  }
//              ] */
//         })
//         .select(["_id", "productId", "-active"]).lean();


//     let productList = productVariant.filter((li, idx, self) => self.map(itm =>
//         itm['productId']).indexOf(li['productId']) === idx
//     );
//     //console.log(productList);


//     for (let i = 0; i < productList.length; i++) {
//         productList[i]['productVariants'] = await allModels.productVariant.find({
//             productId: productList[i]['productId'],
//             sellerId: req.userId

//         });
//         // return res.send({ count: product.length, data: product })
//     }



//     return res.send({ count: productList.length, data: productList })
// }

exports.singleProductvariant = async (req, res) => {
    let productVariant = null;
    //try {
    productVariant = await allModels.productVariant.findById(req.params.id)
        .select(['-__v', '-createdAt', '-updatedAt'])
        .populate([
            {
                path: 'brandId',
                select: ["_id", "brandDetails"]
            },
            {
                path: 'sellerId',
                select: ['_id', 'nameOfBussiness','commissionPercentage']
            }
        ])
    if (!productVariant) {
        // allModels.log.writeLog(req, "Invalid product Id");
        return res.status(404).send({ message: "Invalid product Id" });
    }

    return res.send({ d: productVariant })


}