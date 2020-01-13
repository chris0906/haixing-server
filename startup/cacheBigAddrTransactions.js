const assert = require("assert");
const { getInMemDbInstance } = require("./db");
const { getTransactions } = require("../routes/csvRoute");
const bigAddr = require("../config/bigAddr");
const inMemInstance = getInMemDbInstance();
const db = inMemInstance.db("address");

async function cacheBigAddrTransactions() {
  for (let key in bigAddr) {
    const transactions = await getTransactions(bigAddr[key]);
    const collection = db.collection(bigAddr[key]);
    const result = await collection.insertMany(transactions);
    assert.equal(transactions.length, result.result.n);
    console.log(
      `cache ${transactions.length} transactions for address: ${bigAddr[key]}`
    );
  }
}

module.exports = cacheBigAddrTransactions;
