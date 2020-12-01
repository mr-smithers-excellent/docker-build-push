const core = require('@actions/core');
const docker = require('./docker');
const github = require('./github');

const GITHUB_REGISTRY = 'docker.pkg.github.com';

let image;
let registry;
let tags;
let buildArgs;
let githubOwner;

// Convert buildArgs from String to Array, as GH Actions currently does not support Arrays
const processBuildArgsInput = buildArgsInput => {
  if (buildArgsInput) {
    buildArgs = buildArgsInput.split(',');
  }

  return buildArgs;
};

const splitTags = stringTags =>
  stringTags === null || stringTags === undefined || stringTags === ''
    ? undefined
    : stringTags.split(',').map(tag => tag.trim());

// Get GitHub Action inputs
const processInputs = () => {
  image = core.getInput('image', { required: true });
  registry = core.getInput('registry', { required: true });
  tags = splitTags(core.getInput('tags')) || [docker.createTag()];
  buildArgs = processBuildArgsInput(core.getInput('buildArgs'));
  githubOwner = core.getInput('githubOrg') || github.getDefaultOwner();
};

// Create the full Docker image name with registry prefix (without tag)
const createFullImageName = () => {
  let imageFullName;
  if (registry === GITHUB_REGISTRY) {
    imageFullName = `${GITHUB_REGISTRY}/${githubOwner.toLowerCase()}/${image}`;
  } else {
    imageFullName = `${registry}/${image}`;
  }
  return imageFullName;
};

const run = () => {
  try {
    processInputs();

    const imageFullName = createFullImageName();
    core.info(`Docker image name created: ${imageFullName}`);

    const tagsCopy = tags.slice();
    const firstTag = tagsCopy.shift();

    docker.login();
    docker.build(imageFullName, firstTag, buildArgs);
    docker.push(imageFullName, firstTag);

    core.info(`Docker image ${imageFullName}:${firstTag} pushed to registry`);

    tagsCopy.forEach(tag => {
      docker.tag(imageFullName, firstTag, tag);
      docker.push(imageFullName, tag);
      core.info(`Docker image ${imageFullName}:${firstTag} pushed to registry`);
    });

    core.setOutput('imageFullName', imageFullName);
    core.setOutput('imageName', image);
    core.setOutput('tags', tags.join(','));
  } catch (error) {
    core.setFailed(error.message);
  }
};

module.exports = run;
