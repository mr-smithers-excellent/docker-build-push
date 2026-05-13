import { parseArray, parseLines, asBool } from '../src/utils.js';

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

describe('Parse newline-delimited strings', () => {
  test('Parse single-line value and return single element array', () => {
    const input = 'type=gha';
    const value = parseLines(input);
    expect(value).toEqual(['type=gha']);
  });

  test('Parse single value containing commas as a single entry', () => {
    const input = 'type=registry,ref=myimage:cache';
    const value = parseLines(input);
    expect(value).toEqual(['type=registry,ref=myimage:cache']);
  });

  test('Parse multiple lines and return an array of entries', () => {
    const input = 'type=registry,ref=img:PR-1-buildcache\ntype=registry,ref=img:buildcache';
    const value = parseLines(input);
    expect(value).toEqual(['type=registry,ref=img:PR-1-buildcache', 'type=registry,ref=img:buildcache']);
  });

  test('Parse lines with surrounding whitespace and blank lines', () => {
    const input = '\n  type=gha  \n\n  type=registry,ref=img:cache  \n';
    const value = parseLines(input);
    expect(value).toEqual(['type=gha', 'type=registry,ref=img:cache']);
  });

  test('Parse empty string and return undefined', () => {
    const value = parseLines('');
    expect(value).toEqual(undefined);
  });

  test('Parse whitespace-only string and return undefined', () => {
    const value = parseLines('   \n  \n');
    expect(value).toEqual(undefined);
  });

  test('Parse undefined and return undefined', () => {
    const value = parseLines(undefined);
    expect(value).toEqual(undefined);
  });
});

describe('Convert a value to a boolean', () => {
  test.each`
    value        | as             | expected
    ${true}      | ${'boolean'}   | ${true}
    ${false}     | ${'boolean'}   | ${false}
    ${'true'}    | ${'string'}    | ${true}
    ${'false'}   | ${'string'}    | ${false}
    ${'1'}       | ${'string'}    | ${true}
    ${'0'}       | ${'string'}    | ${false}
    ${'-1'}      | ${'string'}    | ${false}
    ${'N'}       | ${'string'}    | ${false}
    ${'n'}       | ${'string'}    | ${false}
    ${'No'}      | ${'string'}    | ${false}
    ${'no'}      | ${'string'}    | ${false}
    ${'Y'}       | ${'string'}    | ${true}
    ${'y'}       | ${'string'}    | ${true}
    ${'Yes'}     | ${'string'}    | ${true}
    ${'yes'}     | ${'string'}    | ${true}
    ${1}         | ${'number'}    | ${true}
    ${0}         | ${'number'}    | ${false}
    ${-1}        | ${'number'}    | ${false}
    ${undefined} | ${'undefined'} | ${false}
  `(`returns $expected for '$value' as $as`, ({ value, expected }) => {
    const result = asBool(value);
    expect(typeof result).toBe('boolean');
    expect(result).toEqual(expected);
  });
});
