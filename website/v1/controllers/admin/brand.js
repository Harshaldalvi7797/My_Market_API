let upload = require("./../../middlewares/AdminfileUpload");
var XLSX = require('xlsx');
let { body, query } = require("express-validator");
const { validationResult } = require('express-validator');
let mongoose = require("mongoose");
const ALL_MODELS = require("../../../../utilities/allModels");

exports.brandsWithSearch = async (req, res) => {
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
    const regexp = new RegExp(search, "i");
    filter["$or"] = [
      { "brandDetails.brandName": regexp }
    ];
    if (!isNaN(parseInt(search))) {
      filter["$or"].push({ "indexNo": parseInt(search) })
    }
  }
  let brands = await ALL_MODELS.brand.aggregate([

    { $match: filter },
    { $sort: { "indexNo": - 1 } },
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
  ]);

  const brandList = brands.length ? brands[0].paginatedResults : [];
  let totalCount = 0
  try {
    totalCount = brands[0].totalCount[0].count
  } catch (err) { }

  return res.send({ totalCount: totalCount, count: brandList.length, data: brandList });


}

exports.addBrand = async (req, res, next) => {
  const validationError = validationResult(req);
  if (!validationError.isEmpty()) {
    return res.status(403).send({ message: validationError.array() });
  }
  try {
    let reqData = req.body;
    let newBrand = new ALL_MODELS.brand({
      brandDetails: JSON.parse(reqData.brandDetails) || reqData.brandDetails,
      active: true
    })


    let uploadLocation = `/brands` + `/${newBrand['_id']}`



    if (req.files) {

      if (req.files['brandThumbnailImage']) {
        await upload.fileUpload(req, next, ['brandThumbnailImage'], uploadLocation);
        newBrand['brandThumbnailImage'] = req.filPath[0];
      }

      if (req.files['brandCoverImage']) {
        await upload.fileUpload(req, next, ['brandCoverImage'], uploadLocation);
        newBrand['brandCoverImage'] = req.filPath[0];
      }
    }

    let data = await newBrand.save()
    return res.send({ message: "Brand has been added", d: data });

  }
  catch (error) {
    return res.status(403).send({ message: error.message });
  }
}

exports.getAllBrand = async (req, res) => {
  try {
    let brands = await ALL_MODELS.brand
      .find()
      .select(["-__v", "-updatedAt"])
      .limit(parseInt(req.query.limit))
      .skip(parseInt(req.query.skip))

    let totalCount = await ALL_MODELS.brand.count();
    return res.send({ count: brands.length, totalCount, brands });
  } catch (error) {
    return res.status(500).send({
      message: "Internal server error :(",
      systemErrorMessage: error.message,
    });
  }
}

exports.getSingleBrand = async (req, res) => {
  try {
    let brand = await ALL_MODELS.brand.findById(req.params.id)
    return res.send({ brand });
  } catch (error) {
    return res.status(500).send(error.message)
  }

}

exports.updateBrand = async (req, res, next) => {
  const valid = mongoose.Types.ObjectId.isValid(req.params.id);

  if (!valid)
    return res.status(402).send({ message: "Invalid brand id" });

  try {
    let brand = await ALL_MODELS.brand.findById({
      _id: req.params.id
    })


    if (!brand) {
      return res.send("invalid brand id")
    }

    let brandDetails = {}

    brandDetails = JSON.parse(req.body.brandDetails) ? JSON.parse(req.body.brandDetails) : brandDetails
    brand.brandDetails = brandDetails

    brand.active = req.body.active ? req.body.active : brand.active
    brand.adminApproval = req.body.adminApproval ? req.body.adminApproval : brand.adminApproval

    let uploadLocation = `/brands` + `/${brand['_id']}`
    if (req.files) {
      let uploadLocation = `/brands` + `/${brand['_id']}`
      if (req.files['brandThumbnailImage']) {
        await upload.fileUpload(req, next, 'brandThumbnailImage', uploadLocation);
        brand['brandThumbnailImage'] = req.filPath[0];
      }

      if (req.files['brandCoverImage']) {
        await upload.fileUpload(req, next, 'brandCoverImage', uploadLocation);
        brand['brandCoverImage'] = req.filPath[0];
      }
    }
    let data = await brand.save()
    return res.send({ message: "Brand has been updated.", d: data })

  }
  catch (error) {
    return res.status(403).send({ message: error.message });
  }
}

