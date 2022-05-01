//All API
const ALL_ROUTES = require('./utilities/allRoute');

exports.routes = (app) => {
    app.use(ALL_ROUTES.website_advertise)
    app.use(ALL_ROUTES.auth_route);
    app.use(ALL_ROUTES.brand_route);
    app.use(ALL_ROUTES.customer_mailer);
    app.use(ALL_ROUTES.newsLetter);
    app.use(ALL_ROUTES.customer_forgetPassword);
    app.use(ALL_ROUTES.common_search_seller);
    app.use(ALL_ROUTES.product_customer);
    app.use(ALL_ROUTES.customer_brand);
    app.use(ALL_ROUTES.customer_productvariant_reviews);
    app.use(ALL_ROUTES.customer_question)
    app.use(ALL_ROUTES.customer_Cart)
    app.use(ALL_ROUTES.customer_suggestions)
    app.use(ALL_ROUTES.customer_ticket)
    app.use(ALL_ROUTES.order)
    app.use(ALL_ROUTES.treding)
    app.use(ALL_ROUTES.justsold)
    app.use(ALL_ROUTES.brandWeb)
    app.use(ALL_ROUTES.currencyRate)
    app.use(ALL_ROUTES.newArrivalProducts)
    app.use(ALL_ROUTES.global)
    app.use(ALL_ROUTES.globalFilter)
    app.use(ALL_ROUTES.wishlist)
    // app.use(ALL_ROUTES.auth_seller);

    // app.use(ALL_ROUTES.seller_mailer);
    // app.use(ALL_ROUTES.seller_ForgetPassword);
    app.use(ALL_ROUTES.seller_messaging);
    // app.use(ALL_ROUTES.auth_seller);
    // app.use(ALL_ROUTES.seller_mailer);
    // app.use(ALL_ROUTES.seller_ForgetPassword);
    // app.use(ALL_ROUTES.product_single_fetch);
    app.use(ALL_ROUTES.policy_Route);
    // app.use(ALL_ROUTES.product_Route);
    // app.use(ALL_ROUTES.productVariant_Route);    
    app.use(ALL_ROUTES.customer_seller_following);
    app.use(ALL_ROUTES.offer_links);

    app.use(ALL_ROUTES.recommendedproducts)
    app.use(ALL_ROUTES.manageAddress_Route);
    // app.use(ALL_ROUTES.product_single_fetch);

    app.use(ALL_ROUTES.category_Route);
    app.use(ALL_ROUTES.countryRoute);
    app.use(ALL_ROUTES.languageRoute);
    app.use(ALL_ROUTES.contactUs);
    // app.use(ALL_ROUTES.questionAnswer)
    app.use(ALL_ROUTES.subscribeProduct)

    app.use(ALL_ROUTES.notification)
    app.use(ALL_ROUTES.wallet)

    app.use(ALL_ROUTES.customerCoupon)
    app.use(ALL_ROUTES.websiteVisitors)
    app.use(ALL_ROUTES.customerCheckout)
    app.use(ALL_ROUTES.customerAddress)
    app.use(ALL_ROUTES.webSimilarProducts)
    app.use(ALL_ROUTES.websiteCategory)
    app.use(ALL_ROUTES.website_notify)
    app.use(ALL_ROUTES.website_AdClick)
}
