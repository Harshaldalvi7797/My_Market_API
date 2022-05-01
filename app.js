let express = require("express")
let app = express()
let mongoose = require("mongoose")
var path = require('path');
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var upload = require('express-fileupload')
let cors = require("cors");
const CronJobs = require('./website/v1/cron_jobs')
require("dotenv").config();
app.use(logger('dev'));
//CronJobs.refreshXMLJob()
//CronJobs.Subscription_Ending()
CronJobs.updateCurrencyRateScheduler();

// var dataModel = require("./models/country")
// parse application/x-www-form-urlencoded
// app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
// app.use(bodyParser.json())
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static('./uploads'));
app.use(express.static('./assets/notifications/emailAssets'));


app.use(upload());
app.use(cors());
//database connection
mongoose.connect(process.env.DATABASE, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log(`connected  to DB successfully`))
  .catch((error) => console.log(`something went wrong ${error.message}`));



//admin apis
let adminRoute = require("./app-admin")
adminRoute.routes(app)

//website apis
let websiteRoute = require("./app-website")
websiteRoute.routes(app)

//seller apis

let sellerRoute = require("./app-seller")
sellerRoute.routes(app)

//mobile apis
let mobileRoute = require("./app-mobile")
mobileRoute.routes(app)

//common apis
let commonRoute = require("./app-common")
commonRoute.routes(app)

//test apis DO NOT USE OR DELETE
// let dbOperation = require('./test-api') 
// dbOperation.test(app)

// app.set('view engine','ejs');
//invalid api route handling


// app.use((error, req, res, next) => {
//   //console.log(error);
//   const statusCode = error.statusCode || 500;
//   const message = error.message || error;
//   return res.status(statusCode).json({ message });
// });

/* const aramex = require('./website/v1/middlewares/aramex');
app.use("/",async (req, res) => {
  console.log("-----------aramex call-----------")
  let response = await aramex.trackShipment({});
  console.log(JSON.stringify(response));
}); */



//port connection
app.listen(process.env.PORT, () => {
  console.log(`connected to port ${process.env.PORT}`)
});
