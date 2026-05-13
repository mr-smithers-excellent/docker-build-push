import dayjs from 'dayjs';

const timestamp = () => dayjs().format('YYYY-MM-DD.HHMMss');

const parseArray = commaDelimitedString => {
  if (commaDelimitedString) {
    return commaDelimitedString.split(',').map(value => value.trim());
  }
  return undefined;
};

// Split a newline-separated string into trimmed, non-empty entries.
// Used for inputs whose individual values may themselves contain commas,
// such as `type=registry,ref=img:cache` for --cache-from / --cache-to.
const parseLines = newlineDelimitedString => {
  if (newlineDelimitedString) {
    const entries = newlineDelimitedString
      .split('\n')
      .map(value => value.trim())
      .filter(Boolean);
    return entries.length ? entries : undefined;
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

export { timestamp, parseArray, parseLines, cpOptions, asBool };
