const express = require("express");
const router = express.Router();
require("../models/connection");

const User = require("../models/users");
const { checkBody } = require("../modules/checkBody");

const bcrypt = require("bcrypt");
const uid2 = require("uid2");
const checkEmail = require("../modules/checkEmail")

// /* GET users listing. */
// router.get("/", async function (req, res, next) {
//   const users = await User.find();
//   res.json({ users: users });
//   // res.send("respond with a resource");
// });

// POST l'utilisateur accepte la charte de bienveillance
router.post("/acceptsGC", async function (req, res) {
  try {
    if (!checkBody(req.body, ["token"])) {
      res.json({ result: false, error: "Token is missing" });
      return;
    } else {
      const foundUser = await User.find({ token: req.body.token });
      if (foundUser.length === 0) {
        res.json({ result: false, error: "User doesn't exist in database" });
        return;
      }
    }
    // recherche l'utilisateur et enregistre l'acceptation de la CB
    await User.updateOne({ token: req.body.token }, { hasAcceptedGC: true });
    res.json({ result: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST - Sign up
router.post('/signup', async (req, res) => {
  console.log("From backend, signup trial") //🔴
  // ↩️ Data-in 
    const { email, username, password } = req.body;
  
  // ⚙️ Logic & ↪️ Data-out
    try {
      // 1. Checking that all fields are filled -- Vérifier que tous les champs ont été renseignés
      if(!checkBody(req.body, ["email", "username", "password"])) {
        return res.status(400).send({
                  result: false,
                  error: "Missing or empty fields"
              })
      } 
      // 2. Checking that email is valid -- Vérifier que l'email est valide
      if(!checkEmail(email)) {
        return res.status(400).send({
                  result: false,
                  error: "Invalid email"
              })
      }
      // 3. Checking that user is not already signed up -- Vérifier que l'utilisateur n'a pas déjà un compte
      let user = await User.findOne({ username, email })
      if(user) {
        return res.status(400).send({
                  result: false,
                  error: "User already exists"
              })
      }
      // 4. Adding user to database - Ajout de l'utilisateur à la base de donnée
      user = new User({
        username,
        email,
        password: bcrypt.hashSync(password, 10),
        token: uid2(32),
        hasAcceptedGC: false,
        signUpDate: new Date(),
        avatarURL: "",
        status: "Newbie",
        interests: []
      })
      
      await user.save();
      res.status(201).send({
        result: true,
        message: "User signed-up!",
        token: user.token
      })

    } catch (err) {
      res.status(500).send({
        result: false,
        error: err.message
      })
    }

})


// POST - Sign in
router.post('/signin', async (req, res) => {
  // ↩️ Data-in 
    const { username, password } = req.body;
  
  // ⚙️ Logic & ↪️ Data-out
    try {
      // 1. Checking that all fields are filled -- Vérifier que tous les champs ont été renseignés
      if(!checkBody(req.body, ["username", "password"])) {
        return res.status(400).send({
                  result: false,
                  error: "Missing or empty fields"
              })
      } 
      // 2. Checking that user exists in database  -- Vérifier que l'utilisateur a un compte
      let user = await User.findOne({ username })
      if(!user) {
        return res.status(400).send({
                  result: false,
                  error: "User not found"
              })
      }
      // 3. Checking that password is valid -- Vérifier que le mot de passe est valide
      if(!bcrypt.compareSync(password, user.password)) {
        return res.status(400).send({
                  result: false,
                  error: "Incorrect password"
               })
      }
      res.status(201).send({
        result: true,
        message: "User signed-in!",
        token: user.token
      })

    } catch (err) {
      res.status(500).send({
        result: false,
        error: err.message
      })
    }

})

// POST - Forgotten password 
router.post('/resetPassword', async (req, res) => {
  // ↩️ Data-in 
    const { username, password } = req.body;
  
  // ⚙️ Logic & ↪️ Data-out
  try {









  } catch (err) {
    res.status(500).send({
      result: false,
      error: err.message
    })
  }
})



module.exports = router;
