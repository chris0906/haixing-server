const assert = require("assert");
const { getInMemDbInstance, getDbInstance } = require("./db");
const { getTransactions } = require("../routes/csvRoute");
const bigAddr = require("../config/bigAddr");
const inMemInstance = getInMemDbInstance();
const db = inMemInstance.db("address");
const transformData = require("../utils/transformData");
const addrToNewestBlock = {};

async function cachingBigAddrTransactions() {
  //clear all collections
  const collections = await db.listCollections().toArray();
  for (let i = 0; i < collections.length; i++) {
    const res = await db.collection(collections[i].name).drop();
    assert.equal(res, true);
  }
  for (let key in bigAddr) {
    //get transactions from db
    const result = await getTransactions(bigAddr[key]);
    const transactions = result[0]; //transaction info
    const max = result[1]; //max blockNumber to get info from
    addrToNewestBlock[bigAddr[key]] = max; //update to local object
    const collection = db.collection(bigAddr[key]);
    const inserted = await collection.insertMany(transactions);
    assert.equal(transactions.length, inserted.result.n);
    console.log(
      `cache ${transactions.length} transactions for address: ${bigAddr[key]}`
    );
  }
  setTimeout(() => cycleUpdateCache(), 60000);
}

async function cycleUpdateCache() {
  await updateCachingBigAddrTransactions();
  setTimeout(() => cycleUpdateCache(), 60000);
}

async function updateCachingBigAddrTransactions() {
  for (let key in bigAddr) {
    //get transactions from db
    const result = await getTransactionsGreatThenBlockNumber(
      bigAddr[key],
      addrToNewestBlock[bigAddr[key]]
    );
    //transaction info
    if (!result) {
      console.log("waiting for updating transactions for addr: ", bigAddr[key]);
      continue;
    }
    const transactions = result[0];
    const max = result[1]; //max blockNumber to get info from
    addrToNewestBlock[bigAddr[key]] = max; //update to local object
    const collection = db.collection(bigAddr[key]);
    const inserted = await collection.insertMany(transactions);
    assert.equal(transactions.length, inserted.result.n);
    console.log(
      `newly cache ${transactions.length} transactions for address: ${bigAddr[key]}`
    );
  }
}

async function getTransactionsGreatThenBlockNumber(addr, blockNumber) {
  const mongodb = getDbInstance();
  const db = mongodb.db("myproject");
  const collection = db.collection("transactions");
  //get needed data from db
  const fromResult = await collection
    .find({ from: addr, blockNumber: { $gt: blockNumber } })
    .collation({ locale: "en", strength: 2 })
    .toArray();
  const toResult = await collection
    .find({ to: addr, blockNumber: { $gt: blockNumber } })
    .collation({ locale: "en", strength: 2 })
    .toArray();
  const transferCode = "0xa9059cbb000000000000000000000000";
  const inputData = transferCode + addr.toLowerCase().substr(2);
  const inputResult = await collection
    .find({
      input: eval("/^" + inputData + "/"),
      blockNumber: { $gt: blockNumber }
    })
    .toArray();
  //transform data to what we need
  const result = fromResult.concat(toResult).concat(inputResult);
  if (result.length === 0) return 0;
  const maxBlockNumber = Math.max.apply(
    Math,
    result.map(e => e.blockNumber)
  );
  const finalRes = await transformData(result);
  //give back in a form of json
  return [finalRes, maxBlockNumber];
}

module.exports = cachingBigAddrTransactions;
