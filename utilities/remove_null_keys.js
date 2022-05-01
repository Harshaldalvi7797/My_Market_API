const remove_null_keys = ( data ) => {

    if(typeof data !== "object" && Array.isArray(data)) throw TypeError("data must be an object");

    for (let key in data) {
        const value = data[key];

        if(!value) delete data[key];

    }
    
    return data;

}// End of remove_null_keys


module.exports = remove_null_keys;