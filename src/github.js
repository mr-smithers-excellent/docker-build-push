const { context } = require('@actions/github');
const core = require('@actions/core');

const isGitHubTag = ref => ref && ref.includes('refs/tags/');

const isBranch = ref => ref && ref.includes('refs/heads/');

// Returns owning organization of the repo where the Action is run
const getDefaultOwner = () => {
  let owner;
  try {
    const { repo } = context;
    owner = repo.owner;
  } catch (error) {
    core.setFailed(`Action failed with error ${error}`);
  }

  return owner;
};

module.exports = {
  isGitHubTag,
  isBranch,
  getDefaultOwner
};
