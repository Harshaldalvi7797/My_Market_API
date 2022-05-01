const { validationResult } = require("express-validator");
const path = require("path");
const allModels = require("../../../../utilities/allModels");
let upload = require("./../../middlewares/AdminfileUpload");
let mongoose = require("mongoose");
var XLSX = require('xlsx');
const c = require("config");
const remove_null_keys = require(path.join(__dirname, "..", "..", "..", "..", "utilities", "remove_null_keys"));

const fs = require('fs')

exports.categoryWithSearch = async (req, res) => {

    let { search, limit, page } = req.body;

    //pagination
    if (!limit) { limit = 10 }
    if (!page) { page = 1 }

    let perPage = parseInt(limit)
    let pageNo = Math.max(0, parseInt(page))

    if (pageNo > 0) {
        pageNo = pageNo - 1;
    } else if (pageNo < 0) {
        pageNo = 0;
    }

    let filter = {};
    if (search) {
        let regexp = new RegExp(search, "i");

        filter["$or"] = [
            { "child.categoryDetails.categoryName": regexp },
            { "categoryDetails.categoryName": regexp },
            { "categoryLevelSearch": regexp }
        ];

        if (!isNaN(parseInt(search))) {
            filter["$or"].push({ "indexNo": parseInt(search) })
        }
    }
    let category = await allModels.category.aggregate([
        {
            $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "parentCategoryId",
                as: "child"
            }

        },
        {
            $lookup: {
                from: "categories",
                localField: "parentCategoryId",
                foreignField: "_id",
                as: "parentname"
            }

        },
        { $addFields: { categoryLevelSearch: { $concat: ["level", " ", "$categoryLevel"] } } },
        { $sort: { "indexNo": - 1 } },
        { $match: filter },


        {
            $facet: {
                paginatedResults: [
                    {
                        $skip: (perPage * pageNo),
                    },
                    {
                        $limit: perPage,
                    },
                ],
                totalCount: [
                    {
                        $count: "count",
                    },
                ],
            },
        },

    ])

    const categoryList = category.length ? category[0].paginatedResults : [];
    let totalCount = 0
    try {
        totalCount = category[0].totalCount[0].count
    } catch (err) { }

    return res.send({ totalCount: totalCount, count: categoryList.length, data: categoryList });
    // return res.send({count:category.length,data:category})
}


exports.excelCategoryDownload = async (req, res) => {
    let { search } = req.body;
    let filter = {};

    if (search) {
        let regexp = new RegExp(search, "i");

        filter["$or"] = [
            { "child.categoryDetails.categoryName": regexp },
            { "categoryDetails.categoryName": regexp },
            { "categoryLevelSearch": regexp }
        ];

        if (!isNaN(parseInt(search))) {
            filter["$or"].push({ "indexNo": parseInt(search) })
        }
    }

    let category = await allModels.category.aggregate([
        {
            $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "parentCategoryId",
                as: "child"
            }

        },
        {
            $lookup: {
                from: "categories",
                localField: "parentCategoryId",
                foreignField: "_id",
                as: "parentname"
            }

        },
        { $addFields: { categoryLevelSearch: { $concat: ["level", " ", "$categoryLevel"] } } },
        { $sort: { "indexNo": - 1 } },
        { $match: filter }
    ])

    /*  let category = await allModels.category.find().sort([['indexNo', -1]])
         .populate([
             { path: "parentCategoryId", select: ["categoryDetails.categoryName"] }]
         )
  */

    var wb = XLSX.utils.book_new(); //new workbook
    let excelExportData = []
    for (let index = 0; index < category.length; index++) {
        const element = category[index];
        let a = {
            IndexNo: element.indexNo,
            CategoryNameEnglish: null,
            CategoryNameArabic: null,
            IsParent: element.isParent,
            Active: element.active,
            AdminApproval: element.adminApproval,
            ParentCategoryNameEnglish: null,
            ParentCategoryNameArabic: null,

        };

        for (let i = 0; i < element.categoryDetails.length; i++) {
            const ele = element.categoryDetails[i];

            if (i == 0) {
                a.CategoryNameEnglish = ele.categoryName;
            }
            else if (i == 1) {
                a.CategoryNameArabic = ele.categoryName;
            }
        }


        if (element.parentCategoryId != null) {
            for (let b = 0; b < element.parentname[0].categoryDetails.length; b++) {
                let el = element.parentname[0].categoryDetails[b];
                if (b == 0) {
                    a.ParentCategoryNameEnglish = el.categoryName;
                }
                else if (b == 1) {
                    a.ParentCategoryNameArabic = el.categoryName;
                }
            }
        }
        excelExportData.push(a)

    }
    var temp = JSON.stringify(excelExportData);
    temp = JSON.parse(temp);
    var ws = XLSX.utils.json_to_sheet(temp);
    let today = new Date();

    var down = `uploads/reports/categoryExport_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`

    //var down =  (   `/uploads/ReportcartExport_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`)
    XLSX.utils.book_append_sheet(wb, ws, "sheet1");

    XLSX.writeFile(wb, down);



    let newReport = new allModels.reportModel({
        adminId: req.userId,
        ReportName: "categoryExcel",
        ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
    })

    let data = await newReport.save()

    return res.send({ message: "Your download will begin now.", data: data })
    //return res.send({ d: excelExportData })


}

