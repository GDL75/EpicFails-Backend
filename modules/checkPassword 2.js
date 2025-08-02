const bcrypt = require('bcrypt');

function checkPassword (inputPW, databasePW) {
    if(bcrypt.compareSync(inputPW, databasePW))
        return true
    else 
        return false
}

module.exports = checkPassword;