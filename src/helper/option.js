module.exports = {
  formate: 'A3',
  orientation: 'portrait',
  // border: "2mm",
  // header: {
  //   height: "15mm",
  //   contents: `<div display="flex" justify-content="center" width="200px" margin-right = "200px">
  //     <h4 style=" color: Green;font-size:20;font-weight:800;text-align:center;">Greenify</h4>
  //   </div>`,
  // },
  footer: {
    // height: "20mm",
    contents: {
      // first: "Trang 1",
      // 2: "Trang 2",
      default:
        // '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>',
        '<span style="color: #000;padding:20px">Trang {{page}}</span>',
      // last: 'Last Page',
    },
  },
};
