const express = require("express");
app = express();

//initiate database
const { initDB, initTempDB } = require("./startup/db");
initDB().then(() => {
  console.log("connect to db, port: 27017");
  initTempDB().then(() => {
    console.log("connect to in memory db, port: 27019");
  });
});

//initiate router
const { csvRouter } = require("./routes/csvRoute");

app.use(express.json());
app.use("/api/csv", csvRouter);

const port = process.env.PORT || 3000;
const server = app.listen(port, () => console.log("listening on port", port));

module.exports = server;
