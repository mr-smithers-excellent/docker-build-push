const core = require('@actions/core');
const docker = require('./docker');

const run = async () => {
  try {
    // Get GitHub Action inputs
    const image = core.getInput('image', { required: true });
    const registry = core.getInput('registry', { required: true });
    const tag = core.getInput('tag') || docker.createTag();

    const imageName = `${registry}/${image}:${tag}`;

    docker.login();
    docker.build(imageName);
    docker.push(imageName);

    core.setOutput(imageName);
  } catch (error) {
    core.setFailed(error.message);
  }
};

module.exports = run;
