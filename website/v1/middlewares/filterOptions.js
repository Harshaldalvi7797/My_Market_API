const allModels = require('./../../../utilities/allModels');


exports.getFilterCategories = async (data) => {
      return new Promise((resolve, reject) => {
            if (typeof data == 'object') {
                  let categories = [];
                  for (let index = 0; index < data.length; index++) {
                        const ele = data[index];
                        console.log(JSON.stringify(ele['productId']['productCategories']));
                        if (ele['productId']['productCategories'] && ele['productId']['productCategories'].length > 0) {
                              for (let i = 0; i < ele['productId']['productCategories'].length; i++) {
                                    const category = ele['productId']['productCategories'][i];

                                    try {
                                          let isAvailable = categories.filter(f => {
                                                return f._id == category['categoryId']['_id'];
                                          });
                                          if (isAvailable.length == 0) {
                                                categories.push({ _id: category['categoryId']['_id'], details: category['categoryId']['categoryDetails'], parentId: category['categoryId']['parentCategoryId'] });
                                          }
                                    } catch (error) { }

                                    if (index == (data.length - 1) && i == (ele['productId']['productCategories'].length - 1)) {
                                          resolve(categories);
                                    }
                              }
                        }
                  }
            } else {
                  resolve(false);
            }
      });
}

exports.getFilterBrands = async (data) => {
      return new Promise((resolve, reject) => {
            if (typeof data == 'object') {
                  let brands = [];
                  for (let index = 0; index < data.length; index++) {
                        const ele = data[index];

                        if (ele['brandId'] && ele['brandId']['brandDetails'] && ele['brandId']['brandDetails'].length > 0) {
                              try {
                                    let isAvailable = brands.filter(f => {
                                          return f._id == ele['brandId']['_id'];
                                    });
                                    //console.log(JSON.stringify(isAvailable));
                                    if (isAvailable.length == 0) {
                                          brands.push({ _id: ele['brandId']['_id'], details: ele['brandId']['brandDetails'] });
                                    }
                              } catch (error) { }

                              //console.log(index);
                              if (index == (data.length - 1)) {
                                    resolve(brands);
                              }
                        }
                  }
            } else {
                  resolve(false);
            }
      });
}

exports.getFilterPriceRange = async (data) => {
      return new Promise((resolve, reject) => {
            if (typeof data == 'object') {
                  let min = 0.0, max = 0.0;
                  for (let index = 0; index < data.length; index++) {
                        const ele = data[index];
                        let price = parseFloat(ele.productNetPrice);

                        //console.log(price);
                        if (min == 0.0 || min > price && (price != null && typeof price == 'number')) {
                              min = price;
                        }
                        if (max < price) {
                              max = price;
                        }
                  }
                  resolve({ minPrice: min, maxPrice: max });
            }
      });
}

exports.getFilterDiscount = async () => {

}

exports.getFilterColor = async (data) => {
      return new Promise((resolve, reject) => {
            if (typeof data == 'object') {
                  let colors = [];
                  for (let index = 0; index < data.length; index++) {
                        const ele = data[index];

                        if (ele['productVariantDetails'] && ele['productVariantDetails'].length > 0) {
                              for (let i = 0; i < ele['productVariantDetails'].length; i++) {
                                    const ele1 = ele['productVariantDetails'][i];
                                    try {
                                          let isAvailable = colors.filter(f => {
                                                return f.colorHex == ele1['productSpecification']['productColourHex'];
                                          });
                                          //console.log(JSON.stringify(isAvailable));
                                          if (isAvailable.length == 0 && ele1['productSpecification']['productColourHex'] != "") {
                                                colors.push({ color: ele1['productSpecification']['productColour'], colorHex: ele1['productSpecification']['productColourHex'] });
                                          }

                                    } catch (error) {
                                    }
                              }
                        }
                  }
                  resolve(colors);
            } else {
                  resolve(false);
            }
      });
}


exports.getAllcategories = async () => {
      return new Promise(async (resolve, reject) => {
            let a = await allModels.category.find()
                  .select(['_id', 'parentCategoryId', 'isParent', 'categoryDetails',
                        'homePageOrder'])
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
                                                _id: el._id, details: el.categoryDetails,
                                                // categoryThumbnailImage: el.categoryThumbnailImage,
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
                        _id: p._id, details: p.categoryDetails,
                        // categoryThumbnailImage: p.categoryThumbnailImage,
                        categoryCoverImage: p.categoryCoverImage,
                        child: []
                  })

                  if (index == (parent.length - 1)) {
                        //find child upto lowest level
                        findChild(parent, a, list);
                  }
            });

            resolve(list);
      });


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

