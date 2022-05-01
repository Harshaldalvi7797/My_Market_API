//Third party package
const jwt = require("jsonwebtoken");
const ALL_MODELS = require("../../../utilities/allModels");

const verifyAdmin = async (req, res, next) => {

    try {
        const inputToken = req.header("Authorization");
        const token = inputToken.split(" ")[1];

        jwt.verify(token, process.env.JWT_SECRET, async (error, result) => {

            if (error) {
                return res.status(401).send({ error: 'Unauthorized Access' });
            }

            const admin = await ALL_MODELS.admin.findOne({ _id: result._id });
            if (!admin) {
                return res.status(401).send({ error: 'Invalid admin' });
            }
            req.userId = result._id;
            next();
        });

    } catch (error) {
      return res.status(401).send({ error: "Unauthorized Access" });
    }
};

module.exports = verifyAdmin;