exports.excelUploadcategory = async (req, res, next) => {

    let newcat = await allModels.category()

    let uploadLocation = `/demo` + `/${newcat['_id']}`
    if (req.files) {
        if (req.files['categoryFile']) {
            await upload.fileUpload(req, next, ['categoryFile'], uploadLocation);
            newcat['categoryFile'] = req.filPath[0];
        }
    }

    let myRegExp = new RegExp(req.headers.host, 'i');
    newcat.categoryFile = newcat.categoryFile.replace(myRegExp, 'uploads');

    let a = XLSX.readFile(newcat.categoryFile);
    const ws = a.Sheets[a.SheetNames[0]];
    var wJ = XLSX.utils.sheet_to_json(ws);

    let errorList = [];
    for (let index = 0; index < wJ.length; index++) {
        const ele = wJ[index];

        //console.log(ele);
    }


    return res.send({ d: wJ })
}

exports.getAllcategories = async (req, res, next) => {
    let a = await allModels.category.find()
        //.select(['_id', 'parentCategoryId', 'isParent', 'categoryThumbnailImage', 'categoryDetails.c_language', 'categoryDetails.categoryName']);
        .limit(parseInt(req.query.limit))
        .skip(parseInt(req.query.skip));
    let list = [];
    //console.log(a)
    for (let index = 0; index < a.length; index++) {
        const element = a[index]._id;
        a[index].child = await allModels.category.find({ "parentCategoryId": element })
    }
    let totalCount = await allModels.category.count();
    return res.send({ count: a.length, totalCount, data: a });

    //finding main parent and inserting
    //     let parent = a.filter(f => {
    //         return f['parentCategoryId'] == null
    //     });
    // let findChild = (parent, array, output) => {
    //         parent.forEach(p => {
    //             let filter = array.filter(f => {
    //                 try {
    //                     return f.parentCategoryId.equals(p._id)
    //                 } catch (error) {
    //                     return false;
    //                 }

    //             })

    //             let search = output.filter(o => {
    //                 return o._id.equals(p._id);
    //             })

    //             if (search.length > 0 && filter.length > 0) {
    //                 filter.forEach(el => {
    //                     if (deepSearch(output, '_id', (k, v) => v.equals(el._id)) == null) {
    //                         search[0].child.push({
    //                             _id: el._id, name: el.categoryDetails,
    //                             categoryThumbnailImage: el.categoryThumbnailImage,
    //                             //categoryCoverImage: el.categoryCoverImage,
    //                             child: []
    //                         })
    //                         //console.log(JSON.stringify(search[0]));
    //                     }

    //                     let check = array.filter(c => {
    //                         return el._id.equals(c.parentCategoryId)
    //                     })

    //                     if (check.length > 0) {
    //                         findChild(search[0].child, array, search[0].child);
    //                     }
    //                 })
    //             }

    //         })
    //     }

    //     parent.forEach((p, index) => {
    //         list.push({
    //             _id: p._id, name: p.categoryDetails,
    //             categoryThumbnailImage: p.categoryThumbnailImage,
    //             categoryCoverImage: p.categoryCoverImage,
    //             child: []
    //         })

    //         if (index == (parent.length - 1)) {
    //             //find child upto lowest level
    //             findChild(parent, a, list);
    //         }
    //     });

    // return res.send({ count: list.length, data: list });
}

exports.getParentCategory = async (req, res) => {

    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    let isParent = req.query.isParent
    let category = await allModels.category.find({ isParent: isParent }).select(["_id", "categoryDetails.categoryName"])
        .limit(parseInt(req.query.limit))
        .skip(parseInt(req.query.skip))
    let totalCount = await allModels.category.find({ isParent: isParent }).count()


    return res.send({ count: category.length, totalCount, data: category })

}

