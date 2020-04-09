const { context } = require('@actions/github');
const core = require('@actions/core');

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
  getDefaultOwner
};
