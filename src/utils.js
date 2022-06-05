const dateFormat = require('dateformat');

const timestamp = () => dateFormat(new Date(), 'yyyy-mm-dd.HHMMss');

const parseArray = commaDelimitedString => {
  if (commaDelimitedString) {
    return commaDelimitedString.split(',').map(value => value.trim());
  }
  return undefined;
};

const cpOptions = {
  maxBuffer: 50 * 1024 * 1024,
  stdio: 'inherit'
};

module.exports = {
  timestamp,
  parseArray,
  cpOptions
};
