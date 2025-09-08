const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const Comment = require("../models/comments");
const User = require("../models/users");
const Post = require("../models/posts");
const { checkBody } = require("../modules/checkBody");

// GET tous les commentaires d'un post donné
router.get("/:postId", async (req, res) => {
  try {
    let postId = req.params.postId.trim();
    
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ result: false, error: "Format postId invalide" });
    }
    
    postId = new mongoose.Types.ObjectId(postId);

    // Populate sans le token d'abord
    const comments = await Comment.find({ postId })
      .sort({ date: -1 })
      .populate("userId", "username avatarUrl");

    // Récupération séparée des tokens
    const userIds = comments.map(c => c.userId?._id).filter(Boolean);
    const usersWithTokens = await User.find(
      { _id: { $in: userIds } }, 
      { token: 1 }
    );

    // Map userId -> token
    const tokenMap = {};
    usersWithTokens.forEach(user => {
      tokenMap[user._id.toString()] = user.token;
    });

    // Ajout des tokens aux données populées
    const enrichedComments = comments.map(comment => {
      const commentObj = comment.toObject();
      if (commentObj.userId) {
        commentObj.userId.token = tokenMap[commentObj.userId._id.toString()];
      }
      return commentObj;
    });
    
    res.json({ result: true, comments: enrichedComments });
  } catch (error) {
    res.status(400).json({ result: false, error: error.message });
  }
});

// POST ajout d'un commentaire sur un post
router.post("/", async function (req, res) {
  try {
    if (!checkBody(req.body, ["token", "postId", "comment"])) {
      res.json({ result: false, error: "Some mandatory data is missing" });
      return;
    }
    // champs en entrée de la bdd
    const { token, postId, comment } = req.body;

    // on récupère l'id du user connecté
    const userObj = await User.findOne({ token: token }); // findOne donne directement un objet et non un tableau
    if (!userObj) {
      res.json({ result: false, error: "token does not exist in database" });
      return;
    }
    const userId = userObj._id;

    // on vérifie que le postId existe bien dans la bdd
    const isPostId = await Post.findOne({ _id: postId });
    if (!isPostId) {
      res.json({
        result: false,
        error: "This post does not exist in database",
      });
      return;
    }

    // combien y a-t-il de commentaires pour l'instant ?
    const nbComments = await Comment.countDocuments({ postId: postId });

    // on prépare le commentaire et on l'enregistre
    const newComment = new Comment({
      userId,
      postId,
      comment,
      date: new Date(),
    });
    await newComment.save();

    res.json({
      result: true,
      isCommented: true,
      newCommentId: newComment._id,
      nbComments: nbComments + 1,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE suppression d'un commentaire sur un post
router.delete("/", async function (req, res) {
  try {
    if (!checkBody(req.body, ["token", "commentId"])) {
      res.json({ result: false, error: "Some mandatory data is missing" });
      return;
    }
    // champs en entrée de la bdd
    const { token, commentId } = req.body;

    // on va chercher le commentaire en bdd
    const comment = await Comment.findOne({ _id: commentId });
    if (!comment) {
      res.json({
        result: false,
        error: "This comment does not exist in database",
      });
      return;
    }

    //on vérifie que l'utilisateur connecté soit bien l'auteur commentaire
    const author = await User.findOne({ _id: comment.userId }); // findOne donne directement un objet et non un tableau
    if (!author) {
      res.json({
        result: false,
        error: "User token does not exist in database",
      });
      return;
    }

    // on efface le commentaire de la bdd si le user est bien l'auteur du commentaire
    console.log("token === author.token", token, author.token);
    if (token === author.token) {
      console.log("Dans le if");
      await Comment.deleteOne({ _id: commentId });
    } else {
      console.log("Dans le else");
      res.json({
        result: false,
        error: "The connected user is not the comment's author",
      });
      return;
    }

    res.json({
      result: true,
      message: "Comment successfully deleted"
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
