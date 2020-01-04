const express = require("express");
app = express();
require("./startup/db")();

const csvRouter = require("./routes/csv");

app.use(express.json());
app.use("/api/csv", csvRouter);

const port = process.env.PORT || 3000;
const server = app.listen(port, () => console.log("listening on port", port));

module.exports = server;
