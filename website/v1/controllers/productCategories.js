const productCategory = require('../model/productCategories');
const getProduct = async (req, res) => {
   try {
      const showProduct = await productCategory.find({});
      return res.send(showProduct);
   } catch (e) {
      return res.status(400).send(e);
   }
}

//find a particular data by id
const ParticularProduct = async (req, res) => {
   try {
      const _id = req.params.id;
      const ParticularData = await productCategory.findById(_id);
      return res.send(ParticularData);
   } catch (e) {
      return res.status(400).send(e);

   }
}
module.exports = {
   getProduct, ParticularProduct
}