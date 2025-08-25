const express = require("express");
const router = express.Router();
require("../models/connection");
const User = require("../models/users");
const Post = require("../models/posts");
const Like = require("../models/likes");
const Bookmark = require("../models/bookmarks");
const Comment = require("../models/comments");
const { checkBody } = require("../modules/checkBody");
const { uploadPhoto } = require("../modules/uploadPhoto");
const { sortObjectArray } = require("../modules/sortObjectArray");

// GET de tous les posts pour la home
router.get("/:token", async function (req, res) {
  try {
    if (!req.params.token) {
      res.json({ result: false, error: "User token is missing" });
      return;
    }
    // Aggregate pour limiter les champs
    const rqPosts = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $project: {
          _id: 1,
          username: { $arrayElemAt: ["$user.username", 0] },
          avatarUrl: { $arrayElemAt: ["$user.avatarUrl", 0] },
          token: { $arrayElemAt: ["$user.token", 0] },
          title: 1,
          date: 1,
          interest: 1,
          actualPhotoUrl: 1,
          expectedPhotoUrl: 1,
          description: 1,
        },
      },
    ];
    const posts = await Post.aggregate(rqPosts);
    let sortedPosts = sortObjectArray(posts, "date", -1);

    const userObj = await User.findOne({ token: req.params.token });
    if (!userObj) {
      res.json({ result: false, error: "token does not exist in database" });
      return;
    }
    const userId = userObj._id;

    if (sortedPosts.length > 0) {
      for (let item of sortedPosts) {
        // Likes
        const likes = await Like.find({ postId: item._id });
        const nbLikes = likes.length;
        const isLiked = likes.some((e) => e.userId.equals(userId));
        item.nbLikes = nbLikes;
        item.isLiked = isLiked;

        // Bookmarks
        const bookmarks = await Bookmark.find({ postId: item._id });
        const nbBookmarks = bookmarks.length;
        const isBookmarked = bookmarks.some((e) => e.userId.equals(userId));
        item.nbBookmarks = nbBookmarks;
        item.isBookmarked = isBookmarked;

        // Comments
        const comments = await Comment.find({ postId: item._id });
        const nbcomments = comments.length;
        const isCommented = comments.some((e) => e.userId.equals(userId));
        item.nbComments = nbcomments;
        item.isCommented = isCommented;
      }
    }
    res.json({ result: true, posts: sortedPosts });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST création d'un post
router.post("/", async function (req, res) {
  try {
    if (!checkBody(req.body, ["token", "title", "interest"])) {
      res.json({ result: false, error: "Some mandatory data is missing" });
      return;
    }
    const actualPhotoUpload = await uploadPhoto(req.files.photoObligatoire);
    if (!actualPhotoUpload.result) {
      return res.json(actualPhotoUpload.error);
    }
    const expectedPhotoUpload = await uploadPhoto(req.files.photoFacultative);
    if (!expectedPhotoUpload.result) {
      return res.json(expectedPhotoUpload.error);
    }
    const { title, interest, description } = req.body;
    const userObj = await User.findOne({ token: req.body["token"] });
    if (!userObj) {
      res.json({ result: false, error: "token does not exist in database" });
      return;
    }
    const userId = userObj._id;
    const newPost = new Post({
      userId,
      title,
      interest,
      description,
      date: new Date(),
      expectedPhotoUrl: expectedPhotoUpload.url,
      actualPhotoUrl: actualPhotoUpload.url,
    });
    await newPost.save();
    res.json({ result: true, newPost: newPost });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE suppression d'un post
router.delete("/delete", async function (req, res) {
  try {
    if (!checkBody(req.body, ["token", "postId"])) {
      res.json({ result: false, error: "Token and post ID are required" });
      return;
    }
    const { token, postId } = req.body;
    const userObj = await User.findOne({ token: token });
    if (!userObj) {
      res.json({ result: false, error: "Invalid token" });
      return;
    }
    const userId = userObj._id;
    const post = await Post.findOne({ _id: postId });
    if (!post) {
      res.json({ result: false, error: "This post does not exist in database" });
      return;
    }
    if (!post.userId.equals(userId)) {
      res.json({ result: false, error: "You are not authorized to delete this post" });
      return;
    }
    await Post.deleteOne({ _id: postId });
    await Like.deleteMany({ postId: postId });
    await Bookmark.deleteMany({ postId: postId });
    await Comment.deleteMany({ postId: postId });
    res.json({ result: true, message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ result: false, error: error.message });
  }
});

// POST toggle des likes sur un post
router.post("/like/", async function (req, res) {
  try {
    if (!checkBody(req.body, ["token", "postId"])) {
      res.json({ result: false, error: "Some mandatory data is missing" });
      return;
    }
    const { token, postId } = req.body;
    const userObj = await User.findOne({ token: token });
    if (!userObj) {
      res.json({ result: false, error: "token does not exist in database" });
      return;
    }
    const userId = userObj._id;
    const isPostId = await Post.findOne({ _id: postId });
    if (!isPostId) {
      res.json({ result: false, error: "This post does not exist in database" });
      return;
    }
    const nbLikes = await Like.countDocuments({ postId: postId });
    const isLike = await Like.findOne({ userId: userId, postId: postId });
    if (!isLike) {
      const newLike = new Like({ userId, postId, date: new Date() });
      await newLike.save();
      res.json({ result: true, isLiked: true, newLikeId: newLike._id, nbLikes: nbLikes + 1 });
    } else {
      await Like.deleteOne({ userId: userId, postId: postId });
      res.json({ result: true, isLiked: false, nbLikes: nbLikes - 1 });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET des posts likés d'un user, filtrés par catégorie
router.get("/liked/:token", async (req, res) => {
  try {
    const user = await User.findOne({ token: req.params.token });
    if (!user) {
      return res.json({ result: false, error: "User not found" });
    }
    let categories = [];
    if (req.query.categories) {
      categories = req.query.categories.split(',').map(cat => cat.trim());
    } else if (req.query.category) {
      categories = [req.query.category];
    }
    const likes = await Like.find({ userId: user._id }).populate({
      path: "postId",
      populate: { path: "userId", select: "username avatarUrl" },
    });
    let likedPosts = likes.map(like => like.postId).filter(post => post);
    if (categories.length > 0) {
      likedPosts = likedPosts.filter(post => categories.includes(post.interest));
    }
    for (let post of likedPosts) {
      post.nbLikes = await Like.countDocuments({ postId: post._id });
      post.isLiked = true;
    }
    res.json({ result: true, posts: likedPosts });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET des posts bookmarkés d'un user, filtrés par catégorie
router.get("/bookmarked/:token", async (req, res) => {
  try {
    const user = await User.findOne({ token: req.params.token });
    if (!user) {
      return res.json({ result: false, error: "User not found" });
    }
    let categories = [];
    if (req.query.categories) {
      categories = req.query.categories.split(',').map(cat => cat.trim());
    } else if (req.query.category) {
      categories = [req.query.category];
    }
    const bookmarks = await Bookmark.find({ userId: user._id }).populate({
      path: "postId",
      populate: { path: "userId", select: "username avatarUrl" },
    });
    let bookmarkedPosts = bookmarks.map(bookmark => bookmark.postId).filter(post => post);
    if (categories.length > 0) {
      bookmarkedPosts = bookmarkedPosts.filter(post => categories.includes(post.interest));
    }
    for (let post of bookmarkedPosts) {
      post.isBookmarked = true;
    }
    res.json({ result: true, posts: bookmarkedPosts });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST toggle des signets sur un post
router.post("/bookmark/", async function (req, res) {
  try {
    if (!checkBody(req.body, ["token", "postId"])) {
      res.json({ result: false, error: "Some mandatory data is missing" });
      return;
    }
    const { token, postId } = req.body;
    const userObj = await User.findOne({ token: token });
    if (!userObj) {
      res.json({ result: false, error: "token does not exist in database" });
      return;
    }
    const userId = userObj._id;
    const isPostId = await Post.findOne({ _id: postId });
    if (!isPostId) {
      res.json({ result: false, error: "This post does not exist in database" });
      return;
    }
    const isBookmark = await Bookmark.findOne({ userId: userId, postId: postId });
    if (!isBookmark) {
      const newBookmark = new Bookmark({ userId, postId, date: new Date() });
      await newBookmark.save();
      res.json({ result: true, isBookmarked: true, newBookmarkId: newBookmark._id });
    } else {
      await Bookmark.deleteOne({ userId: userId, postId: postId });
      res.json({ result: true, isBookmarked: false });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST ajout d'un commentaire sur un post
router.post("/comment/", async function (req, res) {
  try {
    if (!checkBody(req.body, ["token", "postId", "comment"])) {
      res.json({ result: false, error: "Some mandatory data is missing" });
      return;
    }
    const { token, postId, comment } = req.body;
    const userObj = await User.findOne({ token: token });
    if (!userObj) {
      res.json({ result: false, error: "token does not exist in database" });
      return;
    }
    const userId = userObj._id;
    const isPostId = await Post.findOne({ _id: postId });
    if (!isPostId) {
      res.json({ result: false, error: "This post does not exist in database" });
      return;
    }
    const nbComments = await Comment.countDocuments({ postId: postId });
    const newComment = new Comment({ userId, postId, comment, date: new Date() });
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
router.delete("/comment/", async function (req, res) {
  try {
    if (!checkBody(req.body, ["token", "commentId"])) {
      res.json({ result: false, error: "Some mandatory data is missing" });
      return;
    }
    const { token, commentId } = req.body;
    const comment = await Comment.findOne({ _id: commentId });
    if (!comment) {
      res.json({ result: false, error: "This comment does not exist in database" });
      return;
    }
    const author = await User.findOne({ _id: comment.userId });
    if (!author) {
      res.json({ result: false, error: "User token does not exist in database" });
      return;
    }
    if (token === author.token) {
      await Comment.deleteOne({ _id: commentId });
    } else {
      res.json({
        result: false,
        error: "The connected user is not the comment's author",
      });
      return;
    }
    res.json({ result: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET tous les posts d'un même centre d'intérêt
router.get("/:token/:interest", async (req, res) => {
  try {
    const isUser = await User.findOne({ token: req.params.token });
    if (!isUser) {
      return res.status(404).send({ result: false, error: "User not found" });
    }
    const interestPosts = await Post.find({ interest: req.params.interest });
    if (!interestPosts) {
      return res.status(404).send({
        result: false,
        error: "No posts for this interest",
      });
    }
    res.status(200).send({ result: true, posts: interestPosts });
  } catch (err) {
    res.status(500).send({ result: false, error: err.message });
  }
});

// GET des posts likés d'un user, filtrés par catégorie
router.get("/liked/:token", async (req, res) => {
  try {
    // On récupère l'utilisateur via le token
    const user = await User.findOne({ token: req.params.token });
    if (!user) {
      return res.json({ result: false, error: "User not found" });
    }

    // Gestion multi-catégorie en query
    let categories = [];
    if (req.query.categories) {
      categories = req.query.categories.split(',').map(cat => cat.trim());
    } else if (req.query.category) {
      categories = [req.query.category];
    }

    // On va chercher les likes de l'utilisateur et on populate sur le post et son auteur
    const likes = await Like.find({ userId: user._id }).populate({
      path: "postId",
      populate: { path: "userId", select: "username avatarUrl" },
    });
    let likedPosts = likes.map(like => like.postId).filter(post => post);

    // Filtre selon la catégorie/les catégories demandées en query
    if (categories.length > 0) {
      likedPosts = likedPosts.filter(post => categories.includes(post.interest));
    }

    // On enrichit chaque post d'un flag "isLiked" pour l'affichage devant le cœur
    for (let post of likedPosts) {
      post.nbLikes = await Like.countDocuments({ postId: post._id });
      post.isLiked = true; // Vu sur la page "Mes Likes"
    }

    res.json({ result: true, posts: likedPosts });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET des posts bookmarkés d'un user, filtrés par catégorie
router.get("/bookmarked/:token", async (req, res) => {
  try {
    // On récupère l'utilisateur via le token
    const user = await User.findOne({ token: req.params.token });
    if (!user) {
      return res.json({ result: false, error: "User not found" });
    }

    // Gestion multi-catégorie en query
    let categories = [];
    if (req.query.categories) {
      categories = req.query.categories.split(',').map(cat => cat.trim());
    } else if (req.query.category) {
      categories = [req.query.category];
    }

    // On va chercher les signets de l'utilisateur et on populate sur le post et son auteur
    const bookmarks = await Bookmark.find({ userId: user._id }).populate({
      path: "postId",
      populate: { path: "userId", select: "username avatarUrl" },
    });
    let bookmarkedPosts = bookmarks.map(bookmark => bookmark.postId).filter(post => post);

    // Filtre selon la catégorie/les catégories demandées en query
    if (categories.length > 0) {
      bookmarkedPosts = bookmarkedPosts.filter(post => categories.includes(post.interest));
    }

    // On enrichit chaque post d'un flag "isBookmarked" pour l'affichage du signet
    for (let post of bookmarkedPosts) {
      // Vu sur la page "Mes Signets"
      post.isBookmarked = true; 
    }

    res.json({ result: true, posts: bookmarkedPosts });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


module.exports = router;
