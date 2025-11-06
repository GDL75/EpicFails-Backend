require("dotenv").config();
const mongoose = require("mongoose");

const connectionString = process.env.CONNECTION_STRING;
mongoose.connect(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
// Permet de simuler des requêtes HTTP sur l’app Express
const request = require("supertest");
const express = require("express");
const commentsRouter = require("../comments");

// Création de l’app de test et ajout du router comments
const app = express();
app.use(express.json());
app.use("/comments", commentsRouter);

// Test : vérifie que la route GET /comments/:postId renvoie bien le commentaire attendu pour un post donné
test("GET /comments/:postId répond avec le commentaire attendu", async () => {
  // id du post à tester (doit exister en base avec au moins un commentaire connu)
  const postId = "689af57354a558d8782510f6".trim();
  // On fait la requête GET sur la route comments
  const res = await request(app).get(`/comments/${postId}`);

  // Vérifie que la requête aboutit sans erreur et que la réponse principale est positive
  expect(res.statusCode).toBe(200);
  expect(res.body.result).toBe(true);

  // On vérifie que le commentaire est bien dans la liste
  const commentaireTrouve = res.body.comments.find(
    (com) => com.comment === "Oh non ! Qui va nettoyer tout ça ?"
  );
  expect(commentaireTrouve).toBeDefined();
});

// Permet de fermer proprement la connexion MongoDB après tous les tests,
afterAll(async () => {
  // ferme la connexion DB
  await mongoose.connection.close(); 
});