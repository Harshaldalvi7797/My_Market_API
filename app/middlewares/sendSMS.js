const request = require('request-promise');
var convert = require('xml-js');
const { writeLog } = require("./../utilities/log");

exports.sendSMS = async (req, res, next) => {

      let options = {
            method: 'GET',
            uri: '',
      }

      //Test+message+from+HTTP+API+for+My+Market
      if (req.toNumber && req.message) {
            req.message = req.message.toString().replace(/ /g, "+");
            options.uri = `https://esms.etisalcom.net:9443/smsportal/services/SpHttp/sendsms?user=mymarket&pass=AmE853@KNr&from=My+Market&to=${req.toNumber}&text=${req.message}`

            //send SMS
            request(options)
                  .then(async function (response) {
                        // console.log(response);
                        let result = convert.xml2json(response, { compact: true, spaces: 4 });
                        result = await formatJson(result);
                        // console.log("result", result)
                        writeLog("send sms", result);
                        //get sms status
                        options = {
                              method: 'GET',
                              uri: `https://esms.etisalcom.net:9443/smsportal/services/SpHttp/getdlr?user=mymarket&pass=AmE853@KNr&id=${result["ns2:SmsResponse"]['Id']}`,
                        }

                        request(options)
                              .then(async function (response1) {
                                    //console.log(response1);
                                    let result1 = convert.xml2json(response1, { compact: true, spaces: 4 });
                                    result1 = await formatJson(result1);
                                    writeLog("check sms status", result1);
                                    try {
                                          next();
                                    } catch (err) { }
                              }).catch(function (err) {
                                    writeLog("check sms status error", err.message);
                                    try {
                                          return res.status(403).send({ message: err.message });
                                    } catch (error) { }
                              })

                  }).catch(function (err) {
                        writeLog("send sms error", err.message);
                        try {
                              return res.status(403).send({ message: err.message });
                        } catch (err) { }
                  })
      } else {
            writeLog("sms api call fail", { toNumber: req.toNumber, message: req.message });
            try {
                  return res.status(403).send({ message: "sms api call fail" });
            } catch (err) { }
      }

}

const formatJson = async (result) => {
      result = JSON.parse(result);
      delete result["ns2:SmsResponse"]["_attributes"];

      let key = Object.keys(result["ns2:SmsResponse"]);
      for (let index = 0; index < key.length; index++) {
            let ele = key[index];
            delete result["ns2:SmsResponse"][ele]["_attributes"]

            if (ele.includes("ns1")) {
                  result["ns2:SmsResponse"][ele.split(":")[1]] = result["ns2:SmsResponse"][ele]['_text']
                  delete result["ns2:SmsResponse"][ele]
            } else if (ele == "Numbers") {
                  result["ns2:SmsResponse"][ele]["Number"]["To"] = result["ns2:SmsResponse"][ele]["Number"]["To"]["_text"]
                  result["ns2:SmsResponse"][ele]["Number"]["Time"] = result["ns2:SmsResponse"][ele]["Number"]["Time"]["_text"]
                  result["ns2:SmsResponse"][ele]["Number"]["Status"] = result["ns2:SmsResponse"][ele]["Number"]["Status"]["_text"]
            }
      }

      return result
}