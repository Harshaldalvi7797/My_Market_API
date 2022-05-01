//All API
const ALL_ROUTES = require('./utilities/allAdminRoute');
exports.routes = (app) => {
	app.use(ALL_ROUTES.admin_auth);
	app.use(ALL_ROUTES.admin_mailer);
	app.use(ALL_ROUTES.admin_forgetpassword);
	app.use(ALL_ROUTES.admin_dashboard);
	app.use(ALL_ROUTES.admin_order);
	app.use(ALL_ROUTES.admin_subscription);
	app.use(ALL_ROUTES.admin_search);
	app.use(ALL_ROUTES.admin_seller);
	app.use(ALL_ROUTES.admin_ticket);
	app.use(ALL_ROUTES.admin_user);
	app.use(ALL_ROUTES.admin_language);
	app.use(ALL_ROUTES.admin_product);
	app.use(ALL_ROUTES.admin_productVariant);
	app.use(ALL_ROUTES.admin_customer);
	app.use(ALL_ROUTES.admin_currency);
	app.use(ALL_ROUTES.admin_currency_decimal);

	app.use(ALL_ROUTES.admin_category);
	app.use(ALL_ROUTES.admin_cart);
	app.use(ALL_ROUTES.admin_wishlist);
	app.use(ALL_ROUTES.admin_policy);
	app.use(ALL_ROUTES.admin_suggestidea);
	app.use(ALL_ROUTES.admin_notification);
	app.use(ALL_ROUTES.admin_newsletter)
	app.use(ALL_ROUTES.admin_adminroute)
	app.use(ALL_ROUTES.admin_brand)
	app.use(ALL_ROUTES.admin_reports)
	app.use(ALL_ROUTES.admin_coupon)
	app.use(ALL_ROUTES.admin_couponItem)
	app.use(ALL_ROUTES.admin_whattopromote)
	app.use(ALL_ROUTES.admin_offerpricing)
	app.use(ALL_ROUTES.admin_offerpricingItem)
	app.use(ALL_ROUTES.admin_advertisement)
	app.use(ALL_ROUTES.admin_advertiseCharges)
	app.use(ALL_ROUTES.admin_WhatToPromoteAPI)
	app.use(ALL_ROUTES.admin_faq)
	app.use(ALL_ROUTES.admin_productReviews)
	app.use(ALL_ROUTES.admin_productQuestions)
	app.use(ALL_ROUTES.admin_customerSellerMessage)
	app.use(ALL_ROUTES.admin_settings)
	app.use(ALL_ROUTES.admin_wallet)
	app.use(ALL_ROUTES.admin_invoice)
};
