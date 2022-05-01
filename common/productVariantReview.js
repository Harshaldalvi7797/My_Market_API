let productVarientReview = require('../models/productVarientReview');
//Add key/value pair to returned mongoose object
exports.getAverageRating = async (_id) => {
    let ratePromise = async () => {
        return new Promise(async (resolve, reject) => {
            let allReview = await productVarientReview.find({ productVariantId: _id });
            if (allReview.length > 0) {
                let total = 0;
                for (let index = 0; index < allReview.length; index++) {
                    total = total + allReview[index]['rating'];
                    if (index == allReview.length - 1) {
                        let a = total / allReview.length
                        resolve({ averageRate: a, totalReview: allReview.length });
                    }
                }

                /*  allReview.map((el, i) => {
                     
                 }); */
            } else {
                resolve({ averageRate: null, totalReview: allReview.length });
            }
        });
    }

    let a = await ratePromise()
    return { averageRate: a.averageRate, totalReview: a.totalReview }
}

exports.getRating = async (dataArray, temp, isProductVariantId = false) => {
    return new Promise(async (resolve, reject) => {
        if (!isProductVariantId) {
            for (let index = 0; index < dataArray.length; index++) {
                let rating = await this.getAverageRating(dataArray[index]['_id']);
                dataArray[index]['rating'] = JSON.parse(JSON.stringify(rating));
                temp.push(dataArray[index]);

                if (index == (dataArray.length - 1)) {
                    resolve(true);
                }
            }
            /* dataArray.map(async (el, index) => {
               
            }); */
        } else if (isProductVariantId) {
            for (let index = 0; index < dataArray.length; index++) {
                let rating = await this.getAverageRating(dataArray[index]['productVariantId']['_id']);
                dataArray[index]['productVariantId']['rating'] = JSON.parse(JSON.stringify(rating));
                temp.push(dataArray[index]);

                if (index == (dataArray.length - 1)) {
                    resolve(true);
                }
            }

            /* dataArray.map(async (el, index) => {
               
            }); */
        }
    });
}

