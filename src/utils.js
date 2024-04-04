const dayjs = require('dayjs');

const timestamp = () => dayjs().format('YYYY-MM-DD.HHMMss');

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

/**
 * Convert a value to a boolean
 * @param {*} value the value to convert
 * @returns boolean value
 */
const asBool = value => {
  switch (
    String(value ?? '')
      .trim()
      .toLowerCase()
  ) {
    case 'true':
    case 'y':
    case 'yes':
    case '1':
      return true;
    default:
      return false;
  }
};

module.exports = {
  timestamp,
  parseArray,
  cpOptions,
  asBool
};
