const { parseArray } = require('../src/utils');

describe('Parse a comma-delimited strings', () => {
  test('Parse string with spaces and return an array', () => {
    const input = 'tag1, tag2, tag3';
    const value = parseArray(input);
    expect(value).toEqual(['tag1', 'tag2', 'tag3']);
  });

  test('Parse string with inconsistent spaces and return an array', () => {
    const input = 'tag1,tag2, tag3';
    const value = parseArray(input);
    expect(value).toEqual(['tag1', 'tag2', 'tag3']);
  });

  test('Parse string with no spaces and return an array', () => {
    const input = 'tag1,tag2,tag3';
    const value = parseArray(input);
    expect(value).toEqual(['tag1', 'tag2', 'tag3']);
  });

  test('Parse string with no commas and return single element array', () => {
    const input = 'element';
    const value = parseArray(input);
    expect(value).toEqual(['element']);
  });

  test('Parse empty string and return undefined', () => {
    const input = '';
    const value = parseArray(input);
    expect(value).toEqual(undefined);
  });

  test('Parse undefined and return undefined', () => {
    const input = undefined;
    const value = parseArray(input);
    expect(value).toEqual(undefined);
  });
});
