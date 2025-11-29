require("../models/connection");
const User = require("../models/users");

// Fonction utilitaire : vérifie que le corps de la requête contient bien tous les paramètres nécessaires
function checkBody(body, keys) {
  let isValid = true;
  for (const field of keys) {
    if (!body[field] || body[field] === "") {
      isValid = false;
    }
  }
  return isValid;
}

module.exports = { checkBody };
