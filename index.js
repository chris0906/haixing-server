const express = require("express");
app = express();
//initiate database
const { initDB, initInMemDB } = require("./startup/db");
initDB();
initInMemDB();

//cache big address transactions
const setCycleCacheForBigAddr = require("./startup/cacheBigAddrTransactions");
setCycleCacheForBigAddr();

//initiate router
const { csvRouter } = require("./routes/csvRoute");

app.use(express.json());
app.use("/api/csv", csvRouter);

const port = process.env.PORT || 3000;
const server = app.listen(port, () => console.log("listening on port", port));

module.exports = server;
