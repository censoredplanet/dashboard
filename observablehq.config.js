// See https://observablehq.com/framework/config for documentation.
export default {
  // The app’s title; used in the sidebar and webpage titles.
  title: "Censored Planet Dashboard",

  // The pages and sections in the sidebar. If you don’t specify this option,
  // all pages will be listed in alphabetical order. Listing pages explicitly
  // lets you organize them into sections and have unlisted pages.
  // pages: [
  //   {
  //     name: "Examples",
  //     pages: [
  //       {name: "Dashboard", path: "/example-dashboard"},
  //       {name: "Report", path: "/example-report"}
  //     ]
  //   }
  // ],

  // Content to add to the head of the page, e.g. for a favicon:
  // head: '<link rel="icon" href="observable.png" type="image/png" sizes="32x32">',
  head: '<link rel="icon" href="favicon.ico" sizes="32x32">',

  // The path to the source root.
  root: "src",

  footer: "Censored Planet 2025", // what to show in the footer (HTML)
  sidebar: false, // whether to show the sidebar
  toc: false, // whether to show the table of contents
  pager: false, // whether to show previous & next links in the footer
  theme: "light",

  // Some additional configuration options and their defaults:
  // theme: "default", // try "light", "dark", "slate", etc.
  // header: "Censored Planet Dashboard", // what to show in the header (HTML)
  // footer: "Built with Observable.", // what to show in the footer (HTML)
  sidebar: false, // whether to show the sidebar
  // toc: true, // whether to show the table of contents
  pager: true, // whether to show previous & next links in the footer
  //output: "/home/agix/dist-test", // path to the output root for build
  // search: true, // activate search
  // linkify: true, // convert URLs in Markdown to links
  // typographer: false, // smart quotes and other typographic improvements
  preserveExtension: true, // drop .html from URLs
  // preserveIndex: false, // drop /index from URLs
};
