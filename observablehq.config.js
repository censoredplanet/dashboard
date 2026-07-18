export default {
  title: "Censored Planet Dashboard",
  pages: [
    {
      name: "Dashboard",
      pages: [
        {name: "Observatory", path: "/observatory"},
        {name: "CenAlert", path: "/cenalert"},
      ]
    }
  ],
  head: '<link rel="icon" href="favicon.ico" sizes="32x32">',
  root: "src",
  style: "styles/base.css",
  footer: "Censored Planet 2026", // what to show in the footer (HTML)
  sidebar: false, // whether to show the sidebar
  toc: false, // whether to show the table of contents
  pager: false, // whether to show previous & next links in the footer
  preserveExtension: true, // keep .html in URLs
};
