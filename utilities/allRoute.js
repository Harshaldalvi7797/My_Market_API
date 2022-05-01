const notification = require('../models/notification');

const ALL_ROUTES = {
    website_advertise: require('./../website/v1/routes/customer/advertisement'),
    auth_route: require('./../website/v1/routes/customer/auth'),
    // auth_seller: require('./../website/v1/routes/seller/auth'),
    brand_route: require("../website/v1/routes/brand"),
    newsLetter: require('./../website/v1/routes/customer/newsLetter'),
    customer_mailer: require('./../website/v1/routes/customer/mailer'),
    customer_forgetPassword: require('./../website/v1/routes/customer/forget.password'),
    customer_brand: require('../website/v1/routes/customer/productvariant'),
    customer_productvariant_reviews: require('../website/v1/routes/customer/reviews'),
    customer_question: require('./../website/v1/routes/customer/productVariantQuestion'),
    customer_Cart: require('./../website/v1/routes/customer/cartRoute'),
    customer_suggestions: require('./../website/v1/routes/customer/suggestIdea'),
    customer_ticket: require('./../website/v1/routes/customer/ticket'),
    order: require('./../website/v1/routes/customer/order'),
    treding: require('../website/v1/routes/customer/trendingProduct'),
    justsold: require('./../website/v1/routes/customer/justSoldProduct'),
    newArrivalProducts: require('./../website/v1/routes/customer/newArrival'),
    brandWeb: require('./../website/v1/routes/customer/brand'),
    global: require('./../website/v1/routes/customer/globalSearch'),
    globalFilter: require('./../website/v1/routes/customer/globalFilter'),
    wishlist: require('./../website/v1/routes/customer/wishlist'),
    // seller_mailer: require('./../website/v1/routes/seller/mailer'),
    // seller_ForgetPassword: require('./../website/v1/routes/seller/forget.password'),
    currencyRate: require('./../website/v1/routes/customer/currencyRate'),
    // questionAnswer: require('./../website/v1/routes/seller/questionAnswer'),
    subscribeProduct: require('./../website/v1/routes/customer/subscribeProduct'),
    seller_messaging: require('./../website/v1/routes/message'),
    common_search_seller: require('./../website/v1/routes/seller/search'),

    customer_seller_following: require('./../website/v1/routes/customer/customerSellerFollowing'),
    offer_links: require('./../website/v1/routes/offerLinks'),
    recommendedproducts: require('./../website/v1/routes/customer/recommended'),
    policy_Route: require('../website/v1/routes/policy_Route'),
    // product_Route: require('../website/v1/routes/seller/product'),
    // productVariant_Route: require('../website/v1/routes/seller/productVariant'),
    product_customer: require('../website/v1/routes/customer/product'),
    // product_single_fetch: require('./../website/v1/routes/seller/product'),
    manageAddress_Route: require('../website/v1/routes/customer/manageAddress'),
    countryRoute: require('../website/v1/routes/country'),
    languageRoute: require('../website/v1/routes/language'),
    category_Route: require('./../website/v1/routes/category'),
    contactUs: require('./../website/v1/routes/customer/contactUs'),
    // seller_order: require("./../website/v1/routes/seller/order"),
    // offerPrice: require("./../website/v1/routes/seller/offerPricing"),
    // offerPriceItem: require("./../website/v1/routes/seller/offerPricingItem"),
    // advertisePricing: require("./../website/v1/routes/seller/advertisingPricing"),
    // advertisementCampaign: require("./../website/v1/routes/seller/advertisementCampaign"),
    // seller_reports: require("./../website/v1/routes/seller/reports"),

    notification: require("./../website/v1/routes/notification"),
    wallet: require("./../website/v1/routes/wallet"),
    // editProfile: require("./../website/v1/routes/seller/editProfile"),
    customerCoupon: require("./../website/v1/routes/customer/coupon"),
    // sellerWhatToPromote : require("./../website/v1/routes/seller/whatToPromote"),
    // sellerFilter : require("./../website/v1/routes/seller/filterList"),
    // sellerOrderFilter: require("./../website/v1/routes/seller/orderFilterList"),
    // sellerDashboard: require("./../website/v1/routes/seller/dashboard"),
    websiteVisitors: require("./../website/v1/routes/customer/websiteVisitors"),
    customerCheckout: require("./../website/v1/routes/customer/checkout"),
    customerAddress: require("./../website/v1/routes/customer/customerAddress"),
    webSimilarProducts: require("./../website/v1/routes/customer/similarProducts"),
    websiteCategory: require("./../website/v1/routes/customer/category"),
    website_notify: require('./../website/v1/routes/customer/notify'),
    website_AdClick: require('./../website/v1/routes/customer/advertiseAnalytics'),



}
module.exports = ALL_ROUTES;