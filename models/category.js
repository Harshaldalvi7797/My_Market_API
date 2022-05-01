let mongoose = require("mongoose")
const autoIncrement = require("mongoose-auto-increment");
const { ObjectId } = mongoose.Schema;
let { setDateTime } = require("./setDateTime")
let ngThis = this;

let categorySchema = new mongoose.Schema({
    categoryDetails: [],
    // childs: [],
    active: {
        type: Boolean,
        default: null
    },
    adminApproval:
    {
        type: Boolean,
        default: false
    },
    parentCategoryId:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "categories",
        default: null
    },
    isParent: Boolean,
    categoryCoverImage: String,
    categoryThumbnailImage: String,
    categorySpecifications: [],
    categoryFile: String,
    createdDate: Number,
    updatedDate: Number,
    categoryLevel: String
},
    { timestamps: true }
)

categorySchema.pre('save', function (next) {
    for (let index = 0; index < this.categorySpecifications.length; index++) {
        const ele = this.categorySpecifications[index];
        for (let i = 0; i < ele.length; i++) {
            if (!this.categorySpecifications[index][i]['_id']) {
                this.categorySpecifications[index][i]['_id'] = mongoose.Types.ObjectId().toString()
            }
        }
    }
    if (this.createdAt) {
        this.createdDate = setDateTime(this.createdAt)
    }
    if (this.updatedAt) {
        this.updatedDate = setDateTime(this.updatedAt)
    }
    next()
});
autoIncrement.initialize(mongoose.connection);

categorySchema.plugin(autoIncrement.plugin, {
    model: "categories", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});


let categoryModel = mongoose.model("categories", categorySchema)
module.exports = categoryModel


/*subcategoriesview
[{
    $graphLookup: {
        from: 'categories',
        startWith: '$parentCategoryId',
        connectFromField: 'parentCategoryId',
        connectToField: '_id',
        as: 'sub-categories',
        maxDepth: 3
    }
}, {
    $project: {
        categoryDetails: 1,
        categorySpecification: 1,
        isParent: 1,
        parentCategoryId: 1,
        active: 1,
        'sub-categories': 1
    }
}]*/

// PRODUCTVARINAT OF CATEGORY
// [{
//     $lookup: {
//         from: 'products',
//         localField: '_id',
//         foreignField: 'productCategories.categoryId',
//         as: 'productList'
//     }
// }, {
//     $lookup: {
//         from: 'productvariants',
//         localField: 'productList._id',
//         foreignField: 'productId',
//         as: 'productvariantList'
//     }
// }, {
//     $project: {
//         _id: 1,
//         categoryDetails: 1,
//         'productList._id': 1,
//         'productList.productDetails': 1,
//         productvariantList: 1
//     }
// }]