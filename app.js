require("dotenv").config();
require("./models/connection");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const postsRouter = require("./routes/posts");
const statsRouter = require("./routes/stats");
const duelsRouter = require('./routes/duels');

const app = express();

app.use(cors());

const fileUpload = require("express-fileupload");
app.use(fileUpload());

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/users", usersRouter);
app.use("/", indexRouter);
app.use("/posts", postsRouter);
app.use("/stats", statsRouter);
app.use("/duels", duelsRouter);

module.exports = app;
