const yargs = require("yargs");

module.exports = function args(params) {
  return yargs
    .alias("h", "help")
    .option("a", {
      alias: "area",
      demand: true,
      describe: "地区编号"
    })
    .option("g", {
      alias: "good",
      demand: true,
      describe: "商品编号"
    })
    .usage("食用方式: yarn start -a 地区编号 -g 商品编号")
    .example("node index.js -a 2_2830_51810_0 -g 5008395")
    .locale("zh_CN").argv;
};