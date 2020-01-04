const MongoClient = require("mongodb").MongoClient;
let client;
module.exports = async function initialDb() {
  try {
    if (typeof client === "undefined") {
      client = new MongoClient("mongodb://localhost:27017", {
        useUnifiedTopology: true
      });
      await client.connect();
      console.log("connect to db");
    } else {
      return client;
    }
  } catch (error) {
    console.log(error);
  }
};
