const toDate = require("../utils/toDate");
const express = require("express");
const csvRouter = express.Router();
const Web3 = require("web3");
const web3 = new Web3(require("../config/provider").providerAddr);
const transformData = require("../utils/transformData");
const { getDbInstance, getTempDbInstance } = require("../startup/db");

const { getTokenLength, tokenData } = require("../utils/abiMethods");
const { writeToTokenJson } = require("../utils/addToTokenJson");
let initialTokenLength = getTokenLength();
const bigAddrObj = require("../config/bigAddr"); //json object
const bigAddrArr = getBigAddrArr(bigAddrObj);

csvRouter.get("/:walletAddr", async (req, res) => {
  try {
    const addr = req.params.walletAddr.toLowerCase();
    const start = Date.now();
    const requestTime = toDate(Math.round(start / 1000));
    // if it's big address, get it grom memory
    if (bigAddrArr.includes(addr)) {
      const label = getLabelByAddr(addr);
      const result = await getBigAddrTransactions(label, addr);
      const end = Date.now();
      console.log(
        "get transactions from memory, time spent(ms): ",
        end - start
      );

      console.log(
        `ipAddress:${req.connection.remoteAddress}, walletAddr:${addr}, transaction count:${result.length}, time:${requestTime}`
      );
      return res.status(200).send(result);
    }
    const finalRes = await getTransactions(addr);
    // write to json file
    if (getTokenLength() > initialTokenLength) {
      // update initial token length
      console.log(
        "write to tokenJson file:",
        getTokenLength() - initialTokenLength
      );
      initialTokenLength = getTokenLength();
      writeToTokenJson(__dirname + "/../erc/ethToken.json", tokenData);
    }
    //get end timestamp
    const end = Date.now();
    console.log(
      `ipAddress:${req.connection.remoteAddress}, walletAddr:${addr}, transaction count:${finalRes[0].length}, time:${requestTime}`
    );
    console.log("time spent(ms):", end - start);
    //give back in a form of json
    return res.status(200).json(finalRes[0]);
  } catch (error) {
    return res.status(400).send(error);
  }
});

async function getTransactions(addr) {
  if (!web3.utils.isAddress(addr)) throw new Error("not a valid address");
  const code = await web3.eth.getCode(addr);
  if (code.length > 2) throw new Error("contract address is not acceptable");
  //get db instance
  const mongodb = getDbInstance();
  const db = mongodb.db("myproject");
  const collection = db.collection("transactions");
  //get start timestamp
  let start = Date.now();
  //get needed data from db
  console.log("begin query database");
  let maxBlockNumber;
  const fromResult = await collection
    .find({ from: addr })
    .collation({ locale: "en", strength: 2 })
    .toArray();
  if (fromResult.length !== 0)
    maxBlockNumber = fromResult[fromResult.length - 1].blockNumber;
  const toResult = await collection
    .find({ to: addr })
    .collation({ locale: "en", strength: 2 })
    .toArray();
  if (toResult.length !== 0)
    toResult[toResult.length - 1].blockNumber > maxBlockNumber
      ? (maxBlockNumber = toResult[toResult.length - 1].blockNumber)
      : "";
  const transferCode = "0xa9059cbb000000000000000000000000";
  const inputData = transferCode + addr.toLowerCase().substr(2);
  const inputResult = await collection
    .find({
      input: eval("/^" + inputData + "/")
    })
    .toArray();
  if (inputResult.length !== 0)
    inputResult[inputResult.length - 1].blockNumber > maxBlockNumber
      ? (maxBlockNumber = inputResult[inputResult.length - 1].blockNumber)
      : "";
  let end = Date.now();
  console.log("finish query database, time spent(ms): ", end - start);
  //transform data to what we need
  const result = fromResult.concat(toResult).concat(inputResult);
  const finalRes = await transformData(result);
  //give back in a form of json
  return [finalRes, maxBlockNumber];
}

async function getBigAddrTransactions(label, addr) {
  const dbInstance = getTempDbInstance();
  const db = dbInstance.db("address");
  const collection = db.collection(label + "_" + addr);
  const result = collection.find({}, { projection: { _id: 0 } }).toArray();
  return result;
}

//get all address of the bigAddr json file and form it into an array
function getBigAddrArr(bigAddrJson) {
  const arr = [];
  for (let key in bigAddrJson) {
    arr.push(bigAddrJson[key].toLowerCase());
  }
  return arr;
}

function getLabelByAddr(addr) {
  for (let key in bigAddrObj) {
    if (bigAddrObj[key].toLowerCase() === addr.toLowerCase()) return key;
  }
}
module.exports = { csvRouter, getTransactions };
