import { jest } from '@jest/globals';

jest.unstable_mockModule('@actions/core', () => ({
  setFailed: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  getInput: jest.fn(),
  setOutput: jest.fn()
}));

const core = await import('@actions/core');
const { getDefaultOwner, branchRefToSlug, prRefToSlug, tagRefToSlug } = await import('../src/github.js');

describe('Get default repo & owner name', () => {
  afterEach(() => {
    core.setFailed.mockClear();
  });

  test('Returns the environment variable', () => {
    process.env.GITHUB_REPOSITORY = 'im-the-owner/this-is-my-repo';
    const owner = getDefaultOwner();

    expect(owner).toEqual('im-the-owner');
    delete process.env.GITHUB_REPOSITORY;
  });

  test('No environment variable, throws an error', () => {
    delete process.env.GITHUB_REPOSITORY;

    const error =
      "Action failed with error Error: context.repo requires a GITHUB_REPOSITORY environment variable like 'owner/repo'";

    getDefaultOwner();
    expect(core.setFailed).toHaveBeenCalledWith(error);
  });

  describe('branchRefToSlug', () => {
    test.each([
      ['refs/heads/jira-123/feature/something', 'jira-123-feature-something'],
      ['refs/heads/SOME-mixed-CASE-Branch', 'SOME-mixed-CASE-Branch'],
      ['refs/heads/feat/mybranch', 'feat-mybranch'],
      ['refs/heads/chore_mybranch--with--hyphens-', 'chore_mybranch--with--hyphens-']
    ])('branchRefToSlug for "%s" should return: %s', (d, expected) => {
      expect(branchRefToSlug(d)).toBe(expected);
    });
  });

  describe('prRefToSlug', () => {
    test.each([
      ['refs/pull/1', '1'],
      ['refs/pull/1/merge', '1'],
      ['refs/pull/123/head', '123']
    ])('prRefToSlug for "%s" should return: %s', (d, expected) => {
      expect(prRefToSlug(d)).toBe(expected);
    });
  });

  describe('tagRefToSlug', () => {
    test.each([
      ['refs/tags/v1.0', 'v1.0'],
      ['refs/tags/some-other-tag', 'some-other-tag']
    ])('tagRefToSlug for "%s" should return: %s', (d, expected) => {
      expect(tagRefToSlug(d)).toBe(expected);
    });
  });
});