exports.fetchSinglecategory = async (req, res, next) => {
    let a = await allModels.category.find(
        {
            $or: [
                {
                    "parentCategoryId": req.params.id
                },
                { "_id": req.params.id }
            ]
        })
    var parent = a.filter(i => { return i._id == req.params.id })[0];
    var child = a.filter(i => { return i.parentCategoryId == req.params.id });

    parent['child'] = child;
    return res.send({ data: parent });

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
        let specifications = null;

        try {
            catDetails = JSON.parse(reqData.categoryDetails);
            specifications = JSON.parse(reqData.categorySpecifications);
        } catch (error) {
            return res.status(403).send({ message: "category details has invalid format" });
        }
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

        if (reqData.parentCategoryId != null && reqData.parentCategoryId != 'null') {
            var valid = mongoose.Types.ObjectId.isValid(reqData.parentCategoryId);
            if (!valid) {
                return res.status(402).send({ message: "Please enter valid category" });
            }

            category = await allModels.category.findById(reqData.parentCategoryId);
            // console.log(reqData.parentCategoryId)
            if (!category) { return res.status(403).send({ message: "please enter valid  category" }); }
        }

        let insertCat = {};
        if (reqData.parentCategoryId && reqData.parentCategoryId != 'null') {
            insertCat = {
                // categoryDetails: (reqData.categoryDetails) || reqData.categoryDetails,
                categoryDetails: catDetails,
                parentCategoryId: reqData.parentCategoryId,
                isParent: false,
                categoryLevel: reqData.categoryLevel,
                categorySpecifications: specifications
            }
        } else {
            insertCat = {
                categoryDetails: catDetails,
                isParent: true,
                categoryLevel: reqData.categoryLevel,
                categorySpecifications: specifications
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
        return res.send({ message: "Category has been added", d: data });
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }

}

exports.deleteCategory = async (req, res, next) => {

    try {
        const { _id } = req.params;

        const { n: isDeleted } = await allModels.category.deleteOne({ _id });

        return res.status(isDeleted ? 200 : 404).json({
            message: isDeleted ? "Category has been removed successfully" : "Resource not found."
        });

    } catch (error) { return res.status(403).send({ message: error.message }); }

}

exports.updateCategory = async (req, res, next) => {
    let reqData = req.body
    const valid = mongoose.Types.ObjectId.isValid(req.params.id);
    if (!valid) {
        return res.status(402).send({ message: "Invalid category id" });
    }

    try {
        let category = await allModels.category.findOne({
            _id: req.params.id
        });

        if (!category) {
            return res.send("invalid category id")
        }

        let categoryDetails = null;
        let categorySpecifications = null;

        try {
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

        }
        catch (error) {
            return error

        }
        try {
            categoryDetails = JSON.parse(req.body.categoryDetails);
        } catch (err) {
            categoryDetails = category.categoryDetails
        }

        try {
            categorySpecifications = JSON.parse(req.body.categorySpecifications);

            /* let updatedSpecifications=[];
            for (let index = 0; index < categorySpecifications.length; index++) {
                const element = categorySpecifications[index];
                // console.log("element", element)
                for (let i = 0; i < element.length; i++) {
                    const ele = element[i];
                                       
                    let check = category.categorySpecifications.filter(f=>{
                        let returnCheck = false;
                        for (let j = 0; j < f.length; j++) {
                            const row = f[j];
                            if(row._id == ele._id){
                                returnCheck =true;
                            }
                        }
                        return returnCheck
                    });
                    if(check.length>0){
                        updatedSpecifications
                    }
                    console.log("ele", check)
                }
            } */
        } catch (err) {
            categorySpecifications = category.categorySpecifications
        }
        category.categoryDetails = categoryDetails
        category.active = req.body.active ? req.body.active : category.active
        category.adminApproval = req.body.adminApproval ? req.body.adminApproval : category.adminApproval


        // adminApproval

        category.categoryLevel = req.body.categoryLevel ? req.body.categoryLevel : category.categoryLevel
        category.parentCategoryId = req.body.parentCategoryId ? req.body.parentCategoryId : category.parentCategoryId

        category.categorySpecifications = categorySpecifications



        //console.log("categorySpecifications", category.categorySpecifications)

        if (req.files) {
            let uploadLocation = `/category` + `/${category['_id']}`
            if (req.files['categoryThumbnailImage']) {
                await upload.fileUpload(req, next, 'categoryThumbnailImage', uploadLocation);
                category['categoryThumbnailImage'] = req.filPath[0];
            }

            if (req.files['categoryCoverImage']) {
                await upload.fileUpload(req, next, 'categoryCoverImage', uploadLocation);
                category['categoryCoverImage'] = req.filPath[0];
            }
        }


        //console.log(category);
        let data = await category.save()
        // console.log(data)
        return res.send({ message: "Category  has been updated.", d: data })

    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }

}

exports.updateStatus = async (req, res) => {
    try {
        let category = await allModels.category.findByIdAndUpdate(req.body.categoryId);
        if (!category) {
            return res.status(403).send({ message: "No Category found by the given information!" });
        }
        category.active = req.body.active
        category.save()
        return res.send({ message: "Category active status has been updated" });
    }
    catch (error) {
        return error
    }
}

exports.adminApprovalcategory = async (req, res) => {
    try {
        let category = await allModels.category.findByIdAndUpdate(req.body.categoryId);
        if (!category) {
            return res.status(403).send({ message: "No Category found by the given information!" });
        }
        category.adminApproval = req.body.adminApproval
        category.save()
        return res.send({ message: "Admin approval has been updated." });
    }
    catch (error) {
        return error
    }
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


exports.categoryLevelWise = async (req, res) => {

    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let category = await allModels.category.find({ "categoryLevel": req.query.categoryLevel })

    return res.send({ count: category.length, data: category })
}

exports.admincategoryDropdown = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.body.id)) {
            return res.send({ message: "There was no category found with given information!" })
        }
        let secondCategory = await allModels.category.find({ "parentCategoryId": req.body.id, "categoryLevel": "2" })

        return res.send({ count: secondCategory.length, data: secondCategory })
    }
    catch (error) {
        return res.status(500).send(error.message)
    }
}



