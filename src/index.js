const puppeteer = require("puppeteer");
const axios = require('axios')
const fs = require('fs')
const opn = require("opn");

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






console.log("SSDSDSD")

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



async function runSearch(){
    const tmpURL = "https://item.jd.com/68155926685.html"
    console.log("SDSDSDSD")
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
