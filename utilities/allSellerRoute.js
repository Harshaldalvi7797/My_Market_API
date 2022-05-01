
const ALL_SELLER_ROUTES = {

    auth_seller: require('./../website/v1/routes/seller/auth'),
    seller_mailer: require('./../website/v1/routes/seller/mailer'),
    seller_ForgetPassword: require('./../website/v1/routes/seller/forget.password'),
    questionAnswer: require('./../website/v1/routes/seller/questionAnswer'),
    common_search_seller: require('./../website/v1/routes/seller/search'),
    product_Route: require('../website/v1/routes/seller/product'),
    productVariant_Route: require('../website/v1/routes/seller/productVariant'),
    product_single_fetch: require('./../website/v1/routes/seller/product'),
    seller_order: require("./../website/v1/routes/seller/order"),
    offerPrice: require("./../website/v1/routes/seller/offerPricing"),
    offerPriceItem: require("./../website/v1/routes/seller/offerPricingItem"),
    advertisePricing: require("./../website/v1/routes/seller/advertisingPricing"),
    advertisementCampaign: require("./../website/v1/routes/seller/advertisementCampaign"),
    seller_reports: require("./../website/v1/routes/seller/reports"),
    editProfile: require("./../website/v1/routes/seller/editProfile"),
    sellerWhatToPromote: require("./../website/v1/routes/seller/whatToPromote"),
    sellerFilter: require("./../website/v1/routes/seller/filterList"),
    sellerOrderFilter: require("./../website/v1/routes/seller/orderFilterList"),
    sellerReviews: require("./../website/v1/routes/seller/review"),
    subscribeProduct: require("./../website/v1/routes/seller/subscribeProduct"),
    dashboardOverview: require("./../website/v1/routes/seller/dashboard/dashboardOverview"),
    dashboardOrder: require("./../website/v1/routes/seller/dashboard/dashboardOrder"),
    dashboardInventory: require("./../website/v1/routes/seller/dashboard/dashboardInventory"),
    dashboardPerformance: require("./../website/v1/routes/seller/dashboard/dashboardPerformance"),
    dashboardAdvertise: require("./../website/v1/routes/seller/dashboard/advertisement")
}

module.exports = ALL_SELLER_ROUTES;