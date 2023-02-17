const bcrypt = require('bcrypt');

// Constants
const constants = require('../constants/constants');

const hashPassword = (password) => {
  return bcrypt.hashSync(password, constants.SALT_ROUND);
};

const comparePassword = (password, hashPassword) => {
  return bcrypt.compareSync(password, hashPassword);
};

module.exports = {
  hashPassword,
  comparePassword,
};
