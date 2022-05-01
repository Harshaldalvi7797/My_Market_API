// Third party module
const { ObjectId } = require("mongodb");


exports.commonInclustion = {
    productVariants: 1,
    productVariantImages: 1,
    promotionVideo: 1,
    adminId: 1,
    productVariantSpecifications: 1,
    productVariantDetails: 1,
    internationalShippingPrice: 1,
    domesticShippingPrice: 1,
    additionalCod: 1,
    adminApproval: 1,
    currency: 1,
    productSKU: 1,
    productGrossPrice: 1,
    productNetPrice: 1,
    productTaxPercentage: 1,
    productTaxPrice: 1,
    orderQuantityMax: 1,
    orderQuantityMin: 1,
    subscription: 1,
    subscriptionPrice: 1,
    subscriptionPriceWithoutTax: 1,
    subscriptionTaxAmount: 1,
    savingPercentage: 1,
    codConveniencePrice: 1,
    createdDate: 1,
    updatedDate: 1,
    indexNo: 1,
    tags: 1,
    trending: 1,
    active: 1,
};



exports.filter = (req) => {

    if (typeof req !== "object") throw TypeError("Please pass req object");
    const {
        language_code,
        sort_by_a_to_z, sort_by_price, sort_by_avg_rating,
        brand_ids, category_ids, min_price, max_price, discount_upto,
    } = req.body || {};

    // Filters
    let findQuery = {};
    let sort = { indexNo: -1 };

    /**
     * Sort By
     */
    if (sort_by_a_to_z) {

        if (!language_code || +language_code === 0) sort = { englishProductVariantName: +sort_by_a_to_z };
        if (+language_code === 1) sort = { arabicProductVariantName: +sort_by_a_to_z };

    } else if (sort_by_price) {
        sort = {
            // "offerPrice.offerPrice": +sort_by_price,
            productFinalPrice: +sort_by_price,
        }

    } else if (sort_by_avg_rating) {
        sort = {
            "rating.averageRate": +sort_by_avg_rating,
        }
    };

    /**
     * Find Query
     */
    // Price Range
    if (min_price) {
        findQuery.productFinalPrice = {
            $gt: +min_price
        }
    }
    if (max_price) {
        findQuery.productFinalPrice = {
            $lt: +max_price
        }
    }
    if (min_price && max_price) {
        findQuery.productFinalPrice = {
            $gt: +min_price,
            $lt: +max_price
        }
    }

    // Brand
    if (brand_ids) {
        let brand_id_list = brand_ids;

        if (typeof brand_ids === "string")
            brand_id_list = brand_ids.split(",");

        brand_id_list = brand_id_list.map(brand_id => new ObjectId(brand_id));

        findQuery["brandId._id"] = {
            $in: brand_id_list
        }
    }

    // Category
    if (category_ids) {
        let category_id_list = category_ids;

        if (typeof category_ids === "string")
            category_id_list = category_ids.split(",");

        category_id_list = category_id_list.map(brand_id => new ObjectId(brand_id));

        findQuery["$or"] = [
            { "productId.productCategories.categoryLevel1Id": { $in: category_id_list } },
            { "productId.productCategories.categoryLevel2Id": { $in: category_id_list } },
            { "productId.productCategories.categoryLevel3Id": { $in: category_id_list } }
        ]
    }

    // Discount upto
    if (discount_upto) {
        findQuery["offerPrice.discountPercentage"] = {
            $gt: +discount_upto,
        }
    }
    return { findQuery, sort };

}// End of filter method