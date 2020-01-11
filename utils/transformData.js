const abi = require("../erc/baseABI");
const decoder = require("abi-decoder").decodeMethod;
require("abi-decoder").addABI(abi);
const toDate = require("./toDate");
const Web3 = require("web3");
const web3 = new Web3(require("../config").providerAddr);
const {
  getDecimals,
  getSymbol,
  tokenData,
  getTokenLength
} = require("./abiMethods");

const { writeToTokenJson } = require("./addToTokenJson");
const initialTokenLength = getTokenLength();

module.exports = async function(arr) {
  const finalRes = [];
  const length = arr.length;
  for (let i = 0; i < length; i++) {
    console.log(i, length);
    let from, to, value, time, symbol;
    if (arr[i].input === "0x" && arr[i].value !== "0") {
      //eth
      from = arr[i].from;
      to = arr[i].to;
      value = web3.utils.fromWei(arr[i].value, "ether");
      symbol = "ETH";
      time = toDate(arr[i].timestamp);
      finalRes.push({ time, from, to, value, symbol });
    } else {
      //erc20
      const decodedData = decoder(arr[i].input);
      if (decodedData.name === "transfer") {
        let decimal = getDecimals(arr[i].to);
        if (!decimal) {
          //write to ethToken json file
          const contract = new web3.eth.Contract(abi, arr[i].to);
          const symbol = await contract.methods.symbol().call();
          decimal = await contract.methods.decimals().call();
          tokenData[arr[i].to] = {
            address: arr[i].to,
            symbol,
            decimal,
            type: "default"
          };
          delete contract;
        }
        from = arr[i].from;
        to = decodedData.params[0].value;
        value = decodedData.params[1].value / 10 ** decimal;
        symbol = getSymbol(arr[i].to);
        time = toDate(arr[i].timestamp);
        finalRes.push({ time, from, to, value, symbol });
      } else {
        console.log(
          `${decodedData.name} method is invoked, but were not handled`
        );
        console.log(`undefined symbol contract addr: ${element.to}`);
      }
    }
  }
  if (getTokenLength() > initialTokenLength) {
    console.log("write to tokenJson file");
    writeToTokenJson(__dirname + "/../erc/ethToken.json", tokenData);
  }
  return finalRes;
};
