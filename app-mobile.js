//All API
const ALL_ROUTES = require('./app/utilities/allRoute');
exports.routes = (app) => {
    app.use(ALL_ROUTES.auth_route);
    app.use(ALL_ROUTES.customer_forgotPassword);
    app.use(ALL_ROUTES.brand_Route);
    app.use(ALL_ROUTES.product_customer);
    app.use(ALL_ROUTES.customer_route);
    app.use(ALL_ROUTES.customer_brand);
    app.use(ALL_ROUTES.customer_productvariant_reviews);
    app.use(ALL_ROUTES.customer_question);
    // app.use(ALL_ROUTES.common_search);
    app.use(ALL_ROUTES.policyRoute);
    app.use(ALL_ROUTES.manageAddress_Route);
    app.use(ALL_ROUTES.category_Route);
    app.use(ALL_ROUTES.customer_Cart);
    app.use(ALL_ROUTES.customer_order);
    app.use(ALL_ROUTES.newArrivalProducts);
    app.use(ALL_ROUTES.globalSearch)
    app.use(ALL_ROUTES.wishlist)
    app.use(ALL_ROUTES.currencyRateRoute)

    app.use(ALL_ROUTES.justsoldproducts);
    app.use(ALL_ROUTES.trendingProducts)
    app.use(ALL_ROUTES.recommendedProducts)
    app.use(ALL_ROUTES.saveForLetter)
    app.use(ALL_ROUTES.brandSellerFollowing)
    app.use(ALL_ROUTES.brand_seller)
    app.use(ALL_ROUTES.customer_message)
    app.use(ALL_ROUTES.contact)
    app.use(ALL_ROUTES.languageRoute);
    app.use(ALL_ROUTES.offerRoute);
    app.use(ALL_ROUTES.suggetIdea)
    app.use(ALL_ROUTES.wallet)
    app.use(ALL_ROUTES.app_notification)
    app.use(ALL_ROUTES.app_coupon)
    app.use(ALL_ROUTES.app_similarProducts)
    app.use(ALL_ROUTES.subscribeProduct)
    app.use(ALL_ROUTES.app_advertisement)
    app.use(ALL_ROUTES.app_faqs)
    app.use(ALL_ROUTES.app_notify)
    app.use(ALL_ROUTES.app_checkout)
    app.use(ALL_ROUTES.app_customer_address)
    app.use(ALL_ROUTES.app_AdClick)

    app.use(ALL_ROUTES.app_Analytics)
    // app.use(ALL_ROUTES.newsLetter)
}
