const express = require('express');
const router = express.Router();
const User = require('../models/users');


// Route POST pour tester l'ajout d'un utilisateur en base
router.post('/addUser', (req, res) => {
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
