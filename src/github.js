const { context } = require('@actions/github');

// Returns the repo name where the Action is run in owner/repo format
const getDefaultRepoName = () => {
  let githubRepo;
  if (context.repo) {
    const { owner, repo } = context.repo;
    githubRepo = `${owner}/${repo}`;
  }
  return githubRepo;
};

module.exports = {
  getDefaultRepoName
};
