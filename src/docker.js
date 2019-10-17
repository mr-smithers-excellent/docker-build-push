const cp = require('child_process');
const core = require('@actions/core');
const fs = require('fs');
const { context } = require('@actions/github');

const isGitHubTag = ref => {
  return ref && ref.includes('refs/tags/');
};

const isMasterBranch = ref => {
  return ref && ref === 'refs/heads/master';
};

const isNotMasterBranch = ref => {
  return ref && ref.includes('refs/heads/') && ref !== 'refs/heads/master';
};

const createTag = () => {
  core.debug('Creating Docker image tag...');
  const { ref, sha } = context;
  const shortSha = sha.substring(0, 7);
  let dockerTag;

  if (isGitHubTag(ref)) {
    // If GitHub tag exists, use it as the Docker tag
    dockerTag = ref.replace('refs/tags/', '');
  } else if (isMasterBranch(ref)) {
    // If we're on the master branch, use dev-{GIT_SHORT_SHA} as the Docker tag
    dockerTag = `dev-${shortSha}`;
  } else if (isNotMasterBranch(ref)) {
    // If we're on a non-master branch, use branch-prefix-{GIT_SHORT_SHA) as the Docker tag
    // refs/heads/jira-123/feature/something
    const branchName = ref.replace('refs/heads/', '');
    const branchPrefix = branchName.substring(0, branchName.indexOf('/'));
    dockerTag = `${branchPrefix}-${shortSha}`;
  } else {
    core.setFailed(
      'Unsupported GitHub event - only supports push https://help.github.com/en/articles/events-that-trigger-workflows#push-event-push'
    );
  }
  return dockerTag;
};

const build = imageName => {
  core.debug(`Building Docker image: ${imageName}...`);
  if (!fs.existsSync('./Dockerfile')) {
    core.setFailed('Dockerfile does not exist in root project directory!');
  }

  cp.execSync(`docker build -t ${imageName} .`);
};

const login = () => {
  core.debug('Logging into Docker registry...');
  const registry = core.getInput('registry', { required: true });
  const username = core.getInput('username', { required: true });
  const password = core.getInput('password', { required: true });

  cp.execSync(`docker login -u ${username} --password-stdin ${registry}`, {
    input: password
  });
};

const push = imageName => {
  core.debug('Pushing Docker image...');
  cp.execSync(`docker push ${imageName}`);
};

module.exports = {
  createTag,
  build,
  login,
  push
};
