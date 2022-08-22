const dateFormat = require('dateformat');

const timestamp = () => dateFormat(new Date(), 'yyyy-mm-dd.HHMMss');

const cpOptions = {
  maxBuffer: 50 * 1024 * 1024,
  stdio: 'inherit'
};

module.exports = {
  timestamp,
  cpOptions
};
