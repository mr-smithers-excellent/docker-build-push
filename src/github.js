const { context } = require('@actions/github');
const core = require('@actions/core');

// Returns the repo name where the Action is run in owner/repo format
const getDefaultRepoName = () => {
  let githubRepo;
  try {
    const { owner, repo } = context.repo;
    githubRepo = `${owner}/${repo}`;
  } catch (error) {
    core.setFailed(`Action failed with error ${error}`);
  }

  return githubRepo;
};

module.exports = {
  getDefaultRepoName
};
