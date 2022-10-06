jest.mock('@actions/core');

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  execSync: jest.fn(),
  setFailed: jest.fn()
}));

jest.mock('../src/docker', () => ({
  ...jest.requireActual('../src/docker'),
  createTags: jest.fn(),
  push: jest.fn(),
  login: jest.fn()
}));

const core = require('@actions/core');
const cp = require('child_process');
const docker = require('../src/docker');
const run = require('../src/docker-build-push');
const { parseArray, cpOptions } = require('../src/utils');

const mockOwner = 'owner';
const mockRepoName = 'some-repo';

const runAssertions = (imageFullName, inputs, tagOverrides) => {
  // Inputs
  expect(core.getInput).toHaveBeenCalledTimes(16);

  // Outputs
  const tags = tagOverrides || parseArray(inputs.tags);
  expect(core.setOutput).toHaveBeenCalledTimes(3);
  expect(core.setOutput).toHaveBeenCalledWith('imageFullName', imageFullName);
  expect(core.setOutput).toHaveBeenCalledWith('imageName', inputs.image);
  expect(core.setOutput).toHaveBeenCalledWith('tags', tags.toString());
};

const mockGetInput = requestResponse => name => requestResponse[name];

let inputs;
let imageFullName;

const getDefaultImageName = () => `${inputs.registry}/${inputs.image}`;

beforeAll(() => {
  process.env.GITHUB_REPOSITORY = `${mockOwner}/${mockRepoName}`;
});

beforeEach(() => {
  jest.clearAllMocks();
  inputs = {
    image: undefined,
    registry: undefined,
    username: undefined,
    password: undefined,
    addLatest: false,
    addTimestamp: false,
    tags: undefined,
    buildArgs: undefined,
    githubOrg: undefined,
    labels: undefined,
    target: undefined,
    dockerfile: 'Dockerfile',
    buildDir: '.',
    enableBuildKit: undefined,
    platform: undefined
  };
  imageFullName = undefined;
});

afterAll(() => {
  delete process.env.GITHUB_REPOSITORY;
});

describe('Create & push Docker image to GitHub Registry', () => {
  test('Override GitHub organization', () => {
    inputs.image = 'repo-name/image-name';
    inputs.registry = 'docker.pkg.github.com';
    inputs.githubOrg = 'override-org';
    imageFullName = `${inputs.registry}/${inputs.githubOrg}/${inputs.image}`;
    const tagOverrides = ['staging-123'];

    docker.createTags = jest.fn().mockReturnValueOnce(tagOverrides);
    core.getInput = jest.fn().mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs, tagOverrides);

    expect(cp.execSync).toHaveBeenCalledWith(
      `docker build -f ${inputs.dockerfile} -t ${inputs.registry}/${inputs.githubOrg}/${inputs.image}:${tagOverrides} .`,
      cpOptions
    );
  });

  test('Keep default GitHub organization', () => {
    inputs.image = `${mockRepoName}/image-name`;
    inputs.registry = 'ghcr.io';
    imageFullName = `${inputs.registry}/${mockOwner}/${inputs.image}`;
    const tagOverrides = ['feat-123'];

    docker.createTags = jest.fn().mockReturnValueOnce(tagOverrides);
    core.getInput = jest.fn().mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs, tagOverrides);

    expect(cp.execSync).toHaveBeenCalledWith(
      `docker build -f ${inputs.dockerfile} -t ${inputs.registry}/${mockOwner.toLowerCase()}/${
        inputs.image
      }:${tagOverrides} .`,
      cpOptions
    );
  });

  test('Converts owner name MockUser to lowercase mockuser', () => {
    inputs.image = `${mockRepoName}/image-name`;
    inputs.registry = 'docker.pkg.github.com';
    inputs.tags = 'latest';
    const mockOrg = `MockUser`;
    process.env.GITHUB_REPOSITORY = `${mockOrg}/${mockRepoName}`;
    imageFullName = `${inputs.registry}/${mockOrg.toLowerCase()}/${inputs.image}`;

    docker.createTags = jest.fn().mockReturnValueOnce(inputs.tags);
    core.getInput = jest.fn().mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs);

    expect(cp.execSync).toHaveBeenCalledWith(
      `docker build -f ${inputs.dockerfile} -t ${inputs.registry}/${mockOrg.toLowerCase()}/${inputs.image}:${
        inputs.tags
      } .`,
      cpOptions
    );
  });
});

