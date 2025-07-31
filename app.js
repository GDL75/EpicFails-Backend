require("dotenv").config();
require("./models/connection");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const interestsRouter = require('./routes/interest');
const postsRouter = require("./routes/posts");

const app = express();

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/users", usersRouter);
app.use('/interests', interestsRouter);
app.use("/", indexRouter);
app.use("/posts", postsRouter);

module.exports = app;
