const mongoose = require("mongoose");

const connectionString = process.env.CONNECTION_STRING;

const connection = mongoose.connect(connectionString, { connectTimeOutMS: 2000 })
.then(() => console.log("Base de données connectée avec succès 🎉"))
.catch(err => console.error(err));

module.exports = connection;