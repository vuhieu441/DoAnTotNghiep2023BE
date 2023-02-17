const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const templateColumnCertificates = (cer) => {
  return `
    <div class="exp_content-child">
    <div class="exp_content-child-content" style=>
    <div style="position: absolute; center: 0;left: 0;">
        <img src=${cer.cerUrl} style="padding-left:0%;border-radius: 5px;;" width="100" height="110" />
    </div>
    <h3>${cer.name}</h3>
    <h6 style="font-style: italic; padding-bottom: 16px;">${cer.start}  đến ${cer.end}</h4>
    <h5>
         ${cer.description}
    </h5>
    </div>
    </div>
  `;
};

const template = (data) => {
  let tableCer = '<p></p>';

  if (data && data.certificates) {
    data.certificates.forEach((cer) => {
      tableCer + templateColumnCertificates(cer);
    });
  }

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <!-- <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300&display=swap" rel="stylesheet"> -->
    <style>
        body{
        letter-spacing: 1.4;
        width: 100%;
        margin: 0 auto;
        /* border: 1px solid black; */
        /* font-family: 'Montserrat', sans-serif ; */
        }
        h1,h2,h4 ,h3,h5,h6{
        margin: 0;
        text-align:start;
        letter-spacing: 1.4;
        }
        .width-120{
        width: 120px;
        }
    
        .header{
        background-color:#fff ;
        width: 100%;
        height: 320px;
        
        padding:0 50px 0 50px;
        box-sizing: border-box;
        position: relative;
        }
        .header_background{
        position: absolute;
        width: 100%;
        height: 150px;
        left: 0;
        top: 0;
        /* background-image: linear-gradient(#ff8961, #fff); */
        }
        .header_nav-avatar{
        width:100px;height:100px;
        border:4px solid #fff;
        }
        .start{
        text-align: start;
        }
        .fs16{
        font-size:16px
        }
        .fs10{
        font-size:10px
        }

        .fs12{
        font-size:12px;
        
        }
        .body,.exp{
        background-color: #fff ;
        padding: 0 50px;
        border-bottom: 1px solid #000;
        }
        .body_info-desc tr{
        display: block;
        width: 100%;
        box-sizing: border-box;
        padding-bottom: 8px;
        }
        .exp{
        padding-top:30px
        }
    </style>
    </head>
    <body>

    <div class="header">
        <div style="position: absolute;z-index: 2;top: 20px;font-weight:800;font-size: 16px;width: 100%;">
        <img src="https://www.greenify.com.vn/static/media/greenify-menu.8064e2ac.svg" style="padding-left:38%;" width="100" height="30" />
        <div style="width: 170px">
            <p  class="start" style="font-size: 20px;border-bottom: 2px solid black;">Thông tin giáo viên</p>
        </div>
        </div>
        
        <div class="header_background"></div>
        <table  style="padding-top:90px ;width: 100%;z-index: 1;position: absolute;text-align:start; margin-bottom: 40px;">
        <tr>
            <th style="text-align:start ;width: 12%">
            <div class="header_nav-avatar" style="width:120px;height:120px ;text-align:start">
                <img style="text-align:start" src=${data.avatarUrl} width="120" height="120" />
            </div>
            </th>
            <th style="text-align:start ;width: 15%;box-sizing: border-box;">
            <div style="height:140px">
                <p class="start" style="padding-bottom: 15px; font-weight: 1000;font-size: 22px;">${data.firstName} ${data.lastName}</p>
                <div style="font-size: 10px ;text-align:start">
                <img src="https://vietlesson4u.com/static/media/subjectIcon.1313f63c.svg" alt="" width="20" height="20">
                ${data.nationality}
                </div>
                <div style="font-size: 10px;text-align:start">
                <img src="	https://vietlesson4u.com/static/media/genderIcon.27caa4bc.svg" alt="" width="20" height="20">
                ${data.gender}
                </div>
            </div>
            </th>
            <th style="width: 32%;box-sizing: border-box;height:140px">
            <table style="width: 100%;">
                <tr style="width: 100%">
                <th class="start fs12" style="width: 28%;">
                    <p class="start fs12">Ngày sinh</p>
                    <p class="start fs12" style="border-bottom: 1px solid #ccc;font-style: italic;">${data.dob}</p>
                </th>
                <th style="width:7%"></th>
                <th class="start fs12">
                    <p class="start fs12">Số điện thoại</p>
                    <p class="start fs12" style="border-bottom: 1px solid #ccc;font-style: italic;">${data.phoneNumber}</p>
                </th>
                <th style="width:30%"></th>
                </tr>
            </table>
            
            <div style="padding-right:30%">
                <p class="start fs12">Email</p>
                <p class="start fs12" style="border-bottom: 1px solid #ccc;font-style: italic;">${data.email}</p>  
                </div>
            </th>
        </tr>
        </table>
        <div style="position: absolute;z-index: 2;bottom: 0;font-weight:800;font-size: 16px;width: 100%;height: 80px;">
        <p class="start" style="width: 100px;font-size: 20px;border-bottom: 2px solid black;"> Giới thiệu</p>
        <p class="start fs12" style="width: 90%;height: auto;">${data.description}</p>
        </div>
    </div>
    
    
    <!--  -->
    <div style="padding-top: 20px;width:87%;height: 200px;margin: 0 auto;">
        <p class="start" style="width: 100px;font-size: 20px;font-weight:800;padding-top: 30px;border-bottom: 2px solid black;"> Thống kê</p>

        <table style=" width: 100% ;height: 110px; border-collapse: collapse;outline: 0;" border="2px">
            <tr style="height:40px">
            <th style="width:20%">Tổng thời gian</th>
            <th style="width:20%">Tổng thu nhập</th>
            <th style="width:20%">Khóa cố định</th>
            <th style="width:20%">Lớp linh hoạt</th>
            <th style="width:20%">Tổng số học sinh</th>

            </tr>
            <tr style="color: rgb(80, 80, 76);">
            <th>${data.totalTime}</th>
            <th>${data.totalPrice}</th>
            <th>${data.sizeCourse}</th>
            <th>${data.sizeFlex}</th>
            <th>${data.sizeStudents}</th>
            </tr>

        </table>
    </div>
    <div class="exp" style="margin-top:60px;padding-top: 0px;">
    <p class="start" style="font-size: 20px;font-weight:800;width: 100px;border-bottom: 2px solid black;"> Chứng chỉ </p>
    ${tableCer}
    </div>

    <style>
        .exp{
        padding-bottom: 20px
        }
        .exp_content-child{
        box-sizing: border-box;
        /* border: 1px solid rgba(0,0,0,0.009); */
        margin-left: 0px;
        /* border-left: 1px solid rgba(28, 177, 28, 0.9); */
        margin-top: 40px;
        /* box-shadow: 1px 1px rgba(150, 140, 145, 0.2); */
        position: relative;
        }
        .exp_content-child-content{
        padding :0 0 16px 200px;
        height:100px
        }
        .exp_content-child-content:first-child{
        padding-bottom: 12px;
        }
    </style>
    </body>

    </html>`;
};
///
const pdfPuppeteer = async (html = '') => {
  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html);
    const pdfBuffer = await page.pdf();
    await page.close();
    return pdfBuffer;
  } catch (e) {
    return false;
  } finally {
    await browser.close();
  }
};

const createHtml = (data) => {
  const html = template(data);
  return html;
};

module.exports = { createHtml, pdfPuppeteer };
