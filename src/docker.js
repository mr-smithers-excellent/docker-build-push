const cp = require('child_process');
const core = require('@actions/core');
const fs = require('fs');
const dateFormat = require('dateformat');
const { context } = require('@actions/github');
const cpOptions = require('./settings');

const isGitHubTag = ref => ref && ref.includes('refs/tags/');

const isBranch = ref => ref && ref.includes('refs/heads/');

const timestamp = () => dateFormat(new Date(), 'yyyy-mm-dd.HHMMss');
const numericTimestamp = () => new Date().getTime();

const createTags = () => {
  core.info('Creating Docker image tags...');
  const { sha } = context;
  const addLatest = core.getInput('addLatest') === 'true';
  const addTimestamp = core.getInput('addTimestamp') === 'true';
  const numericTimestamp = core.getInput('numericTimestamp') === 'false';
  const timestamp = numericTimestamp ? numericTimestamp() : timestamp();
  const ref = context.ref.toLowerCase();
  const shortSha = sha.substring(0, 7);
  const dockerTags = [];

  if (isGitHubTag(ref)) {
    // If GitHub tag exists, use it as the Docker tag
    const tag = ref.replace('refs/tags/', '');
    dockerTags.push(tag);
  } else if (isBranch(ref)) {
    // If we're not building a tag, use branch-prefix-{GIT_SHORT_SHA) as the Docker tag
    // refs/heads/jira-123/feature/something
    const branchName = ref.replace('refs/heads/', '');
    const safeBranchName = branchName
      .replace(/[^\w.-]+/g, '-')
      .replace(/^[^\w]+/, '')
      .substring(0, 120);
    const baseTag = `${safeBranchName}-${shortSha}`;
    const tag = addTimestamp ? `${baseTag}-${timestamp}` : baseTag;
    dockerTags.push(tag);
  } else {
    core.setFailed(
      'Unsupported GitHub event - only supports push https://help.github.com/en/articles/events-that-trigger-workflows#push-event-push'
    );
  }

  if (addLatest) {
    dockerTags.push('latest');
  }

  core.info(`Docker tags created: ${dockerTags}`);
  return dockerTags;
};

const createBuildCommand = (dockerfile, imageName, tags, buildDir, buildArgs, labels, target) => {
  const tagsSuffix = tags.map(tag => `-t ${imageName}:${tag}`).join(' ');
  let buildCommandPrefix = `docker build -f ${dockerfile} ${tagsSuffix}`;

  if (buildArgs) {
    const argsSuffix = buildArgs.map(arg => `--build-arg ${arg}`).join(' ');
    buildCommandPrefix = `${buildCommandPrefix} ${argsSuffix}`;
  }

  if (labels) {
    const labelsSuffix = labels.map(label => `--label ${label}`).join(' ');
    buildCommandPrefix = `${buildCommandPrefix} ${labelsSuffix}`;
  }

  if (target) {
    const targetSuffix = `--target ${target}`;
    buildCommandPrefix = `${buildCommandPrefix} ${targetSuffix}`;
  }

  return `${buildCommandPrefix} ${buildDir}`;
};

const build = (imageName, tags, buildArgs, labels, target) => {
  const dockerfile = core.getInput('dockerfile');
  const buildDir = core.getInput('directory') || '.';

  if (!fs.existsSync(dockerfile)) {
    core.setFailed(`Dockerfile does not exist in location ${dockerfile}`);
  }

  core.info(`Building Docker image ${imageName} with tags ${tags}...`);
  cp.execSync(createBuildCommand(dockerfile, imageName, tags, buildDir, buildArgs, labels, target), cpOptions);
};

const isEcr = registry => registry && registry.includes('amazonaws');

const getRegion = registry => registry.substring(registry.indexOf('ecr.') + 4, registry.indexOf('.amazonaws'));

const login = () => {
  const registry = core.getInput('registry', { required: true });
  const username = core.getInput('username');
  const password = core.getInput('password');

  // If using ECR, use the AWS CLI login command in favor of docker login
  if (isEcr(registry)) {
    const region = getRegion(registry);
    core.info(`Logging into ECR region ${region}...`);
    cp.execSync(
      `aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${registry}`
    );
  } else if (username && password) {
    core.info(`Logging into Docker registry ${registry}...`);
    cp.execSync(`docker login -u ${username} --password-stdin ${registry}`, {
      input: password
    });
  }
};

const push = (imageName, tags) => {
  core.info(`Pushing tags ${tags} for Docker image ${imageName}...`);
  cp.execSync(`docker push ${imageName} --all-tags`, cpOptions);
};

module.exports = {
  createTags,
  build,
  login,
  push
};
