const express = require('express');
const router = express.Router();
const User = require('../models/users');


// Route POST pour tester l'ajout d'un utilisateur en base
router.post('/addUser', (req, res) => {
  // Attention ici la date reçue est une string et doit être convertie en Date object avant 
  // d'être postée en DB
  const newUser = new User(req.body)
  // Sauvegarde le nouvel utilisateur en base MongoDB
  newUser.save()
  .then(data => {
    // Affiche l'utilisateur ajouté dans la console (pour debug/test)
    console.log(data);
    // Renvoie une réponse de succès au frontend
    res.send({
      result: true,
      message: 'User added'
    });

  })
});

module.exports = router;
