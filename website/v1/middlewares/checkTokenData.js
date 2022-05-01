//Third party package
const jwt = require('jsonwebtoken');
    
const isToken = (req, res, next) => {

    const inputToken = req.header('Authorization');
   
    if(!inputToken) {
        //const error = new Error('Token is not available');
        //error.statusCode = 422;
        //throw error;
        //return res.status(400).send({error:'Unauthorized Access'});
        req.userId = null;
        next();
    }else if(inputToken) {

        const token = inputToken.split(' ')[1];

        jwt.verify(token, process.env.JWT_SECRET, (error, result) => {

            if(error) {
                /* const error = new Error('Unauthorized');
                error.statusCode = 401;
                throw error; */
                //return res.status(400).send({error:'Unauthorized Access'});
                req.userId = null;
                next();
            }

            //console.log('result', result)
            req.userId = result._id;         
            next();
           
        });//End of Jwt method       

    }//End of else-if block 
   
};//End of function


module.exports = isToken;

