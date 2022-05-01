let allModels = require("../../../../utilities/allModels")
const { validationResult } = require('express-validator');
let { createDirectories, } = require('./../../middlewares/checkCreateFolder');
let { fileUpload } = require('../../../v1/middlewares/fileUpload');
let mongoose = require("mongoose");
let { sendNotification } = require("../../middlewares/sendNotification");

exports.fetchSingleProduct = async (req, res) => {
    try {
        let product = await allModels.product.aggregate([

            { $match: { "_id": mongoose.Types.ObjectId(req.params.id) } },
            {
                $lookup: {
                    from: "brands",
                    localField: "brandId",
                    foreignField: "_id",
                    as: "brands",

                },
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "productCategories.categoryLevel1Id",
                    foreignField: "_id",
                    as: "categoryLevel1",

                },
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "productCategories.categoryLevel2Id",
                    foreignField: "_id",
                    as: "categoryLevel2",

                },
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "productCategories.categoryLevel3Id",
                    foreignField: "_id",
                    as: "categoryLevel3",

                },
            },

            {
                $project:
                {
                    "brands.createdAt": 0,
                    "brands.updatedAt": 0,
                    "brands.__v": 0,
                    "brands.active": 0,
                    "categoryLevel1.active": 0,
                    "categoryLevel1.adminApproval": 0,
                    "categoryLevel1.child": 0,
                    "categoryLevel1.createdAt": 0,
                    "categoryLevel1.updatedAt": 0,
                    "categoryLevel1.__v": 0,
                    "categoryLevel1.homePageOrder": 0,

                    "categoryLevel2.active": 0,
                    "categoryLevel2.active": 0,
                    "categoryLevel2.adminApproval": 0,
                    "categoryLevel2.child": 0,
                    "categoryLevel2.createdAt": 0,
                    "categoryLevel2.updatedAt": 0,
                    "categoryLevel2.__v": 0,
                    "categoryLevel2.active": 0,
                    "categoryLevel3.active": 0,
                    "categoryLevel3.adminApproval": 0,
                    "categoryLevel3.child": 0,
                    "categoryLevel3.createdAt": 0,
                    "categoryLevel3.updatedAt": 0,
                    "categoryLevel3.__v": 0,
                    "categoryLevel3.active": 0
                }
            }


        ])
        return res.send({ data: product })

    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }
}

