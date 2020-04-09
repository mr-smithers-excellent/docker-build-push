const github = require('../src/github');

describe('Get default repo name', () => {
  test('Returns the environment variable', () => {
    process.env.GITHUB_REPOSITORY = 'im-the-owner/this-is-my-repo';
    const repoName = github.getDefaultRepoName();

    expect(repoName).toEqual('im-the-owner/this-is-my-repo');
    delete process.env.GITHUB_REPOSITORY;
  });
});
