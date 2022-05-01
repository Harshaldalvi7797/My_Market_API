const path = require("path");

// Third party modules
const express = require("express");
const { body } = require("express-validator");


const router = express.Router();

// Middlewares
const verifyAdmin = require(path.join(__dirname, "..", "..", "middlewares", "verifyAdmin"));

// controllers
const { paymentReceiveDetails } = require("../../controllers/admin/reports/paymentReceiveDetails");
const { deliveryChargesMyMarket } = require("../../controllers/admin/reports/delivery_charges_report");
const { product_purchase_report, product_purchase_report_excel } = require("../../controllers/admin/reports/product_purchase_report");
const { abandoned_cart_report, abandoned_cart_report_excel } = require("../../controllers/admin/reports/abandoned_cart_report");
const { search_report, search_report_excel } = require("../../controllers/admin/reports/search_report");
const { low_stock_report, lowStockExcel } = require("../../controllers/admin/reports/low_stock_report");
const { tag_report, tag_report_excel } = require("../../controllers/admin/reports/tag_report");
const { product_review_report, product_review_report_excel } = require("../../controllers/admin/reports/product_review_report");
const { sale_report, sale_report_excel } = require("../../controllers/admin/reports/sale_report");
const { valued_customer_report, valued_customer_report_excel } = require("../../controllers/admin/reports/valued_customer_report");
const { tax_report, tax_report_excel } = require("../../controllers/admin/reports/tax_report");
const { order_sale_report, order_sale_report_excel } = require("../../controllers/admin/reports/order_sale_report");

const { coupon_usage_report, coupon_usage_report_excel } = require("../../controllers/admin/reports/coupon_usage_report");
const { most_used_offer_report, mostUsedOfferReportExcel } = require("../../controllers/admin/reports/most_used_offer_report");
const { completed_offer_report, completed_offer_pv_list, completed_offer_report_excel } = require("../../controllers/admin/reports/offer_report");
const { wallet_balance_report, wallet_balance_report_excel } = require("../../controllers/admin/reports/wallet_balance_report");
const { returned_items_comment_report, returned_items_comment_report_excel } = require("../../controllers/admin/reports/returned_items_comment_report");
const { most_viewed_products_report, mostViewProductExcel } = require("../../controllers/admin/reports/most_viewed_products_report");
const { delivery_report, delivery_report_excel } = require("../../controllers/admin/reports/delivery_report");
const { inactive_customer_report, inactive_customer_report_excel } = require("../../controllers/admin/reports/inactive_customer_report");
const { discount_details_report } = require("../../controllers/admin/reports/discount_details_report");
const { total_sales_refunded_report, total_sales_refunded_report_excel } = require("../../controllers/admin/reports/total_sales_refunded_report");
const { mmWalletReport, mmWalletReport_excel } = require("../../controllers/admin/reports/mm_wallet_report");
const detailed_monthly_report = require("../../controllers/admin/reports/detailed_monthly_report");
const detailed_yearly_report = require("../../controllers/admin/reports/detailed_yearly_report");
const { merchant_payment_report, merchant_payment_report_excel } = require("../../controllers/admin/reports/merchant_payment_report");
const { merchant_statement_invoice_report, merchant_statement_invoice_report_excel_export, merchant_statement_invoice_report_single } = require("../../controllers/admin/reports/merchant_statement_invoice_report");
const { filterSeller, filterCountry } = require("../../controllers/admin/reports/filter");

// Routes

// router.post("/admin/report/mymarket/delivery", verifyAdmin, deliveryChargesMyMarket)

router.post("/admin/report/product", verifyAdmin, product_purchase_report);
router.post("/admin/report/product/excel", verifyAdmin, product_purchase_report_excel);

router.post("/admin/report/abandoned-cart", verifyAdmin, abandoned_cart_report);
router.post("/admin/report/abandoned-cart/excel", verifyAdmin, abandoned_cart_report_excel);

router.post("/admin/report/search", verifyAdmin, search_report);
router.post("/admin/report/search/excel", verifyAdmin, search_report_excel);

router.post("/admin/report/low-stock", verifyAdmin, low_stock_report);
router.post("/admin/report/low-stock/excel", verifyAdmin, lowStockExcel);

