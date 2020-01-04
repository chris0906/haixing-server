const express = require("express");
const router = express.Router();
const Web3 = require("web3");
const web3 = new Web3("http://59.51.127.19:8545");
const transformData = require("../utils/transformData");

router.post("/:walletAddr", async (req, res) => {
  const addr = req.params.walletAddr;
  if (!web3.utils.isAddress(addr))
    return res.status(400).send("not a valid address");
  const code = await web3.eth.getCode(addr);
  if (code.length > 2)
    return res.status(400).send("please don't send a contract address");
  //get db instance
  const mongodb = await require("../startup/db")();
  const db = mongodb.db("myproject");
  const collection = db.collection("transactions");
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
  return res.status(200).json(finalRes);
});

module.exports = router;
