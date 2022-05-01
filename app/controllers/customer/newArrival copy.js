let allModels = require("../../../utilities/allModels")
let { getFilterCategories, getFilterBrands, getFilterPriceRange, getFilterColor, getAllcategories } = require("../../middlewares/filterOptions");
let { getRating } = require("../../../common/productVariantReview")

exports.newArrivalProducts = async (req, res) => {
    let newArrival = await allModels.productVariant.find({"productVariantImages":{$ne:[]}}).sort([['createdAt', '-1']])

        // .select(['_id'])
        .select(['-__v', '-updatedAt', '-createdAt', '-active', '-inventoryQuantity',
            '-inventoryReOrderLevel', '-inventoryReOrderQuantity'
            , '-productVariantImages.active', '-productVariantImages.photoOrder', '-tags',
            "-shipmentWidth", "-shipmentWeight", "-shipmentHeight", "-shipmentLength"])
        .populate([
            {
                path: 'brandId',
                select: ["-updatedAt", "-createdAt", "-active", "-__v", "-tags"]
            },
            {
                path: 'productId',
                select: ["-productCategories._id", "-productCategories.active", "-updatedAt", "-createdAt", "-active", "-__v", "-tags", "-adminApproval", "-activeWeb", "-activeSeller", "-brandId"],
                populate: [
                    {
                        path: 'productCategories.categoryId',
                        select: ["-active", "-__v", "-isParent", "-parentCategoryId"]
                    }
                ]
            },
            {
                path: 'sellerId',
                select: ["_id", "nameOfBussinessEnglish"]
            },
        ]).lean()
    //console.log(newArrival)
    if (newArrival.length == 0) {
        return res.send({ count: 0, d: newArrival });
    }

    let temp = [];
    await getRating(newArrival, temp);

    let RESPONSE_DATA = temp.filter(a => {
        return a['sellerId'] != null;
    });
    for (let index = 0; index < newArrival.length; index++) {
        const element = newArrival[index]._id;
        //console.log(element)
        newArrival[index].offerPrice = await allModels.offerPricingItem.find({ "productVariantId": element })
            .select(["offerPrice", "discount", "discountType","discountValue"])
    }
    //console.log(RESPONSE_DATA)
    return res.send({ count: RESPONSE_DATA.length, d: RESPONSE_DATA })
}

exports.newArrivalFilterProducts = async (req, res) => {
    let filterDate = new Date();
    filterDate.setMinutes(00);
    filterDate.setHours(00);
    filterDate.setSeconds(00);
    filterDate.setDate(filterDate.getDate() - 8);

    let filter = {
        brand: {},
        category: {},
        priceRange: {}
    };

    if (req.body.brands && typeof req.body.brands == 'object') {
        let brands = req.body.brands;
        filter.brand = { 'brandDetails.brandName': { $in: brands } };
        //console.log(filter);
    }
    if (req.body.category && typeof req.body.category == 'string') {
        let category = req.body.category;
        filter.category = { 'categoryDetails.categoryName': category };
        //console.log(filter);
    }
    if (req.body.minPrice && typeof req.body.minPrice == 'number' && req.body.maxPrice && typeof req.body.maxPrice == 'number') {
        let minPrice = req.body.minPrice;
        let maxPrice = req.body.maxPrice;
        // filter.priceRange;
    }

    let newArrival = await allModels.productVariant.find({

    }).sort([['createdAt', '-1']])
        // .select(['_id'])
        .select(['-__v', '-updatedAt', '-createdAt', '-active', '-inventoryQuantity',
            '-inventoryReOrderLevel', '-inventoryReOrderQuantity'
            , '-productVariantImages.active', '-productVariantImages.photoOrder', '-tags',
            "-shipmentWidth", "-shipmentWeight", "-shipmentHeight", "-shipmentLength"])
        .populate([
            {
                path: 'brandId',
                select: ["-updatedAt", "-createdAt", "-active", "-__v", "-tags"],
                match: filter.brand
            },
            {
                path: 'productId',
                select: ["-productCategories._id", "-productCategories.active", "-updatedAt", "-createdAt", "-active", "-__v", "-tags", "-adminApproval", "-activeWeb", "-activeSeller", "-brandId"],
                populate: [
                    {
                        path: 'productCategories.categoryId',
                        select: ["-active", "-__v", "-isParent",],//"-parentCategoryId"
                        match: filter.category
                    }
                ]
            },
            {
                path: 'sellerId',
                select: ["_id", "nameOfBussinessEnglish"]
            },
        ]).lean();


    let fData = [];
    for (let index = 0; index < newArrival.length; index++) {
        const element = newArrival[index];

        newArrival[index].offerPrice = await allModels.offerPricingItem.find({ "productVariantId": element._id })
            .select(["offerPrice", "discount", "discountType"]);


        if (req.body.category && (element['productId'] && element['productId']['productCategories'].length > 0 && element['productId']['productCategories'][0].categoryId != null)) {
            fData.push(newArrival[index]);
        } else if (!req.body.category && req.body.brands && element['brandId'] != null) {
            fData.push(newArrival[index]);
        } else if (!req.body.category && !req.body.brands) {
            fData.push(newArrival[index]);
        }

    }

    //console.log(newArrival.length);
    if (fData.length == 0) {
        return res.send({ count: 0, d: fData });
    }

    let temp = [];
    await getRating(fData, temp);

    //console.log(temp.length);
    let RESPONSE_DATA = temp.filter(a => {
        return a['sellerId'] != null;
    });

    return res.send({
        count: RESPONSE_DATA.length, data: RESPONSE_DATA
    })
}