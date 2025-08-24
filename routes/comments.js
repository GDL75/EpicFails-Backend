const express = require('express');
const router = express.Router();
const Comment = require('../models/comments');
const User = require('../models/users');

// GET tous les commentaires d'un post donné
router.get('/:postId', async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId })
      .sort({ date: -1 })
      .populate('userId', 'username avatarUrl');
    res.json({ result: true, comments });
  } catch (error) {
    res.status(400).json({ result: false, error: error.message });
  }
});

module.exports = router;