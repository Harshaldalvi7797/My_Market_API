const path = require("path");

// Third party modules
const express = require("express");
const { body } = require("express-validator");


const router = express.Router();

// Middlewares
const tokenVerify = require(path.join(__dirname, "..", "..", "middlewares", "tokenVerify"));

// controllers
const { product_purchase_report, product_purchase_report_excel } = require('./../../controllers/seller/reports/product_purchase_report');
const { low_stock_report, low_stock_report_excel } = require("./../../controllers/seller/reports/low_stock_report");
const { customer_purchased_report, customer_purchased_report_excel } = require("./../../controllers/seller/reports/customer_purchased_report");
const { sales_report, sales_report_excel } = require("../../controllers/seller/reports/sales_report");
const { delivery_report, delivery_report_excel } = require("../../controllers/seller/reports/delivery_report");
const { most_viewed_report, most_viewed_report_excel } = require("../../controllers/seller/reports/most_viewed_report");
const { shipping_update_report, shipping_update_report_excel } = require("../../controllers/seller/reports/shipping_update_report");
const { tax_report, tax_report_excel } = require("../../controllers/seller/reports/tax_report");
const { total_sales_refunded_report, total_sales_refunded_report_excel } = require("../../controllers/seller/reports/total_sales_refunded_report");
const { returned_product_report, returned_product_report_excel } = require("../../controllers/seller/reports/returned_product_report");
const { delivery_charges_report, delivery_charges_report_excel } = require("../../controllers/seller/reports/delivery_charges_report");
const { completed_offer_report, completed_offer_report_excel, product_variant_list } = require("../../controllers/seller/reports/offer_report");
const { filterSeller, filterCountry } = require("../../controllers/seller/reports/filter");


const { merchantStatementReport } = require("../../controllers/seller/reports/merchant_statement_report");


router.post("/seller/merchant/statement/report", tokenVerify, merchantStatementReport)

// Routes
router.post("/seller/report/product", tokenVerify, product_purchase_report);
router.post("/seller/report/product/excel", tokenVerify, product_purchase_report_excel);

router.post("/seller/report/low-stock", tokenVerify, low_stock_report);
router.post("/seller/report/low-stock/excel", tokenVerify, low_stock_report_excel);

router.post("/seller/report/customer-purchased", tokenVerify, customer_purchased_report);
router.post("/seller/report/customer-purchased/excel", tokenVerify, customer_purchased_report_excel);

router.post("/seller/report/sales", tokenVerify, sales_report);
router.post("/seller/report/sales/excel", tokenVerify, sales_report_excel);

router.post("/seller/report/delivery", tokenVerify, delivery_report);
router.post("/seller/report/delivery/excel", tokenVerify, delivery_report_excel);

router.post("/seller/report/mostviewed", tokenVerify, most_viewed_report);
router.post("/seller/report/mostviewed/excel", tokenVerify, most_viewed_report_excel);

router.post("/seller/report/shippingupdate", tokenVerify, shipping_update_report);
router.post("/seller/report/shippingupdate/excel", tokenVerify, shipping_update_report_excel);

router.post("/seller/report/tax", tokenVerify, tax_report);
router.post("/seller/report/tax/excel", tokenVerify, tax_report_excel);

router.post("/seller/report/totalsalesrefund", tokenVerify, total_sales_refunded_report);
router.post("/seller/report/totalsalesrefund/excel", tokenVerify, total_sales_refunded_report_excel);

router.post("/seller/report/returnedproduct", tokenVerify, returned_product_report);
router.post("/seller/report/returnedproduct/excel", tokenVerify, returned_product_report_excel);

router.post("/seller/report/deliverycharges", tokenVerify, delivery_charges_report);
router.post("/seller/report/deliverycharges/excel", tokenVerify, delivery_charges_report_excel);

router.post("/seller/report/completedoffer", tokenVerify, completed_offer_report);
router.post("/seller/report/completedoffer/excel", tokenVerify, completed_offer_report_excel);
router.get("/seller/report/completedoffer/productvariant", tokenVerify, product_variant_list);

router.get("/seller/report/filter/seller", tokenVerify, filterSeller);
router.get("/seller/report/filter/country", tokenVerify, filterCountry);

module.exports = router;