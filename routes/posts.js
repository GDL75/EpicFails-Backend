const express = require("express");
const router = express.Router();
require("../models/connection");

const Post = require("../models/posts");
const { checkBody } = require("../modules/checkBody");

/* GET posts listing. */
router.get("/", async function (req, res, next) {
  const posts = await Post.find();
  res.json({ posts: posts });
  // res.send("respond with a resource");
});

// POST Création d'un post en BDD
router.post("/", async function (req, res) {
  if (!checkBody(req.body, ["userID", "title", "date", "actualPhotoURL"])) {
    res.json({ result: false, error: "Some mandatory data is missing" });
    return;
  } else {
    const newPost = new Post(req.body)
    await newPost.save()
    res.json({ result: true, newPost: newPost });
  }
});

module.exports = router;
