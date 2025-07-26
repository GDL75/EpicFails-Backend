const express = require('express');
const router = express.Router();
const User = require('../models/users');


// Testing database 🔴
router.post('/addUser', (req, res) => {
  // Attention ici la date reçue est une string et doit être convertie en Date object avant 
  // d'être poster en DB
  const newUser = new User(req.body)
  newUser.save()
  .then(data => {
    console.log(data);
    res.send({
      result: true,
      message: 'User added'
    });

  })
});

module.exports = router;
