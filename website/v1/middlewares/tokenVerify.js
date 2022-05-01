//Third party package
const jwt = require('jsonwebtoken');
    
const isToken = (req, res, next) => {
    const inputToken = req.header('Authorization');
   
    if(!inputToken) {
        //const error = new Error('Token is not available');
        //error.statusCode = 422;
        //throw error;
        return res.status(401).send({error:'Unauthorized Access'});

    }else if(inputToken) {

        const token = inputToken.split(' ')[1];

        jwt.verify(token, process.env.JWT_SECRET, (error, result) => {

            if(error) {
                return res.status(401).send({error:'Unauthorized Access'});
            }

            //console.log('result', result)
            req.userId = result._id;
            next();
           
        });//End of Jwt method

    }//End of else-if block 
   
};//End of function


module.exports = isToken;

