const puppeteer = require("puppeteer");
const axios = require('axios')
const fs = require('fs')
const opn = require("opn");
const request = require('request')
const cheerio = require('cheerio')
const iconv = require("iconv-lite");

const defaultInfo = {
    header:{
        "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36",
        "Content-Type": "text/plain;charset=utf-8",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.6,en;q=0.4,en-US;q=0.2",
        Connection: "keep-alive"
    },
    qrUrl: "https://qr.m.jd.com/show",
    scanUrl: "https://qr.m.jd.com/check",
    loginUrl: "https://passport.jd.com/uc/qrCodeTicketValidation",
    cookies: null,
    cookieData: null,
    ticket: "",
    token: "",
    uuid: "",
    eid: "",
    fp: ""
}


function sleep(ms) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, ms);
    });
}


function cookieParser(cookies){
    const result = {}
    cookies.forEach(cookie => {
        const temp = cookie.split(";")
        temp.forEach(val => {
            const flag = val.split("=")
            result[flag[0]] = flag.length === 1 ? "" : flag[1];
        })
    })
    return result;
}


function writeAndOpenFile(fileName, file) {
    return new Promise((resolve, reject) => {
      fs.writeFile(fileName, file, "binary", err => {
        if (err) {
          return reject(err);
        }
        opn(fileName);
        resolve();
      });
    });
  }


function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}





// 扫码逻辑
async function requestScan() {
    console.log("开始读取扫码信息")
    const result = await axios({
        method: "get",
        url: defaultInfo.qrUrl,
        headers: defaultInfo.header,
        params: {
        appid: 133,
        size: 147,
        t: Date.now()
      },
      responseType: "arraybuffer"
    });
    console.log(result.headers)
    defaultInfo.cookies = cookieParser(result.headers["set-cookie"])
    defaultInfo.cookieData = result.headers["set-cookie"];
    const image_file = result.data;
    await writeAndOpenFile("qr.png", image_file);
}

async function listenScan() {
    try{
        let flag = true;
        let ticket
        while(flag){
            const callback = {}
            let name
            callback[(name = "jQuery" + getRandomInt(100000, 999999))] = data =>{
                if (data.code === 200) {
                    flag = false;
                    ticket = data.ticket;
                }
            }
            const result = await axios({
                method: "get",
                url: defaultInfo.scanUrl,
                headers: Object.assign(
                  {
                    Host: "qr.m.jd.com",
                    Referer: "https://passport.jd.com/new/login.aspx",
                    Cookie: defaultInfo.cookieData.join(";")
                  },
                  defaultInfo.header
                ),
                params: {
                  callback: name,
                  appid: 133,
                  token: defaultInfo.cookies["wlfstk_smdl"],
                  _: new Date().getTime()
                }
            });
            console.log(result.data)
            eval("callback." + result.data);
            await sleep(1000);
        }
        return ticket

    } catch(e){
        return Promise.reject(e);
    }
}


async function goodPrice(stockId){
    const callback = {};
    let name;
    let price;
    callback[(name = "jQuery" + getRandomInt(100000, 999999))] = data => {
       price = data;
    };
    console.log(defaultInfo.cookieData)
    const result = await axios({
      method: "get",
      url: "http://p.3.cn/prices/mgets",
      headers: defaultInfo.header,
      params: {
        type: 1,
        pduid: new Date().getTime(),
        skuIds: "J_" + stockId,
        callback: name
      }
    });

    eval("callback." + result.data);
    console.log(price)
    console.log(name)
    console.log(result)
    console.log("XXXX")
    return price

}



async function goodInfo(targetURl){
    const result = await axios({
        method: "get",
        url: targetURl,
        headers: defaultInfo.header,
        params: {
        appid: 133,
        size: 147,
        t: Date.now()
      },
      responseType: "arraybuffer"
    });
    // console.log(iconv.decode(result.data,"utf-8"))
    // await writeAndOpenFile("qr.html",result.data);
    return result
}




async function runSearch(){
    const tmpURL = "https://item.jd.com/68155926685.html"
    // await goodInfo(tmpURL)
    try {
        let flag = true
        
        const all = await Promise.all([
            goodPrice("68155926685"),
            goodInfo(tmpURL)
        ])
        
        //获取价格
        console.log(all[0][0].p)
        const body = cheerio.load(all[1].data,"utf-8")
        // 获取名称
        console.log(body("div.sku-name").text())

        // 获取详情
        let oneList = body('div.p-parameter').text().split('\n')
        oneList.forEach(function(item,index){
            console.log(item.trim())
            console.log("XXXX")
        })
        let tmpList = body('div.Ptable').text().split("\n")
        tmpList.forEach(function(item,index){
            console.log(item.trim())
            console.log("XXXCC")
        })

        // 获取轮播放图片
        let urlList = body('ul.lh').toArray()
        urlList.forEach(function(item,index){
            item.children.forEach(function(item,index){
                if(item.name == "li"){
                    item.children.forEach(function(item,index){
                        if(item.name == "img"){
                            console.log(item.attribs.src)
                        }
                    })
                }

            })
            
        })






    } catch(error){
        return Promise.reject(error)
    }
}

async function login(ticket){
    try{
        const result  =await axios({
            url:defaultInfo.loginUrl,
            headers:Object.assign(
                {
                    Host: "passport.jd.com",
                    Referer: "https://passport.jd.com/uc/login?ltype=logout",
                    Cookie: defaultInfo.cookieData.join("")
                },
                defaultInfo.header
            ),
            params:{
                t:ticket
            }
        })
        defaultInfo.header["p3p"] = result.headers["p3p"]
        return (defaultInfo.cookieData = result.headers["set-cookie"]);
    } catch(e){
        return Promise.reject(e);
    }
}



puppeteer.launch()  
    .then(async browser => {
        console.log("浏览器初始化")
        const page = await browser.newPage();
        await page.goto("https://passport.jd.com/new/login.aspx");
        await sleep(1000);
        console.log("加载完登陆界面")
        const inputs = await page.evaluate(res => {
            const result = document.querySelectorAll("input");
            const data = {};
            console.log(result)
            for (let v of result){
                switch(v.getAttribute('id')){
                    case "token":
                        data.token = v.token
                        break;
                    case "uuid":
                        data.uuid = v.value
                        break;
                    case "eid":
                        data.eid = v.value;
                        break;
                    case "sessionId":
                        data.fp = v.value
                        break;
                }
            }
            return data;
        })
        console.log(inputs)
        Object.assign(defaultInfo,inputs)
        await browser.close();
        console.log("请求扫码...")
    })
    .then(() => requestScan())
    .then(() => listenScan())
    .then(ticket =>{
        defaultInfo.trackid = ticket;
        return login(ticket);
    })
    .then(() => {
        console.log("登陆成功")
        return runSearch()
    })
