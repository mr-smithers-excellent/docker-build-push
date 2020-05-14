const core = require('@actions/core');
const docker = require('./docker');
const github = require('./github');

const GITHUB_REGISTRY = 'docker.pkg.github.com';

let image;
let registry;
let tag;
let buildArgs;
let githubOwner;

// Convert buildArgs from String to Array, as GH Actions currently does not support Arrays
const processBuildArgsInput = buildArgsInput => {
  if (buildArgsInput) {
    buildArgs = buildArgsInput.split(',');
  }

  return buildArgs;
};

// Get GitHub Action inputs
const processInputs = () => {
  image = core.getInput('image', { required: true });
  registry = core.getInput('registry', { required: true });
  tag = core.getInput('tag') || docker.createTag();
  buildArgs = processBuildArgsInput(core.getInput('buildArgs'));
  githubOwner = core.getInput('githubOrg') || github.getDefaultOwner();
};

// Create the full Docker image name with registry prefix
const createFullImageName = () => {
  let imageFullName;
  if (registry === GITHUB_REGISTRY) {
    imageFullName = `${GITHUB_REGISTRY}/${githubOwner.toLowerCase()}/${image}:${tag}`;
  } else {
    imageFullName = `${registry}/${image}:${tag}`;
  }
  return imageFullName;
};

const run = () => {
  try {
    processInputs();

    const imageFullName = createFullImageName();
    core.info(`Docker image name created: ${imageFullName}`);

    docker.login();
    docker.build(imageFullName, buildArgs);
    docker.push(imageFullName);

    core.setOutput('imageFullName', imageFullName);
    core.setOutput('imageName', image);
    core.setOutput('tag', tag);
  } catch (error) {
    core.setFailed(error.message);
  }
};

module.exports = run;
