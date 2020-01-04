const abiDecoder = require("abi-decoder");
const toDate = require("./toDate");
const abi = require("../erc20/baseABI");
const Web3 = require("web3");
const web3 = new Web3("http://59.51.127.19:8545");

module.exports = async function(arr) {
  const finalRes = [];
  for (let i = 0; i < arr.length; i++) {
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
      const contract = new web3.eth.Contract(abi, arr[i].to);
      abiDecoder.addABI(abi);
      const decodedData = abiDecoder.decodeMethod(arr[i].input);
      if (decodedData.name === "transfer") {
        const decimals = await contract.methods.decimals().call();
        from = arr[i].from;
        to = decodedData.params[0].value;
        value = decodedData.params[1].value / 10 ** decimals;
        if (
          arr[i].to.toLowerCase() ===
          "0xdcD85914b8aE28c1E62f1C488E1D968D5aaFfE2b".toLowerCase()
        )
          symbol = "TOP";
        else if (
          arr[i].to.toLowerCase() ===
          "0xB31C219959E06f9aFBeB36b388a4BaD13E802725".toLowerCase()
        )
          symbol = "ONOT";
        else {
          symbol = await contract.methods.symbol().call();
        }
        time = toDate(arr[i].timestamp);
        finalRes.push({ time, from, to, value, symbol });
      } else {
        console.log(
          `${decodedData.name} method is invoked, but were not handled`
        );
      }
    }
  }
  return finalRes;
};
