const ping = require ('ping');
const columnify = require('columnify');
const axios = require('axios');
const { IP_API_KEY } = require("./const");


const getMin = (arr, prop) => {
  const tmp = arr.map(x => x[prop]);
  const min = Math.min(...tmp);
  return arr.filter(x => x[prop] == min);
}

const getMax = (arr, prop) => {
  const tmp = arr.map(x => x[prop]);
  const max = Math.max(...tmp);
  return arr.filter(x => x[prop] == max);
}

const checkIP = async (url) => {
  return axios({
    method: 'post',
    url: `https://www.toolsdaquan.com/toolapi/public/ipchecking/${url}/443`,
    headers: {
      "Content-Type": "application/json",
      "Referer": "www.toolsdaquan.com"
    }
  })
}

// [domain or ip]:[hostname]
const targets = {"www.cloudflare.com": "www",
"amp.cloudflare.com": "amp",
"www.digitalocean.com": "do",
"172.64.32.1": "cm",
"1.0.0.1": "1.0.0.x",
"www.baidu.com": "百度"}

const getResult = async () => {
  const pingResults=[];
  const wrongResults=[];
  for(let target in targets){
    let res = await ping.promise.probe(target)
    .then(x => {
      if(x.host !== 'unknown'){
        console.log('\x1b[36m%s\x1b[0m',targets[target], target, x.numeric_host, x.alive, x.time, x.packetLoss)
      }else{
        console.log('\x1b[36m%s\x1b[0m', target, "unknown host");
      }
      return x;
    });
    //res.domain=target;
    res.server=targets[target];

    if(res.host !== 'unknown'){
      try{
        let geolocation = await axios.get(`https://api.ipgeolocation.io/ipgeo?apiKey=${IP_API_KEY}&ip=${res.numeric_host}`).then(x => x.data);
        res.city = geolocation.country_code3 + " " + geolocation.state_prov + " " + geolocation.city;
        res.isp = geolocation.isp;
        let ipAvaiable = await checkIP(res.numeric_host).then(x => x.data);
        res.icmp = ipAvaiable.icmp === "success"? true:false;
        res.tcp = ipAvaiable.tcp === "success"? true:false;
        pingResults.push(res);
      }catch(err){
        pingResults.push(res);
      }
    }else {
      wrongResults.push(res);
    }
  }

  const success = pingResults.filter(x => x.alive && x.icmp && x.tcp);
  const failed = pingResults.filter(x => !x.alive || !x.icmp || !x.tcp);

  const fasttest = getMin(success, "time");
  const slowest = getMax(success, "time");

  console.log();
  console.log(columnify(success, {columns:['server','numeric_host','alive','icmp','tcp','time','packetLoss',"city","isp"]}));

  if(failed.length){
    console.log();
    console.log(columnify(failed, {columns:['server','numeric_host','alive','icmp','tcp','time','packetLoss',"city","isp"]}));
  }

  console.log();
  console.log("fasttest:", fasttest[0].server, fasttest[0.].time+" ms", fasttest[0].isp)
  console.log("slowest:", slowest[0].server, slowest[0].time+" ms", slowest[0].isp)

  console.log();
  console.log("success: ", success.length, '\t',
    "failed:", failed.length, '\t',
    "wrong:", wrongResults.length, '\t',
    "total: ", Object.keys(targets).length, '\t',
    "health (%):", Math.round(success.length/(success.length+failed.length)*100))
}

getResult();
