//All API
const ALL_ROUTES = require('./utilities/allSellerRoute');
exports.routes = (app) => {
    app.use(ALL_ROUTES.auth_seller);
    app.use(ALL_ROUTES.seller_mailer);
    app.use(ALL_ROUTES.seller_ForgetPassword);
    app.use(ALL_ROUTES.product_Route);
    app.use(ALL_ROUTES.productVariant_Route);
    app.use(ALL_ROUTES.seller_order)
    app.use(ALL_ROUTES.offerPrice)
    app.use(ALL_ROUTES.offerPriceItem)
    app.use(ALL_ROUTES.advertisePricing)
    app.use(ALL_ROUTES.advertisementCampaign)
    app.use(ALL_ROUTES.seller_reports);
    app.use(ALL_ROUTES.editProfile)
    app.use(ALL_ROUTES.sellerWhatToPromote)
    app.use(ALL_ROUTES.sellerFilter)
    app.use(ALL_ROUTES.sellerOrderFilter)
    app.use(ALL_ROUTES.questionAnswer)
    app.use(ALL_ROUTES.sellerReviews)
    app.use(ALL_ROUTES.subscribeProduct)
    app.use(ALL_ROUTES.dashboardOverview)
    app.use(ALL_ROUTES.dashboardOrder)
    app.use(ALL_ROUTES.dashboardInventory)
    app.use(ALL_ROUTES.dashboardPerformance)
    app.use(ALL_ROUTES.dashboardAdvertise)
}