const allModels = require('./../../../../utilities/allModels');

exports.productSearch = async (req, res) => {
      var search = req.body.search;
      let filter = {};

      let sellerFilter = {};
      let sellerSearch = req.body.sellerSearch;

      if (search) {
            if (search.length > 2) {
                  filter = {
                        $or: [
                              { "productDetails.productName": new RegExp(search, "i") },
                              { "productDetails.productDescription": new RegExp(search, "i") },
                              { "brandId.brandDetails.brandName": new RegExp(search, "i") },
                              { "productCategories.categoryId.categoryDetails.categoryName": new RegExp(search, "i") },
                        ]
                  }
            } else {
                  return res.send({ message: "Search string must be greater the 2 characters" });
            }
      } else if (!search) {
            sellerFilter = { sellerId: req.userId };
            if (sellerSearch) {
                  filter = {
                        $or: [
                              { "productDetails.productName": new RegExp(sellerSearch, "i") },
                              { "productDetails.productDescription": new RegExp(sellerSearch, "i") },
                              { "brandId.brandDetails.brandName": new RegExp(sellerSearch, "i") },
                              { "productCategories.categoryId.categoryDetails.categoryName": new RegExp(sellerSearch, "i") },
                        ]
                  }
            }
      }

      //console.log(filter, sellerFilter);
      let data = await allModels.product.find(filter)
            .select(["_id", "productDetails", "tags", "productCategories.categoryId", "brandId", "active"])
            .populate([{ path: 'brandId', select: ["-active", "-photoCover", "-photoThumbnail"] },
            {
                  path: 'productCategories.categoryId', select: ["-active", "-categoryCoverImage",
                        "-categoryThumbnailImage", "-isParent"]
            }]);

      //console.log(data.length);
      var RESPONSE_DATA = [];
      // console.log(productCategories.categoryId.categoryDetails.categoryName)
      if (data.length == 0) {
            return res.send({ count: data.length, d: RESPONSE_DATA });
      }

      for (let i = 0; i < data.length; i++) {
            const el = data[i];

            var variant = await allModels.productVariant.find({
                  "productId": el._id, ...sellerFilter
            }).select(["productVariantImages.path", "productVariantDetails"]);

            //console.log(variant)
            var a = {
                  productDetails: [],
                  tags: [],
                  _id: '',
                  productVariantCount: 0,
                  brandId: '',
                  productCategories: '',
                  active: ''
            };

            a.productVariantCount = variant.length;
            a.productVariants = variant;
            a._id = el['_id'];
            a.tags = el['tags'];
            a.productDetails = el['productDetails'];
            a.brandId = el['brandId'];
            a.productCategories = el['productCategories'];
            a.active = el['active'];

            if (variant.length > 0 && !search) {
                  RESPONSE_DATA.push(a);
            }else if(search){
                  RESPONSE_DATA.push(a);
            }
      }
      return res.send({ count: RESPONSE_DATA.length, d: RESPONSE_DATA });
}


