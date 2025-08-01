const express = require("express");
const router = express.Router();
require("../models/connection");
const Post = require("../models/posts");
const { checkBody } = require("../modules/checkBody");
const { sortObjectArray } = require("../modules/sortObjectArray");

// GET de tous les posts, sans filtre mais avec un nombre maximum possible (facultatif)
router.get("/", async function (req, res) {
  try {
    const posts = await Post.find();
    // tri par date, les plus récents en premier
    let sortedPosts = sortObjectArray(posts, "date", -1);
    // on tronque la liste si un nbmax a été renseigné dans le body
    req.body.nbmax && (sortedPosts = sortedPosts.slice(0, req.body.nbmax));
    res.json({ result: true, posts: sortedPosts });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST Création d'un post en BDD (hors cloudinary pour l'instant)
router.post("/", async function (req, res) {
  try {
    if (!checkBody(req.body, ["userID", "title", "date", "actualPhotoURL"])) {
      res.json({ result: false, error: "Some mandatory data is missing" });
      return;
    } else {
      const newPost = new Post(req.body);
      await newPost.save();
      res.json({ result: true, newPost: newPost });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
