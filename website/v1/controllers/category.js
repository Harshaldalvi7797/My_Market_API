var allModels = require('../../../utilities/allModels');
const { validationResult } = require('express-validator');
let upload = require("./../middlewares/AdminfileUpload");
let mongoose = require("mongoose");
let { sendNotification } = require("../middlewares/sendNotification");

exports.getAllcategories = async (req, res, next) => {
    let a = await allModels.category.find()
        .select(['_id', 'parentCategoryId', 'isParent', 'categoryThumbnailImage', 'categoryDetails.c_language',
            'categoryDetails.categoryName', 'homePageOrder'])
        .sort([['homePageOrder', '1']])

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

exports.fetchSinglecategory = async (req, res, next) => {

    // allModels.category.findById(req.params.id).then((categoryData) => {
    //   return res.status(res.statusCode).send({
    //         "statusCode": "001",
    //         "message": "Success",
    //         "data": categoryData
    //     });
    // }).catch(e => {
    //     console.log(e);
    //   return res.status(res.statusCode).send({
    //         "statusCode": "002",
    //         "message": e
    //     });
    // });


    let category = null;
    try {
        category = await allModels.category.findById(req.params.id);
    } catch (error) {
        allModels.log.writeLog(req, error);
    }
    if (!category) {
        allModels.log.writeLog(req, "Invalid category Id");
        return res.status(404).send({ message: "Invalid category Id" });
    }

    allModels.log.writeLog(req, category);
    return res.send({ message: "category get", data: category });
}
exports.addCategory = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {
        let reqData = req.body;
        let category = null;
        let catDetails = null;

        if (reqData.categoryLevel == null) {
            return res.send({ message: "please enter categoryLevel" })
        }

        if (reqData.categoryLevel == "1" && reqData.parentCategoryId != null) {

            return res.send({ message: "Level 1 category can't have parent category" })

        }

        if (reqData.categoryLevel == "2") {

            let checkParent = await allModels.category.findOne({ "_id": reqData.parentCategoryId, "categoryLevel": "1" })
            if (!checkParent) {
                return res.send({ message: "please enter valid parent category" })
            }
        }

        if (reqData.categoryLevel == "3") {

            let checkParent = await allModels.category.findOne({ "_id": reqData.parentCategoryId, "categoryLevel": "2" })
            if (!checkParent) {
                return res.send({ message: "please enter valid parent category" })
            }
        }

        try {
            catDetails = JSON.parse(reqData.categoryDetails);
        } catch (error) {
            console.log(error.message)
            return res.status(403).send({ message: "category details has invalid format" });
        }

        if (reqData.parentCategoryId != null && reqData.parentCategoryId != 'null') {
            var valid = mongoose.Types.ObjectId.isValid(reqData.parentCategoryId);
            if (!valid) {
                return res.status(402).send({ message: "Invalid Category id" });
            }

            category = await allModels.category.findById(reqData.parentCategoryId);
            // console.log(reqData.parentCategoryId)
            if (!category) { return res.status(403).send({ message: "Invalid category id selected" }); }
        }
        //check second level category check parent category


        let insertCat = {};
        if (reqData.parentCategoryId && reqData.parentCategoryId != 'null') {
            insertCat = {
                // categoryDetails: (reqData.categoryDetails) || reqData.categoryDetails,
                categoryDetails: catDetails,
                parentCategoryId: reqData.parentCategoryId,
                isParent: false,
                categoryLevel: reqData.categoryLevel
            }
        } else {
            insertCat = {
                categoryDetails: catDetails,
                isParent: true,
                categoryLevel: reqData.categoryLevel
            }
        }

        for (let index = 0; index < catDetails.length; index++) {
            const element = catDetails[index];
            //console.log("element", element)
            let checkSecondLevelcat = await allModels.category.findOne({
                "categoryDetails.categoryName": element.categoryName,
                "parentCategoryId": reqData.parentCategoryId
            })
            // console.log("checkSecondLevelcat",checkSecondLevelcat)

            if (checkSecondLevelcat) {
                return res.status(409).send({ message: "This category is already available in My Market." })
            }
        }
        //JSON.parse
        let newCategory = new allModels.category(insertCat)
        let uploadLocation = `/category` + `/${newCategory['_id']}`
        if (req.files) {
            if (req.files['categoryThumbnailImage']) {
                await upload.fileUpload(req, next, 'categoryThumbnailImage', uploadLocation);
                newCategory['categoryThumbnailImage'] = req.filPath[0];
            }

            if (req.files['categoryCoverImage']) {
                await upload.fileUpload(req, next, 'categoryCoverImage', uploadLocation);
                newCategory['categoryCoverImage'] = req.filPath[0];
            }
        }
        let data = await newCategory.save()

        let seller = await allModels.seller.findOne({ '_id': req.userId })
        if (seller) {
            //Sending Notification
            let adminId = '61c961934280680ee8782e76'
            data.sellername = seller.nameOfBussiness
            sendNotification(req, req.userId, adminId, '40', data, "category", data._id)
        }

        return res.send({ message: "Category has been added", d: data });
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }
}

exports.updateCategory = async (req, res, next) => {
    let category = await allModels.category.findById({
        _id: req.params.id
    })

    if (!category) {
        return res.send("invalid id")
    }

    let categoryDetails = {}

    categoryDetails = req.body.categoryDetails ? req.body.categoryDetails : categoryDetails
    categoryLevel = req.body.categoryLevel ? req.body.categoryLevel : categoryLevel

    let uploadLocation = `/category` + `/${category['_id']}`
    await upload.fileUpload(req, next, ['categoryCoverImage'], uploadLocation);
    category['categoryCoverImage'] = req.filPath[0];

    await upload.fileUpload(req, next, ['categoryThumbnailImage'], uploadLocation);
    category['categoryThumbnailImage'] = req.filPath[0];


    let data = await category.save()

    return res.send({ message: "Category has been updated." })

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