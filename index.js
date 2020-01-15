const express = require("express");
app = express();

//initiate database
const { initDB, initInMemDB } = require("./startup/db");
initDB().then(() => {
  console.log("connect to db, port: 27017");
  initInMemDB().then(() => {
    console.log("connect to in memory db, port: 27018");
    //cache big address transactions
    const cachingBigAddrTransactions = require("./startup/cacheBigAddrTransactions");
    cachingBigAddrTransactions();
  });
});

//initiate router
const { csvRouter } = require("./routes/csvRoute");

app.use(express.json());
app.use("/api/csv", csvRouter);

const port = process.env.PORT || 3000;
const server = app.listen(port, () => console.log("listening on port", port));

module.exports = server;
