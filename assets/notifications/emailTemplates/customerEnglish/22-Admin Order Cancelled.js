module.exports= (req, data)=>{
    let HOST_NAME= req.hostname=='localhost'?`http://localhost:${process.env.PORT}`:`https://${req.hostname}`;
    let Web_Link= require('../../../../checkWebLink')(req, 'customer')

    var orderItems= ``
    var index= 1
    var subTotal= 0
    var Shipping= data.shippingPrice
    var discount= 0
    for(let item of data.orderItemList){
        orderItems+=`<tr>
            <td
                style="background-color:#8fbdb9;color:#ffffff;width:6%; text-align: center;">
                ${index}</td>
            <td style="width: 25%; text-align: left;padding-left: 10px;">
                <p> ${item.productVariantDetails[0].productVariantName}<br><span style="font-size: 12px;">Sold by:${data.sellername}</span></p>
            </td>
            <td style="width: 15%;"><img src="${item.productVariantImages[0].path}" height=50 width=50></td>
            <td style="width: 10%;">${item.quantity}</td>
            <td style="width: 12%;">${item.retailPrice}</td>
            <td style="width: 12%;">${item.grandTotal}</td>
        </tr>` 
        subTotal+= item.grandTotal
        discount+= item.offerDiscount?item.offerDiscount:0
        index+=1
    }
    var total= subTotal + Shipping - discount

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
                                 <br /><br /><br />
                             </td>
                         </tr>
                         <!--seller logo and text -->
     
                         <tr>
                             <td align="center">
                                 <p style="color:#8fbdb9; font-size: 30px; margin: auto;">
                                     Your Order ${data.ordernumber} has been cancelled
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
                             <td align="center">
                                 <table 
                                 style="width:80%;border-collapse:collapse;border:0;margin-bottom: -2px;border-spacing:0;">
                                     <tr>
                                         <td align="left">
                                             <p style="color: #8fbdb9; font-size: 18px;font-style:sans-serif;">
                                                <b>Hi ${data.customername}</b> 
                                             </p>
                                         </td>
                                     </tr>
                                     <tr>
                                         <td align="center" >
                                             <p style="color: #BEBEBE; font-size: 18px;font-style:sans-serif;">
                                                 We are writing to let you know that your order has been cancelled by Admin. In most cases, payments are done prior to delivery, so you will not be charged for the items that are canceled.
                                             </p>
                                         </td>
                                     </tr>
                                     <tr>
                                         <td align="left">
                                             <p style="color: #BEBEBE; font-size: 18px;font-style:sans-serif;">
                                              <b style="color: #8fbdb9; font-size: 18px;font-style:sans-serif;">Date of Order:</b> <br>
                                              ${data.order.createdAt.toLocaleString()}
                                             </p>
                                         </td>
                                     </tr>
                                     <tr>
                                         <td align="left" >
                                             <p style="color: #BEBEBE; font-size: 18px;font-style:sans-serif;">
                                              <b style="color: #8fbdb9; font-size: 18px;font-style:sans-serif;">Reason of Cancellation:</b> <br>
                                             ${data.CancellationReason}
                                             </p>
                                         </td>
                                     </tr>
                                 </table>
                             </td>
                         </tr>
                         <tr>
                             <td align="center">
                                 <h3 align="left"
                                     style="color:#8fbdb9;font-size:20px;line-height:24px;margin-left: 70px;margin-bottom: -10px;">
                                     Order Details</h3>
                                 <br>
                                 <table
                                     style="width:80%;border-collapse:collapse;border:0;margin-bottom: -2px;border-spacing:0;color:#8fbdb9;background-color:#F9F8F6; border-top-right-radius: 15px;border-top-left-radius:15px;">
                                     <thead>
                                         <tr style="border-bottom: 1px solid  #8fbdb9;width: 80%;">
                                             <th
                                                 style="background-color: #8fbdb9; color: #ffffff; width: 6%; border-top-left-radius: 15px;">
                                                 <p>No</p>
                                             </th>
                                             <th style="width: 25%;text-align: left;padding-left: 10px;">Item Description
                                             </th>
                                             <th style="width: 15%;">Image</th>
                                             <th style="width: 10%;">QTY</th>
                                             <th style="width: 12%;">Price</th>
                                             <th style="width: 12%;">Total</th>
                                         </tr>
     
                                     </thead>
     
                                     <tbody align="center">
                                       ${orderItems}
                                     </tbody>
                                 </table>
                             </td>
                         </tr>
                         <tr>
                             <td align="center">
                                 <table
                                     style="width:80%;border-collapse:collapse;border:0;border-spacing:0;color:#8fbdb9;background-color:#F9F8F6;border-bottom-left-radius:15px; border-bottom-right-radius: 15px;">
                                     <tr>
                                         <td style="background-color:#8fbdb9;color:#ffffff;width:6%; text-align: center;">
                                         </td>
                                         <td align="left" style="width:34%;">
                                         </td>
                                         <td align="left" style="width:20%;padding:0;vertical-align:top; line-height: 30px;">
                                             Sub Total
                                         </td>
                                         <td align="right"
                                             style="width:20%;padding:0;vertical-align:top; line-height: 30px; padding-right: 10px;">
                                             BHD ${subTotal.toFixed(3)}
                                         </td>
                                     </tr>
                                     <tr>
                                         <td style="background-color:#8fbdb9;color:#ffffff;width:6%; text-align: center;">
                                         </td>
                                         <td align="left" style="width:34%;">
                                         </td>
                                         <td align="left" style="width:20%;padding:0;vertical-align:top; line-height: 30px;">
                                             Tax
                                         </td>
                                         <td align="right"
                                             style="width:20%;padding:0;vertical-align:top; line-height: 30px; padding-right: 10px;">
                                             0%
                                         </td>
                                     </tr>
                                     <tr>
                                         <td style="background-color:#8fbdb9;color:#ffffff;width:6%; text-align: center;">
                                         </td>
                                         <td align="left" style="width:34%;">
                                         </td>
                                         <td align="left" style="width:20%;padding:0;vertical-align:top; line-height: 30px;">
                                             Shipping
                                         </td>
                                         <td align="right"
                                             style="width:20%;padding:0;vertical-align:top; line-height: 30px; padding-right: 10px;">
                                             BHD ${Shipping.toFixed(3)}
                                         </td>
                                     </tr>
                                     <tr>
                                         <td style="background-color:#8fbdb9;color:#ffffff;width:6%; text-align: center;">
                                         </td>
                                         <td align="left" style="width:34%;">
                                         </td>
                                         <td align="left"
                                             style="width:20%;padding:0;vertical-align:top; line-height: 30px;border-bottom: 1px solid  #8fbdb9;">
                                             Discount
                                         </td>
                                         <td align="right"
                                             style="width:20%;padding:0;vertical-align:top; line-height: 30px; padding-right: 10px;border-bottom: 1px solid  #8fbdb9;">
                                             BHD ${discount.toFixed(3)}
                                         </td>
     
                                     </tr>
     
                                     <tr>
     
                                         <td
                                             style="background-color:#8fbdb9;color:#ffffff;width:6%; text-align: center; border-bottom-left-radius:15px;">
                                         </td>
                                         <td align="left" style="width:34%;">
                                         </td>
                                         <td align="left" style="width:20%;padding:0;vertical-align:top; line-height: 30px;">
                                             Total
                                         </td>
                                         <td align="right"
                                             style="width:20%;padding:0;vertical-align:top; line-height: 30px; padding-right: 10px;">
                                             BHD ${total.toFixed(3)}
                                         </td>
                                     </tr>
     
     
     
                                 </table>
                             </td>
                         </tr>
                         <tr>
                             <td style="padding:36px 30px 42px 30px;">
                                 <table role="presentation"
                                     style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
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
