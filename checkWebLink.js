const getWebLink= (req, user)=>{
    if(user == 'customer'){
        if (req.headers.host == "api.mymrkt.work") {
            return process.env.UAT_WEBSITE
        } else {
           return process.env.DEV_WEBSITE
        }
    }
    else if(user == 'seller'){
        if (req.headers.host == "api.mymrkt.work") {
            return process.env.UAT_SELLER
        } else {
           return process.env.DEV_SELLER
        }
    }
    else if(user == 'admin'){
        if (req.headers.host == "api.mymrkt.work") {
            return process.env.UAT_ADMIN
        } else {
           return process.env.DEV_ADMIN
        }
    }
}

module.exports= getWebLink