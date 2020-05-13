jest.mock('@actions/core');
jest.mock('child_process');

const core = require('@actions/core');
const cp = require('child_process');
const docker = require('../src/docker');
const run = require('../src/docker-build-push');
const cpOptions = require('../src/settings');

const mockOwner = 'owner';
const mockRepoName = 'some-repo';

beforeAll(() => {
  docker.push = jest.fn();
  process.env.GITHUB_REPOSITORY = `${mockOwner}/${mockRepoName}`;
});

afterAll(() => {
  delete process.env.GITHUB_REPOSITORY;
});

const mockInputs = (image, registry, tag, buildArgs, dockerfile, githubOrg) => {
  core.getInput = jest
    .fn()
    .mockReturnValueOnce(image)
    .mockReturnValueOnce(registry)
    .mockReturnValueOnce(tag)
    .mockReturnValueOnce(buildArgs)
    .mockReturnValueOnce(githubOrg)
    .mockReturnValueOnce(dockerfile);
};

const mockOutputs = (imageFullName, image, tag) => {
  core.setOutput = jest.fn().mockReturnValue('imageFullName', imageFullName);
  core.setOutput = jest.fn().mockReturnValue('imageName', image);
  core.setOutput = jest.fn().mockReturnValue('tag', tag);
};

const convertBuildArgs = buildArgs => {
  const output = buildArgs.split(',');
  return output.map(arg => `--build-arg ${arg}`).join(' ');
};

const runAssertions = (imageFullName, image, tag, dockerfile, buildArgs) => {
  expect(docker.createTag).toHaveBeenCalledTimes(1);
  expect(core.getInput).toHaveBeenCalledTimes(7);
  expect(core.setOutput).toHaveBeenCalledTimes(3);
  expect(core.setOutput).toHaveBeenCalledWith('imageFullName', imageFullName);
  expect(core.setOutput).toHaveBeenCalledWith('imageName', image);
  expect(core.setOutput).toHaveBeenCalledWith('tag', tag);

  if (buildArgs) {
    expect(cp.execSync).toHaveBeenCalledWith(
      `docker build -f ${dockerfile} -t ${imageFullName} ${convertBuildArgs(buildArgs)} .`,
      cpOptions
    );
  } else {
    expect(cp.execSync).toHaveBeenCalledWith(`docker build -f ${dockerfile} -t ${imageFullName} .`, cpOptions);
  }
};

const createFullImageName = (registry, image, tag) => {
  return `${registry}/${image}:${tag}`;
};

const createGitHubImageName = (registry, githubOrg, image, tag) => {
  return `${registry}/${githubOrg}/${image}:${tag}`;
};

describe('Create & push Docker image to GitHub Registry', () => {
  test('Override GitHub organization', () => {
    const image = 'repo-name/image-name';
    const registry = 'docker.pkg.github.com';
    const tag = 'latest';
    const buildArgs = '';
    const dockerfile = 'Dockerfile';
    const githubOrg = 'override-org';
    const imageFullName = createGitHubImageName(registry, githubOrg, image, tag);

    docker.login = jest.fn();
    docker.createTag = jest.fn().mockReturnValueOnce(tag);
    mockInputs(image, registry, null, buildArgs, dockerfile, githubOrg);
    mockOutputs(imageFullName, image, tag);
    cp.execSync = jest.fn();

    run();

    runAssertions(imageFullName, image, tag, dockerfile);
  });

  test('Keep default GitHub organization', () => {
    const image = `${mockRepoName}/image-name`;
    const registry = 'docker.pkg.github.com';
    const tag = 'latest';
    const buildArgs = '';
    const dockerfile = 'Dockerfile';
    const imageFullName = createGitHubImageName(registry, mockOwner, image, tag);

    docker.login = jest.fn();
    docker.createTag = jest.fn().mockReturnValueOnce(tag);
    mockInputs(image, registry, null, buildArgs, dockerfile, null);
    mockOutputs(imageFullName, image, tag);
    cp.execSync = jest.fn();

    run();

    runAssertions(imageFullName, image, tag, dockerfile);
  });

  test('Converts owner name to lowercase', () => {
    const image = `${mockRepoName}/image-name`;
    const registry = 'docker.pkg.github.com';
    const tag = 'latest';
    const buildArgs = '';
    const dockerfile = 'Dockerfile';
    const imageFullName = createGitHubImageName(registry, 'mockuser', image, tag);

    docker.login = jest.fn();
    docker.createTag = jest.fn().mockReturnValueOnce(tag);
    mockInputs(image, registry, null, buildArgs, dockerfile, null);
    mockOutputs(imageFullName, image, tag);
    cp.execSync = jest.fn();

    process.env.GITHUB_REPOSITORY = `MockUser/${mockRepoName}`;

    run();

    runAssertions(imageFullName, image, tag, dockerfile);
  });
});

describe('Create & push Docker image to GCR', () => {
  test('Valid Docker inputs', () => {
    const image = 'gcp-project/image';
    const registry = 'gcr.io';
    const tag = 'dev-1234667';
    const buildArgs = '';
    const dockerfile = 'Dockerfile';
    const imageFullName = createFullImageName(registry, image, tag);

    docker.login = jest.fn();
    docker.createTag = jest.fn().mockReturnValueOnce(tag);
    mockInputs(image, registry, null, buildArgs, dockerfile);
    mockOutputs(imageFullName, image, tag);
    cp.execSync = jest.fn();

    run();

    runAssertions(imageFullName, image, tag, dockerfile);
  });
});

describe('Create & push Docker image with build args', () => {
  test('Valid Docker inputs with build args', () => {
    const image = 'gcp-project/image';
    const registry = 'gcr.io';
    const tag = 'latest';
    const buildArgs = 'VERSION=1.1.1,BUILD_DATE=2020-01-14';
    const dockerfile = 'Dockerfile.custom';
    const imageFullName = createFullImageName(registry, image, tag);

    docker.login = jest.fn();
    docker.createTag = jest.fn().mockReturnValueOnce(tag);
    mockInputs(image, registry, null, buildArgs, dockerfile);
    mockOutputs(imageFullName, image, tag);
    cp.execSync = jest.fn();

    run();

    runAssertions(imageFullName, image, tag, dockerfile, buildArgs);

    expect(docker.createTag).toHaveBeenCalledTimes(1);
    expect(core.getInput).toHaveBeenCalledTimes(7);
    expect(core.setOutput).toHaveBeenCalledWith('imageFullName', imageFullName);
    expect(core.setOutput).toHaveBeenCalledWith('imageName', image);
    expect(core.setOutput).toHaveBeenCalledWith('tag', tag);

    expect(cp.execSync).toHaveBeenCalledWith(
      `docker build -f ${dockerfile} -t ${registry}/${image}:${tag} --build-arg VERSION=1.1.1 --build-arg BUILD_DATE=2020-01-14 .`,
      cpOptions
    );
  });
});

describe('Create Docker image causing an error', () => {
  test('Docker login error', () => {
    docker.createTag = jest.fn().mockReturnValueOnce('some-tag');
    docker.build = jest.fn();
    const error = 'Error: Cannot perform an interactive login from a non TTY device';
    docker.login = jest.fn().mockImplementation(() => {
      throw new Error(error);
    });
    core.setFailed = jest.fn();

    run();

    expect(docker.createTag).toHaveBeenCalledTimes(1);
    expect(core.setFailed).toHaveBeenCalledWith(error);
  });
});
