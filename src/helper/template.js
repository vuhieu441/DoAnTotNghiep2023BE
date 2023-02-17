const constants = require('../constants/constants');

const sendMailForTutor = (subject, body, to) => {
  return {
    from: process.env.SYSTEM_URL, // sender address
    to: to, // list of receivers
    subject: subject, // Subject line
    text: subject, // plain text body
    html: `<p>${body}</p>`, // html body
  };
};

const sendMailForCustomerServer = (to, subject, body) => {
  return {
    from: process.env.SYSTEM_URL,
    to: to,
    subject: subject,
    text: subject,
    html: `<p>${body}</p>`,
  };
};

const sendMailPassWordToCustomerServer = (to, password, subject = 'Login information') => {
  return {
    from: process.env.SYSTEM_URL,
    to: to,
    subject: subject,
    text: subject,
    html: `<p> Thông tin đăng nhập của bạn !</p>
    <p> <b>Email :</b> ${to}</p><p> <b>Password :</b> ${password}</p>`, // html body
  };
};

const sendMailForgotPassword = (code, to, subject = 'Forgot_password', returnUrl) => {
  return {
    from: process.env.SYSTEM_URL, // sender address
    to: to, // list of receivers
    subject: subject, // Subject line
    text: subject, // plain text body
    html: `<p> Bạn quên mật khẩu. Xin hãy ấn vào link dưới đây để đặt lại mật khẩu!
      <p>${returnUrl}?id=${code}</p>`, // html body
  };
};

const sendMultiMailForTypeSupport = (to, bcc, title, body, emailStudent) => {
  return {
    personalizations: [
      {
        to: to,
        bcc: bcc, // Array include object with key: email and value: email name
      },
    ],
    from: process.env.SYSTEM_URL, // sender address
    subject: `${title}`, // Subject line
    text: `${body}`, // plain text body
    html: `<b>Email của học sinh : </b> ${emailStudent}</br>
    <b>Nội dung :</b> </br> ${body}`, // html body
  };
};

const sendMultiMailForTypeResponse = (to, bcc, title, body, emailStudent) => {
  return {
    personalizations: [
      {
        to: to,
        bcc: bcc, // Array include object with key: email and value: email name
      },
    ],
    from: process.env.SYSTEM_URL, // sender address
    subject: `${title}`, // Subject line
    text: `${body}`, // plain text body
    html: `<b>Email của học sinh : </b> ${emailStudent}</br>
    <b>Nội dung :</b> </br> ${body}`, // html body
  };
};

const sendMultiMailForCustomerService = (to, title, body) => {
  return {
    personalizations: [
      {
        to: to,
      },
    ],
    from: process.env.SYSTEM_URL,
    subject: `${title}`,
    text: `${body}`,
    html: `<b>${body}</b>`,
  };
};

const sendMailCreateForTutor = (body, to, returnUrl = constants.LINK_LOGIN, subject = constants.SUBJECT_MAIL) => {
  return {
    from: process.env.SYSTEM_URL, // sender address
    to: to, // list of receivers
    subject: subject, // Subject line
    text: subject, // plain text body
    html: `<p>New Password for VietLesson4u of tutor of account : ${body}</p>
        <a href=${returnUrl}>VietLesson4u Login!</a>
    `, // html body
  };
};

const sendMailCreateForStudent = (info) => {
  const { to, subject, confirmUrl, confirmToken } = info;
  const url = `${confirmUrl}?confirmToken=${confirmToken}`;
  return {
    from: process.env.SYSTEM_URL, // sender address
    to: to, // list of receivers
    subject: subject || constants.SUBJECT_MAIL, // Subject line
    text: subject || constants.SUBJECT_MAIL, // plain text body
    html: `<p>You need comfirm by under link</p>
        <a href=${url}>VietLesson4u Comfirm!</a>
    `, // html body
  };
};

module.exports = {
  sendMailForTutor,
  sendMailForgotPassword,
  sendMultiMailForTypeSupport,
  sendMultiMailForTypeResponse,
  sendMailCreateForTutor,
  sendMailCreateForStudent,
  sendMailForCustomerServer,
  sendMultiMailForCustomerService,
  sendMailPassWordToCustomerServer,
};
