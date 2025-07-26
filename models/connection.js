const mongoose = require("mongoose");

const connectionString = process.env.CONNECTION_STRING;

const connection = mongoose.connect(connectionString, { connectTimeOutMS: 2000 })
.then(() => console.log("Database successfully connected 🎉"))
.catch(err => console.error(err));

module.exports = connection;