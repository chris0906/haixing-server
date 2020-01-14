const assert = require("assert");
const { getInMemDbInstance } = require("./db");
const { getTransactions } = require("../routes/csvRoute");
const bigAddr = require("../config/bigAddr");
const inMemInstance = getInMemDbInstance();
const db = inMemInstance.db("address");

async function getCollectionsArr() {
  const collections = await db.listCollections().toArray();
  const length = collections.length;
  const arr = [];
  for (let i = 0; i < length; i++) {
    arr.push(collections[i].name);
  }
  return arr;
}

async function cacheBigAddrTransactions() {
  for (let key in bigAddr) {
    //get transactions from db
    const transactions = await getTransactions(bigAddr[key]);
    // if collection exist, update instead of insert
    const collection = db.collection(bigAddr[key]);
    const collectionArr = await getCollectionsArr();
    if (collectionArr.includes(bigAddr[key])) {
      const res = await collection.drop();
      assert.equal(res, true);
    }
    const result = await collection.insertMany(transactions);
    assert.equal(transactions.length, result.result.n);
    console.log(
      `cache ${transactions.length} transactions for address: ${bigAddr[key]}`
    );
  }
}

async function setCycleCacheForBigAddr() {
  await cacheBigAddrTransactions();
  setTimeout(() => {
    setCycleCacheForBigAddr();
  }, 60000);
}

module.exports = setCycleCacheForBigAddr;