exports.deleteBrand = async (req, res) => {
  try {
    const brandId = req.params.id;
    let brands = await ALL_MODELS.brand.findOneAndRemove({
      _id: req.params.id
    });
    //console.log(brands)
    if (!brands)
      return res.status(404).send({
        message: "There was no brand found with given information!",
      });
    return res.send({ message: "brand has been deleted.", brands });
  } catch (error) {
    return res.status(403).send({ message: error.message });
  }
}

exports.statusUpdateBrand = async (req, res) => {
  const validationError = validationResult(req);
  if (!validationError.isEmpty()) {
    return res.status(403).send({ message: validationError.array() });
  }
  try {
    if (!mongoose.Types.ObjectId.isValid(req.body.brandId)) {
      return res.send({ message: "There was no brand found with given information!" })
    }
    let brand = await ALL_MODELS.brand.findByIdAndUpdate(req.body.brandId);
    if (!brand) {
      return res.status(403).send({ message: "No Brand found by the given information!" });
    }
    brand.active = req.body.active
    brand.save()
    return res.send({ message: "Brand active status has been updated." });
  }
  catch (error) {
    return error
  }
}

exports.adminApproveBrand = async (req, res) => {
  const validationError = validationResult(req);
  if (!validationError.isEmpty()) {
    return res.status(403).send({ message: validationError.array() });
  }
  try {
    if (!mongoose.Types.ObjectId.isValid(req.body.brandId)) {
      return res.send({ message: "There was no brand found with given information!" })
    }
    let brand = await ALL_MODELS.brand.findByIdAndUpdate(req.body.brandId);
    if (!brand) {
      return res.status(403).send({ message: "No Brand found by the given information!" });
    }
    brand.adminApproval = req.body.adminApproval
    brand.save()
    return res.send({ message: "Admin approval has been updated." });
  }
  catch (error) {
    return res.status(403).send({ message: error.message });
  }
}

exports.brandExcelExport = async (req, res) => {

  let { search } = req.body;

  let filter = {};
  if (search) {
    const regexp = new RegExp(search, "i");
    filter["$or"] = [
      { "brandDetails.brandName": regexp }
    ];
    if (!isNaN(parseInt(search))) {
      filter["$or"].push({ "indexNo": parseInt(search) })
    }
  }

  //console.log(filter);
  let brands = await ALL_MODELS.brand.aggregate([

    { $match: filter },
    { $sort: { "indexNo": - 1 } }
  ])
  let excelExportData = []

  for (let index = 0; index < brands.length; index++) {
    const element = brands[index];
    //english_productVariantName: ele.productVariant.productVariantDetails[0].productVariantName,
    //  arabic_productVariantName: ele.productVariant.productVariantDetails[1].productVariantName,  
    excelExportData.push({
      _id: element._id,
      BrandEnglishName: element.brandDetails[0].brandName,
      BrandArabicName: element.brandDetails[1].brandName,
      Active: element.active,
      AdminApproval: element.adminApproval,
      BrandThumbnailImage: element.brandThumbnailImage,
      BrandCoverImage: element.brandCoverImage,
      CreatedAt: element.createdAt
    })
  }

  var wb = XLSX.utils.book_new(); //new workbook

  var temp = JSON.stringify(excelExportData);
  temp = JSON.parse(temp);
  var ws = XLSX.utils.json_to_sheet(temp);
  let today = new Date();
  var down = `uploads/reports/brandExport_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`
  XLSX.utils.book_append_sheet(wb, ws, "sheet1");
  XLSX.writeFile(wb, down);
  let newReport = new ALL_MODELS.reportModel({
    adminId: req.userId,
    ReportName: "BrandExcel",
    ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
  })

  let data = await newReport.save()
  return res.send({ message: "Your download will begin now.", data: data })
  // return res.send({ d: excelExportData })
}