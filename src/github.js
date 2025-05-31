import { context } from '@actions/github';
import * as core from '@actions/core';

const isGitHubTag = ref => ref && ref.includes('refs/tags/');

const isBranch = ref => ref && ref.includes('refs/heads/');

const isPullRequest = ref => ref && ref.includes('refs/pull/');

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

const refToSlug = githubRef =>
  githubRef
    .replace(/[^\w.-]+/g, '-')
    .replace(/^[^\w]+/, '')
    .substring(0, 120);

const tagRefToSlug = githubRef => refToSlug(githubRef.replace('refs/tags/', ''));
const branchRefToSlug = githubRef => refToSlug(githubRef.replace('refs/heads/', ''));
const prRefToSlug = githubRef => refToSlug(githubRef.replace('refs/pull/', '').split('/').shift());

module.exports = {
  branchRefToSlug,
  getDefaultOwner,
  isBranch,
  isGitHubTag,
  isPullRequest,
  prRefToSlug,
  tagRefToSlug
};
