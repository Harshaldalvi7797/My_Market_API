const ALL_MODELS = {

  admin: require("./../../models/admin"),
  notifyModel: require("./../../models/notify"),
  advertiseanalyticsModel: require("./../../models/advertiseAnalytics"),

  brand: require("./../../models/brand"),
  contactModel: require("./../../models/contactUs"),

  customer: require('./../../models/customer'),
  customerNewsLetter: require('./../../models/customerNewsLetter'),
  customerAddress: require('./../../models/customerAddress'),
  category: require('./../../models/category'),
  checkoutModel: require('./../../models/checkout'),
  question: require('./../../models/productVariantQuestion'),
  wishlistModel: require('./../../models/wishlist'),
  searchModel: require('./../../models/searchModel'),
  currency: require('./../../models/currency'),
  customer_seller_follow: require('./../../models/customerSellerFollow'),
  customerSellerMessaging: require('./../../models/customerSellerMessaging'),
  language: require('./../../models/language'),


  seller: require('./../../models/seller'),
  subCategory: require('./../../models/subCategory'),

  order: require('./../../models/order'),
  // orderProduct: require('./../../models/orderProduct'),
  orderItems: require('./../../models/orderItems'),
  orderShippingNew: require('./../../models/orderShipping'),
  orderStatusUpdate: require('./../../models/orderStatusUpdate'),
  subscribeModel: require("./../../models/subscribeProduct"),


  productVarientReview: require('./../../models/productVarientReview'),
  product: require('./../../models/product'),
  detailsModel: require('./../../models/details'),

  cartModel: require('./../../models/cart'),

  productVariant: require('./../../models/productVariant'),
  suggets: require('./../../models/suggestIdea'),
  walletModel: require('./../../models/wallet'),
  notification: require('./../../models/notification'),
  offerPricingItem: require('./../../models/offerPricingItem'),
  offerPricing: require('./../../models/offerPricing'),
  couponModel: require('./../../models/coupon'),
  couponItemModel: require('./../../models/couponItem'),
  advertisementCampaign: require('./../../models/advertisementCampaign'),
  whatToPromoteModel: require('./../../models/whatToPromote'),
  advertisingPricing: require('./../../models/advertisingPricing'),
  visitorsModel: require('./../../models/visitors'),
  //log controller
  log: require('./log'),
}

module.exports = ALL_MODELS;
