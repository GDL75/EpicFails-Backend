function checkEmail(email) {
  // Expression régulière qui valide un email de structure classique
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (email.match(emailRegex)) return true;
  else return false;
}

module.exports = checkEmail;
