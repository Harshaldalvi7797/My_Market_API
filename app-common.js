//All API
const ALL_ROUTES = require('./utilities/allCommonRoute');
exports.routes = (app) => {
    app.use(ALL_ROUTES.common_fetch_cities);
    // app.use(ALL_ROUTES.newsLetter)
}
