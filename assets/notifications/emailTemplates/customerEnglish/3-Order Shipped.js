module.exports = (req, data) => {
    let HOST_NAME = req.hostname == 'localhost' ? `http://localhost:${process.env.PORT}` : `https://${req.hostname}`;
    let Web_Link = require('../../../../checkWebLink')(req, 'customer')

    let estimated_arival = new Date(data.shippingStatus.createdAt)
    estimated_arival.setDate(estimated_arival.getDate() + 3)

    let totalAmount = (data.shippingPrice) ? data.shippingPrice : 0;
    for (let i = 0; i < data.orderItems.length; i++) {
        let ele = data.orderItems[i]
        totalAmount += parseFloat(ele.grandTotal.toString())
    }

    let html = `<!DOCTYPE html>
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
                                <img src="${HOST_NAME}/customerEnglishAssets/MMExports/2x/Asset_2@2x.png" alt="" width="300"
                                    style="height:auto;display:block;" />
                                <br /><br /><br /><br /><br /><br /><br /><br /><br />
                            </td>
                        </tr>
                        <tr>
                            <td align="center" style="padding:40px 0 30px 0;background:#8fbdb9;">
                                <img src="${HOST_NAME}/customerEnglishAssets/MMExports/1x/Asset_5.png" alt=""
                                    style="height:auto;display:block;margin-top:-175px;width: 50%;" />
                                <p style="color: white; font-size: 40px; margin: auto;padding-top: 10px;">Order <b>Updates!</b>
                                </p>
                            </td>
                        </tr>
                        <!--seller logo and text -->
    
                        <tr>
                            
                            <td align="center">
                                <br /> <p style="color:#8fbdb9; font-size: 30px; margin: auto;">
                                    Your order has been shipped
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td align="center">
                                <p style="border-bottom: 2px solid  #8fbdb9;width: 90%; padding-top: 5%;">
                                </p>
                            </td>
                        </tr>
    
    
                        <!-- Medial text -->
                        <tr>
                            <td align="center">
                                <table role="presentation"
                                    style="width:100%;border-collapse:collapse;border:0;border-spacing:0;color:#8fbdb9;">
                                    <tr>
                                        <td style="width:50%;padding:0;vertical-align:top;">
                                            <p
                                                style="font-size:20px;line-height:24px;margin-left: 70px;margin-bottom: 0px; ">
                                                <b>Order No.#${data.ordernumber}</b> </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td align="center">
                                <table role="presentation"
                                    style="width:80%;border-collapse:collapse;border:0;border-spacing:0;color:#8fbdb9;background-color:#F9F8F6; border-radius: 15px;">
                                    <tr>
                                        <td align="left" style="width:40%;padding:0;vertical-align:top;">
                                            <p style="font-size:16px;margin-left: 10px;line-height:24px; ">
                                              Customer ID. ${data.customernumber}<br><br><br>Seller Address:<br>${data.SellerAddress}
                                        </td>
                                        <td align="right" style="width:40%;padding:0;vertical-align:top;">
                                            <p style="font-size:16px;line-height:24px;margin-right: 15px;">
                                               Date/Time of order:<br>${data.orderId.createdAt.toLocaleString()}
                                                 </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td align="center">
                                <table role="presentation"
                                    style="width:100%;border-collapse:collapse;border:0;border-spacing:0;color:#8fbdb9;">
                                    <tr>
                                        <td style="width:50%;padding:0;vertical-align:top;">
                                            <p
                                                style="font-size:20px;line-height:24px;margin-left: 70px;margin-bottom: 0px; ">
                                                <b>Order No.${data.ordernumber}</b> </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td align="center">
                                <table role="presentation"
                                    style="width:80%;border-collapse:collapse;border:0;border-spacing:0;color:#8fbdb9;background-color:#F9F8F6; border-radius: 15px;">
                                    <tr>
                                        <td align="left" style="width:40%;padding:0;vertical-align:top;">
                                            <p style="font-size:16px;margin-left: 10px;line-height:24px;">
                                                Shipped By:<br><img src="${HOST_NAME}/customerEnglishAssets/MMExports/2x/Asset_logo_1@2x.png" width="40%"><br><br>Shipped to:<br>${data.customername}<br>
                                                Customer Address:<br>${data.ShippindAddress}<br>Order Total Amount:<br><br>BHD ${totalAmount.toFixed(2)}
                                            </p>
                                        </td>
                                        <td align="right" style="width:40%;padding:0;vertical-align:top;">
                                            <p style="font-size:16px;line-height:24px;margin-right: 15px;">
                                             Estimated Arrival:<br>${estimated_arival.toLocaleString()}<br><br>Payment Type:<br>${data.orderId.paymentMethod} 
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:36px 30px 42px 30px;">
                                <table role="presentation"
                                    style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
                                    <!-- Button -->
                                    <tr>
                                        <td align="center">
                                            <table role="presentation" style="width:80%;border-collapse:collapse;">
                                                <tr>
                                                    <td style="width:40%;">
                                                        <a href="${Web_Link}/order-track" style="text-decoration: none"><button class="button" style="margin-left: 40px;width: 80%;">
                                                           Track Order</button></a>
    
                                                    </td>
                                                    <td style="width:40%;">
                                                    <a href="${Web_Link}/order-live" style="text-decoration: none"><button class="button"
                                                            style="width: 80%; margin-left: 20px;">View Order</button></a>
    
                                                    </td>
    
                                                </tr>
                                            
    
                                            </table>
                                        </td>
                                    </tr>
    
                                    <!-- insta & site link -->
                                    <tr>
                                        <td align="center" style="padding:20px 0 30px 0;">
                                            <p style="color: #BEBEBE; font-size: 15px;font-style:sans-serif;">
                                                www.mymarketshopping.com &nbsp;<img src="${HOST_NAME}/customerEnglishAssets/insta.png"
                                                    width="15px">&nbsp;Mymarketshopping
                                            </p>
                                            <p style="color: #BEBEBE; font-size: 12px;font-style:sans-serif;">Office 127,
                                                Avenue 44, Block 243 Arad - Kingdom of Bahrain
                                                <br> P.O. Box 50066
                                            </p>
                                        </td>
                                    </tr>
                                    <!-- play n app store logo -->
                                    <tr>
                                        <td align="center">
                                            <table role="presentation"
                                                style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
                                                <tr>
                                                    <td style="width:150px;padding:0;vertical-align:top;">
                                                        <p style="font-size:16px;line-height:24px; ">
                                                            <img src="${HOST_NAME}/customerEnglishAssets/app_store.png" alt="" width="150"
                                                                style="height:auto;display:block ;float: right;" /></p>
                                                    </td>
                                                    <td style="width:150px;padding:0;vertical-align:top;">
                                                        <p style="font-size:16px;line-height:24px;">
                                                            <img src="${HOST_NAME}/customerEnglishAssets/google_play.png" alt="" width="150"
                                                                style="height:auto;display:block;" /></p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
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