router.post("/admin/report/tag", verifyAdmin, tag_report);
router.post("/admin/report/tag/excel", verifyAdmin, tag_report_excel);

router.post("/admin/report/product-review", verifyAdmin, product_review_report);
router.post("/admin/report/product-review/excel", verifyAdmin, product_review_report_excel);

router.post("/admin/report/sale", verifyAdmin, sale_report);
router.post("/admin/report/sale/excel", verifyAdmin, sale_report_excel);

router.post("/admin/report/detailed-monthly-report", verifyAdmin, detailed_monthly_report);
router.post("/admin/report/detailed-yearly-report", verifyAdmin, detailed_yearly_report);

router.post("/admin/report/valued-customer", verifyAdmin, valued_customer_report);
router.post("/admin/report/valued-customer/excel", verifyAdmin, valued_customer_report_excel);

router.post("/admin/report/tax", verifyAdmin, tax_report);
router.post("/admin/report/tax/excel", verifyAdmin, tax_report_excel);

router.post("/admin/report/order-sale", verifyAdmin, order_sale_report);
router.post("/admin/report/order-sale/excel", verifyAdmin, order_sale_report_excel);

router.post("/admin/report/coupon-usage", verifyAdmin, coupon_usage_report);
router.post("/admin/report/coupon-usage/excel", verifyAdmin, coupon_usage_report_excel);

router.post("/admin/report/most-used-offer", verifyAdmin, most_used_offer_report);
router.post("/admin/report/most-used-offer/excel", verifyAdmin, mostUsedOfferReportExcel);

router.post("/admin/report/completed-offer", verifyAdmin, completed_offer_report);
router.get("/admin/report/completed-offer/filters", verifyAdmin, completed_offer_pv_list);
router.post("/admin/report/completed-offer/excel", verifyAdmin, completed_offer_report_excel);

router.post("/admin/report/wallet-balance", verifyAdmin, wallet_balance_report);
router.post("/admin/report/wallet-balance/excel", verifyAdmin, wallet_balance_report_excel);

router.post("/admin/report/returned-items-comment", verifyAdmin, returned_items_comment_report);
router.post("/admin/report/returned-items-comment/excel", verifyAdmin, returned_items_comment_report_excel);

router.post("/admin/report/most-viewed-product", verifyAdmin, most_viewed_products_report);
router.post("/admin/report/most-viewed-product/excel", verifyAdmin, mostViewProductExcel);

router.post("/admin/report/delivery-report", verifyAdmin, delivery_report);
router.post("/admin/report/delivery-report/excel", verifyAdmin, delivery_report_excel);

router.post("/admin/report/inactive-customer-report", verifyAdmin, inactive_customer_report);
router.post("/admin/report/inactive-customer-report/excel", verifyAdmin, inactive_customer_report_excel);

router.post("/admin/report/merchant-payment-report", verifyAdmin, merchant_payment_report);
router.post("/admin/report/merchant-payment-report/excel", verifyAdmin, merchant_payment_report_excel);

router.post("/admin/report/merchant-invoicedetail-report", verifyAdmin, merchant_statement_invoice_report);
router.post("/admin/report/merchant-invoicedetail-report/single", verifyAdmin, merchant_statement_invoice_report_single);
router.post("/admin/report/merchant-invoicedetail-report/excel", verifyAdmin, merchant_statement_invoice_report_excel_export);


router.post("/admin/payment/receive/details", verifyAdmin, paymentReceiveDetails);

router.post("/admin/report/discount-details-report", verifyAdmin, discount_details_report);

router.post("/admin/report/total-sales-refunded-report", verifyAdmin, total_sales_refunded_report);
router.post("/admin/report/total-sales-refunded-report/excel", verifyAdmin, total_sales_refunded_report_excel);

router.post("/admin/report/mm-wallet-report", verifyAdmin, mmWalletReport);
router.post("/admin/report/mm-wallet-report/excel", verifyAdmin, mmWalletReport_excel);

router.get("/admin/report/filter/seller", verifyAdmin, filterSeller);

router.get("/admin/report/filter/country", verifyAdmin, filterCountry);

module.exports = router;