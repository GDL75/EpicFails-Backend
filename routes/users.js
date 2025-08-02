const express = require("express");
const router = express.Router();
require("../models/connection");

const User = require("../models/users");
const { checkBody } = require("../modules/checkBody");

const bcrypt = require("bcrypt");
const uid2 = require("uid2");
const checkEmail = require("../modules/checkEmail");

const nodemailer = require("nodemailer");

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
        interests: [],
        resetCode: 0
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

// POST - Send mail verification code to user 
router.post('/send-code', async (req, res) => {
  // ↩️ Data-in 
    const { email } = req.body;

    console.log(email)
  
  // ⚙️ Logic
  try {
    // 1. Checking that email is valid - Vérifier que l'email est valide
    if(!checkEmail(email)) {
      return res.status(400).send({
        result: false,
        error: "Invalid email"
      })
    }

    // 2. Checking user exists - Vérifier que l'utilisateur existe en bdd
    const user = await User.findOne({ email })
    if(!user) {
      return res.status(400).send({
        result: false,
        error: 'User not found'
      })
    }

    // 3. Generate random 6-digit code - Générer un code à 6 chiffres aléatoire
    // Has to be less or equal to 999,999 and greater or equal to 100,000 - doit être sup ou égal à 100,000 et inf ou égal à 999,999
    const digitCode = Math.floor(Math.random()*(999999-100000+1)+100000);

    console.log()

    // 4. Add digitCode to user info in database - Ajout du code aux infos utilisateurs en bdd
    // May be deleted if we store code in Redux store - peut être supprimé si on choisit d'enregistrer le code dans le store redux
    await User.updateOne({ email }, { resetCode: bcrypt.hashSync(digitCode.toString(), 10) });

    // 5. Defining the email content - Définir le contenu de l'email
    const mailContent = {
      from: '"EpicFails App" 👾<process.env.GMAIL_ADDRESS>',
      to: email,
      subject: 'Votre code de vérification',
      text: `Votre code de vérification est le suivant: ${digitCode}`
    }

    // 6. Creating a nodemailer email transporter with Gmail - Créer un transporteur d'email requis par nodemailer via Gmail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_ADDRESS,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    })

    // 7. Send mail
    await transporter.sendMail(mailContent);
    console.log(`✅ Email sent to ${email} with code ${digitCode}`); // A virer en production, security leak

  // ↪️ Data-out
    res.status(201).send({
      result: true,
      message: "Verification code sent!",
      code: digitCode // Utile uniquement si on stocke le code dans le store Redux plutôt qu'en bdd
    })

  } catch (err) {
    res.status(500).send({
      result: false,
      error: err.message
    })
  }
})

// POST - Check mail verification code
router.post('/check-code', async (req, res) => {
  // ↩️ Data-in 
    const { email, digitCode } = req.body;
  
  // ⚙️ Logic & ↪️ Data-out
  try {
    // 1. Check the user exists 
    const user = await User.findOne({ email })
    if(!user) {
      return res.status(400).send({
        result: false,
        error: "User not found"
      })
    }
    // 2. Check the code format is valid - vérifier que le format du code est valide
    if(digitCode <  100000 || digitCode > 999999) {
      return res.status(400).send({
        result: false,
        error: "Invalid code format"
      })
    }
    // 3. Check the code sent by user is equal to the code saved in database - vérifier que le code renseigné par l'utilisateur est conforme au code en bdd           
    if(!bcrypt.compareSync(digitCode, user.resetCode)) {
      return res.status(400).send({
        result: false,
        error: "Invalid code"
      })     
    }
    res.status(202).send({
      result: true,
      error: "Code is valid, password reset allowed"
    });

  } catch (err) {
    res.status(500).send({
      result: false,
      error: err.message
    })
  }
})

// POST - Reset password
router.post('/reset-password', async (req, res) => {
  // ↩️ Data-in 
    const { username, password } = req.body;
  
  // ⚙️ Logic & ↪️ Data-out
  try {
    // 1. Check user is in database - vérifier que l'utilisateur est en base de données
    const user = await User.findOne({ username });
    if(!user) {
      return res.status(400).send({
        result: false,
        error: "User not found"
      })
    }
    // 2. Updating password in database - mise à jour du mdp en bdd
    await User.updateOne({ username }, { password: bcrypt.hashSync(password, 10)});
    res.status(201).send({
      result: true,
      message: "Password successfully updated!"
    })

  } catch (err) {
    res.status(500).send({
      result: false,
      error: err.message
    })
  }
})



module.exports = router;
