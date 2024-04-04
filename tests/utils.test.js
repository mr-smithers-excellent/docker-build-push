const { parseArray, asBool } = require('../src/utils');

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
