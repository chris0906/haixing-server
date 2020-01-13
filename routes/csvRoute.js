const express = require("express");
const csvRouter = express.Router();
const Web3 = require("web3");
const web3 = new Web3(require("../config/provider").providerAddr);
const transformData = require("../utils/transformData");
const { getDbInstance } = require("../startup/db");

const { getTokenLength, tokenData } = require("../utils/abiMethods");
const { writeToTokenJson } = require("../utils/addToTokenJson");
let initialTokenLength = getTokenLength();

csvRouter.get("/:walletAddr", async (req, res) => {
  try {
    const addr = req.params.walletAddr;
    const start = Date.now();
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
      `ipAddress:${req.connection.remoteAddress}, walletAddr:${addr}, transaction count:${finalRes.length}`
    );
    console.log("time spent(ms):", end - start);
    //give back in a form of json
    return res.status(200).json(finalRes);
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
  const now = Date.now();
  //get needed data from db
  const fromResult = await collection
    .find({ from: addr })
    .collation({ locale: "en", strength: 2 })
    .toArray();
  const toResult = await collection
    .find({ to: addr })
    .collation({ locale: "en", strength: 2 })
    .toArray();
  const transferCode = "0xa9059cbb000000000000000000000000";
  const inputData = transferCode + addr.toLowerCase().substr(2);
  const inputResult = await collection
    .find({
      input: eval("/^" + inputData + "/")
    })
    .toArray();
  //transform data to what we need
  const result = fromResult.concat(toResult).concat(inputResult);
  const finalRes = await transformData(result);
  //give back in a form of json
  return finalRes;
}

module.exports = { csvRouter, getTransactions };