exports.addProduct = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    let reqData = req.body;
    // console.log("productCategories", reqData.productCategories)

    for (let index = 0; index < reqData.productCategories.length; index++) {
        const element = reqData.productCategories[index];
        // console.log("element.categoryLevel1Id",element.categoryLevel1Id)
        if (element.categoryLevel1Id) {
            let checkCategoryLevel1 = await allModels.category.findOne({ "_id": element.categoryLevel1Id, "categoryLevel": "1" })

            if (!checkCategoryLevel1) {
                return res.send({ message: "Please enter valid parent category" })
            }
        }
        if (element.categoryLevel2Id) {
            let checkCategoryLevel2 = await allModels.category.findOne({ "_id": element.categoryLevel2Id, "categoryLevel": "2" })

            if (!checkCategoryLevel2) {
                return res.send({ message: "Please enter valid second level category" })
            }
        }
        if (element.categoryLevel3Id) {
            let checkCategoryLevel3 = await allModels.category.findOne({ "_id": element.categoryLevel3Id, "categoryLevel": "3" })

            if (!checkCategoryLevel3) {
                return res.send({ message: "Please enter valid third level category" })
            }
        }

    }
    let brand = await allModels.brand.find({
        _id: reqData.brandId
    })
        .populate({ path: 'brandId', select: ["-active", "-photoCover", "-photoThumbnail"] });
    //reqData.category for loop
    if (!brand) { return res.status(403).send({ message: "Please enter valid brand" }); }

    for (let index = 0; index < reqData.productDetails.length; index++) {
        const element = reqData.productDetails[index];

        //console.log("element.productName", element.productName)
        let sameProduct = await allModels.product.findOne({ "productDetails.productName": element.productName })
            .populate([{ path: 'brandId', select: ["-active", "-photoCover", "-photoThumbnail"] },
            {
                path: 'productCategories.categoryId', select: ["-active", "-categoryCoverImage",
                    "-categoryThumbnailImage", "-isParent"]
            }]);
        if (sameProduct) {
            return res.status(409).send({ d: sameProduct, message: "This product is already available in My Market." })
        }

    }
    try {
        const newproduct = await new allModels.product({
            productDetails: reqData.productDetails,
            productCategories: reqData.productCategories,
            tags: reqData.tags,
            sellerId: req.sellerId,
            brandId: reqData.brandId
        })

        let data = await newproduct.save()
        //console.log("data:",data)
        // console.log(data._id)

        let response = await allModels.product.find({ _id: data._id })
            .populate([{ path: 'brandId', select: ["-active", "-photoCover", "-photoThumbnail"] },
            {
                path: 'productCategories.categoryId', select: ["-active", "-categoryCoverImage",
                    "-categoryThumbnailImage", "-isParent"]
            }]);
        // let response = {...data,...brand}
        //allModels.log.writeLog(req, data);

        //Notification Work
        let adminId= "61f76a82f69ba51ee415db95"
        data.sellername= req.seller.nameOfBussinessEnglish
        sendNotification(req, req.userId, adminId, '43', data, 'main product', data._id)
        //End Notification Work

        return res.send({ message: "Main Product has been added.", d: response });
    }
    catch (error) {
        //console.log(error)
        // allModels.log.writeLog(req, error)
        return res.status(403).send({ error: error })
    }
}
exports.fetchProducts = async (req, res) => {

    let data = await allModels.product.find()
        // .select(['-__v', '-createdAt', '-updatedAt']);
        .populate([{ path: 'brandId', select: ["-active", "-photoCover", "-photoThumbnail"] },
        {
            path: 'productCategories.categoryId', select: ["-active", "-categoryCoverImage",
                "-categoryThumbnailImage", "-isParent"]
        }]);
    //console.log(data)
    return res.send({ d: data });
}
//need to final fields in tags and group tags like productDetails
exports.updateProduct = async (req, res) => {

    let product = await allModels.product.findById({
        _id: req.params.id,
        sellerId: req.userId
    })
        .populate([{ path: 'brandId', select: ["-active", "-photoCover", "-photoThumbnail"] },
        {
            path: 'productCategories.categoryId', select: ["-active", "-categoryCoverImage",
                "-categoryThumbnailImage", "-isParent"]
        }]);
    //.select(['-__v', '-createdAt', '-updatedAt']);
    if (!product) {
        return res.status(404).send({ message: "Invalid Product Id" });
    }

    let tags = {}
    let groupTags = {}
    let reqData = req.body
    let categories = [];
    for (let i = 0; i < reqData['productCategories'].length; i++) {
        let category = await allModels.category.findOne({
            _id: reqData['productCategories'][i].id
        });
        if (category) {
            categories.push({ categoryId: category._id, active: true })
        }
    }

    //data for updating product details
    /* productDetails.name = req.body.productDetails ? (req.body.productDetails.name ? req.body.productDetails.name : product.productDetails.name) : product.productDetails.name;
    productDetails.description = req.body.productDetails ? (req.body.productDetails.description ? req.body.productDetails.description : product.productDetails.description) : product.productDetails.description;
    productDetails.language = req.body.productDetails ? (req.body.productDetails.language ? req.body.productDetails.language : product.productDetails.language) : product.productDetails.language; */
    product.productDetails = req.body.productDetails ? req.body.productDetails : product.productDetails;
    product.productCategories = reqData.categories ? reqData.categories : product.productCategories
    //array update
    tags = req.body.tags ? req.body.tags : tags
    product.tags = tags
    groupTags = req.body.groupTags ? req.body.groupTags : groupTags; //(req.body.groupTags ? req.body.groupTags : groupTags) 
    product.groupTags = groupTags
    //console.log(product);

    product.save();
    return res.send({ message: "Main Product updated", d: product });


}
exports.deleteProduct = async (req, res) => {
    let product = await allModels.product.findByIdAndUpdate(req.params.id);
    if (!product) {
        return res.status(403).send({ message: "invalid id" });
    }

    product.active = false
    product.save()
    return res.send({ message: "Product InActive successfully done" });

}
exports.updateStatus = async (req, res) => {
    try {
        let product = await allModels.product.findByIdAndUpdate(req.params.id);
        if (!product) {
            return res.status(403).send({ message: "invalid id" });
        }
        product.active = req.body.active
        product.save()
        return res.send({ message: " Main product status updated successfully done" });
    }
    catch (error) {
        return res.status(500).send({
            message: "Internal server error :(",
            systemErrorMessage: error.message,
        });
    }
}
exports.getAllcategoriesForproduct = async (req, res, next) => {
    let a = await allModels.category.find()
        .select(['_id', 'parentCategoryId', 'isParent', 'categoryThumbnailImage', 'categoryDetails.c_language',
            'categoryDetails.categoryName', 'homePageOrder'])
        .collation({ locale: "en" })
        .sort([['categoryDetails.categoryName', '1']])


    let list = [];

    //finding main parent and inserting
    let parent = a.filter(f => {
        return f['parentCategoryId'] == null
    });


    let findChild = (parent, array, output) => {
        parent.forEach(p => {
            let filter = array.filter(f => {
                try {
                    return f.parentCategoryId.equals(p._id)
                } catch (error) {
                    return false;
                }

            })

            let search = output.filter(o => {
                return o._id.equals(p._id);
            })

            if (search.length > 0 && filter.length > 0) {
                filter.forEach(el => {
                    if (deepSearch(output, '_id', (k, v) => v.equals(el._id)) == null) {
                        search[0].child.push({
                            _id: el._id, name: el.categoryDetails,
                            categoryThumbnailImage: el.categoryThumbnailImage,
                            //categoryCoverImage: el.categoryCoverImage,
                            child: []
                        })
                        //console.log(JSON.stringify(search[0]));
                    }

                    let check = array.filter(c => {
                        return el._id.equals(c.parentCategoryId)
                    })

                    if (check.length > 0) {
                        findChild(search[0].child, array, search[0].child);
                    }
                })
            }

        })
    }

    parent.forEach((p, index) => {
        list.push({
            _id: p._id, name: p.categoryDetails,
            categoryThumbnailImage: p.categoryThumbnailImage,
            categoryCoverImage: p.categoryCoverImage,
            child: []
        })

        if (index == (parent.length - 1)) {
            //find child upto lowest level
            findChild(parent, a, list);
        }
    });

    return res.send({ count: list.length, data: list });
}
let deepSearch = (object, key, predicate) => {
    if (object.hasOwnProperty(key) && predicate(key, object[key]) === true) return object

    for (let i = 0; i < Object.keys(object).length; i++) {
        let value = object[Object.keys(object)[i]];
        if (typeof value === "object" && value != null) {
            let o = deepSearch(object[Object.keys(object)[i]], key, predicate)
            if (o != null) return o
        }
    }
    return null
}