describe('Create & push Docker image to GCR', () => {
  test('Valid Docker inputs', () => {
    inputs.image = 'gcp-project/image';
    inputs.registry = 'gcr.io';
    const tagOverrides = ['dev-1234667'];
    imageFullName = getDefaultImageName();

    docker.createTags = jest.fn().mockReturnValueOnce(tagOverrides);
    core.getInput = jest.fn().mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs, tagOverrides);

    expect(cp.execSync).toHaveBeenCalledWith(
      `docker build -f ${inputs.dockerfile} -t ${inputs.registry}/${inputs.image}:${tagOverrides} .`,
      cpOptions
    );
  });

  test('Valid Docker inputs with two tags', () => {
    inputs.image = 'gcp-project/image';
    inputs.registry = 'gcr.io';
    inputs.tags = 'latest,   v1';
    inputs.target = 'builder';
    imageFullName = getDefaultImageName();

    docker.createTags = jest.fn().mockReturnValueOnce(inputs.tags);
    core.getInput = jest.fn().mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs);

    expect(cp.execSync).toHaveBeenCalledWith(
      `docker build -f ${inputs.dockerfile} -t ${inputs.registry}/${inputs.image}:latest -t ${inputs.registry}/${inputs.image}:v1 --target ${inputs.target} .`,
      cpOptions
    );
  });

  test('Valid Docker inputs with build args', () => {
    inputs.image = 'gcp-project/image';
    inputs.registry = 'gcr.io';
    inputs.tags = 'latest';
    inputs.buildArgs = 'VERSION=1.1.1,BUILD_DATE=2020-01-14';
    inputs.dockerfile = 'Dockerfile.custom';
    inputs.labels = 'version=1.0,maintainer=mr-smithers-excellent';
    imageFullName = getDefaultImageName();

    docker.createTags = jest.fn().mockReturnValueOnce(inputs.tags);
    core.getInput = jest.fn().mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs);

    expect(cp.execSync).toHaveBeenCalledWith(
      `docker build -f ${inputs.dockerfile} -t ${inputs.registry}/${inputs.image}:latest --build-arg VERSION=1.1.1 --build-arg BUILD_DATE=2020-01-14 --label version=1.0 --label maintainer=mr-smithers-excellent .`,
      cpOptions
    );
  });

  test('Valid Docker inputs with platform', () => {
    inputs.image = 'gcp-project/image';
    inputs.registry = 'gcr.io';
    inputs.tags = 'latest,   v1';
    inputs.platform = 'linux/amd64,linux/arm64';
    imageFullName = getDefaultImageName();

    docker.createTags = jest.fn().mockReturnValueOnce(inputs.tags);
    core.getInput = jest.fn().mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs);

    expect(cp.execSync).toHaveBeenCalledWith(
      `docker build -f ${inputs.dockerfile} -t ${inputs.registry}/${inputs.image}:latest -t ${inputs.registry}/${inputs.image}:v1 --platform ${inputs.platform} .`,
      cpOptions
    );
  });

  test('Enable buildKit', () => {
    inputs.image = 'gcp-project/image';
    inputs.registry = 'gcr.io';
    inputs.tags = 'latest';
    inputs.enableBuildKit = 'true';
    imageFullName = getDefaultImageName();

    docker.createTags = jest.fn().mockReturnValueOnce(inputs.tags);
    core.getInput = jest.fn().mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs);

    expect(cp.execSync).toHaveBeenCalledWith(
      `DOCKER_BUILDKIT=1 docker build -f ${inputs.dockerfile} -t ${inputs.registry}/${inputs.image}:latest .`,
      cpOptions
    );
  });

  test('Docker login error', () => {
    const error = 'Error: Cannot perform an interactive login from a non TTY device';
    docker.login = jest.fn().mockImplementation(() => {
      throw new Error(error);
    });

    run();

    expect(core.setFailed).toHaveBeenCalledWith(error);
  });
});
