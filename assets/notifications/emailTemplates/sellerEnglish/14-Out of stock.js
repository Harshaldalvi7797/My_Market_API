module.exports= (req, data)=>{
    let HOST_NAME= req.hostname=='localhost'?`http://localhost:${process.env.PORT}`:`https://${req.hostname}`;
    let Web_Link= require('../../../../checkWebLink')(req, 'seller')

    let html= `<!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <meta name="x-apple-disable-message-reformatting">
        <title></title>
        <style>
            table,
            td,
            div,
            h1,
            p {
                font-family: Arial, sans-serif;
            }
    
            .button {
                background-color: #dd9f3d;
                border: none;
                color: white;
                padding: 15px 32px;
                text-align: center;
                text-decoration: none;
                display: inline-block;
                font-size: 16px;
                margin: 4px 2px;
                cursor: pointer;
                border-radius: 6px;
                width: 35%;
            }
        </style>
    </head>
    
    <body style="margin:0;padding:0;">
        <table role="presentation"
            style="width:100%;border-collapse:collapse;border:0;border-spacing:0;background:#ffffff;">
            <tr>
                <!-- Main logo -->
                <td align="center" style="padding:0;">
                    <table role="presentation"
                        style="width:602px;border-collapse:collapse;border:1px solid #cccccc;border-spacing:0;text-align:left;">
                        <tr>
                            <td align="center" style="padding:40px 0 30px 0;">
                                <img src="${HOST_NAME}/sellerEnglishAssets/MMExports/2x/Asset_2@2x.png" alt="" width="300"
                                    style="height:auto;display:block;" />
                                <br /><br /><br /><br /><br />
                            </td>
                        </tr>
                        <!--seller logo and text -->
                        <!-- <tr>
                            <td align="center" style="padding:40px 0 30px 0;background:#8fbdb9;">
                                <img src="${HOST_NAME}/sellerEnglishAssets/MMExports/1x/Asset_16.png" alt=""
                                    style="height:auto;display:block;margin-top:-175px;width: 50%;" />
                                <p style="color: white; font-size: 40px; margin: auto;padding-top: 10px;">News<b>letter!</b>
                                </p>
                            </td>
                        </tr> -->
                        <!-- <tr>
                            <td align="center" style="padding:40px 0 0px 0;">
                                <img src="${HOST_NAME}/sellerEnglishAssets/MMExports/1x/Asset_13.png" alt=""
                                    style="height:auto;display:block;margin-top:-160px;" />
    
                            </td>
                        </tr> -->
                        <tr>
                            <td align="center">
                                <p style="color:#8fbdb9; font-size: 50px; margin: auto;">Out of stock
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td align="center">
                                <p style="border-bottom: 2px solid  #8fbdb9;width: 80%; padding-top: 5%;">
                                </p>
                            </td>
                        </tr>
    
    
                        <!-- Medial text -->
                        <tr>
                            <td style="padding:36px 30px 42px 30px;">
                                <table role="presentation"
                                    style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
                                    <tr>
                                        <td align="center" style="padding:0px 0 30px 0;">
                                            <p style="color: #BEBEBE; font-size: 18px;font-style:sans-serif;">
                                                Alert: Your Product ${data.productname} is out of stock
                                                                                    </p>
                                                <!-- Button -->
                                    <tr align="center" valign="top">
                                        <td>
                                            <a href="${Web_Link}/product/variant/${data._id}" style="text-decoration: none"><button class="button" style="width: 37%;">View Product
                                            </button></a>
                                        </td>
                                    </tr>
                                    <!-- <tr>
                                        <td align="center" style="padding:-4px 0 30px 0;">
                                            <img src="${HOST_NAME}/sellerEnglishAssets/MMExports/1x/Asset_20.png" alt="" width="200"
                                                style="height:auto;display:block;" />
    
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding:40px 0 30px 0;">
                                            <img src="${HOST_NAME}/sellerEnglishAssets/MMExports/1x/Asset 14.png" alt="" width="300"
                                                style="height:auto;display:block;" />
    
                                        </td>
                                    </tr> -->
                                    <!-- insta & site link -->
                                    <tr>
                                        <td align="center" style="padding:40px 0 30px 0;">
                                            <p style="color: #BEBEBE; font-size: 15px;font-style:sans-serif;">
                                                www.mymarketshopping.com &nbsp;<img src="${HOST_NAME}/sellerEnglishAssets/insta.png"
                                                    width="15px">&nbsp;Mymarketshopping
                                            </p>
                                            <p style="color: #BEBEBE; font-size: 12px;font-style:sans-serif;">Office 127,
                                                Avenue 44, Block 243 Arad - Kingdom of Bahrain
                                                <br> P.O. Box 50066
                                            </p>
                                        </td>
                                    </tr>
                                    <!-- play n app store logo -->
                                    <!-- <tr>
                                        <td align="center">
                                            <table role="presentation"
                                                style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
                                                <tr>
                                                    <td style="width:150px;padding:0;vertical-align:top;">
                                                        <p style="font-size:16px;line-height:24px; ">
                                                            <img src="${HOST_NAME}/sellerEnglishAssets/app_store.png" alt="" width="150"
                                                                style="height:auto;display:block ;float: right;" /></p>
                                                    </td>
                                                    <td style="width:150px;padding:0;vertical-align:top;">
                                                        <p style="font-size:16px;line-height:24px;">
                                                            <img src="${HOST_NAME}/sellerEnglishAssets/google_play.png" alt="" width="150"
                                                                style="height:auto;display:block;" /></p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr> -->
                                </table>
                            </td>
                        </tr>
    
                    </table>
                </td>
            </tr>
        </table>
    </body>
    
    </html>`
    return html;
}
