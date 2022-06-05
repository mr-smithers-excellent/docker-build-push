jest.mock('@actions/core');
jest.mock('child_process');

const core = require('@actions/core');
const cp = require('child_process');
const docker = require('../src/docker');
const run = require('../src/docker-build-push');
const { parseArray, cpOptions } = require('../src/utils');

const mockOwner = 'owner';
const mockRepoName = 'some-repo';

const runAssertions = (imageFullName, inputs) => {
  // Inputs
  expect(core.getInput).toHaveBeenCalledTimes(13);
  expect(docker.createTags).toHaveBeenCalledTimes(0);

  // Outputs
  expect(core.setOutput).toHaveBeenCalledTimes(3);
  expect(core.setOutput).toHaveBeenCalledWith('imageFullName', imageFullName);
  expect(core.setOutput).toHaveBeenCalledWith('imageName', inputs.image);
  expect(core.setOutput).toHaveBeenCalledWith('tags', parseArray(inputs.tags).toString());
};

const mockGetInput = requestResponse => name => requestResponse[name];

const DEFAULT_INPUTS = {
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
  dockerfile: undefined,
  buildDir: '.'
};

beforeAll(() => {
  docker.push = jest.fn();
  docker.login = jest.fn();
  cp.execSync = jest.fn();
  process.env.GITHUB_REPOSITORY = `${mockOwner}/${mockRepoName}`;
});

beforeEach(() => {
  jest.clearAllMocks();
  core.getInput = jest.fn().mockImplementation(mockGetInput(DEFAULT_INPUTS));
});

afterAll(() => {
  delete process.env.GITHUB_REPOSITORY;
});

describe('Create & push Docker image to GitHub Registry', () => {
  test('Override GitHub organization', () => {
    const inputs = {
      image: 'repo-name/image-name',
      registry: 'docker.pkg.github.com',
      tags: 'latest',
      dockerfile: 'Dockerfile',
      githubOrg: 'override-org'
    };
    const imageFullName = `${inputs.registry}/${inputs.githubOrg}/${inputs.image}`;

    docker.createTags = jest.fn().mockReturnValueOnce(inputs.tags);
    core.getInput = jest.fn().mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs);

    expect(cp.execSync).toHaveBeenCalledWith(
      `docker build -f ${inputs.dockerfile} -t ${inputs.registry}/${inputs.githubOrg}/${inputs.image}:${inputs.tags} .`,
      cpOptions
    );
  });

  test('Keep default GitHub organization', () => {
    const inputs = {
      image: `${mockRepoName}/image-name`,
      registry: 'ghcr.io',
      tags: 'latest',
      dockerfile: 'Dockerfile'
    };
    const imageFullName = `${inputs.registry}/${mockOwner}/${inputs.image}`;

    docker.createTags = jest.fn().mockReturnValueOnce(inputs.tags);
    core.getInput = jest.fn().mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs);

    expect(cp.execSync).toHaveBeenCalledWith(
      `docker build -f ${inputs.dockerfile} -t ${inputs.registry}/${mockOwner.toLowerCase()}/${inputs.image}:${
        inputs.tags
      } .`,
      cpOptions
    );
  });

  test('Converts owner name MockUser to lowercase mockuser', () => {
    const inputs = {
      image: `${mockRepoName}/image-name`,
      registry: 'docker.pkg.github.com',
      tags: 'latest',
      dockerfile: 'Dockerfile'
    };
    const mockOrg = `MockUser`;
    process.env.GITHUB_REPOSITORY = `${mockOrg}/${mockRepoName}`;
    const imageFullName = `${inputs.registry}/${mockOrg.toLowerCase()}/${inputs.image}`;

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
    const inputs = {
      image: 'gcp-project/image',
      registry: 'gcr.io',
      tags: 'dev-1234667',
      dockerfile: 'Dockerfile'
    };
    const imageFullName = `${inputs.registry}/${inputs.image}`;

    docker.createTags = jest.fn().mockReturnValueOnce(inputs.tags);
    core.getInput = jest.fn().mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs);

    expect(cp.execSync).toHaveBeenCalledWith(
      `docker build -f ${inputs.dockerfile} -t ${inputs.registry}/${inputs.image}:${inputs.tags} .`,
      cpOptions
    );
  });

  test('Valid Docker inputs with two tags', () => {
    const inputs = {
      image: 'gcp-project/image',
      registry: 'gcr.io',
      tags: 'latest,   v1',
      buildArgs: '',
      dockerfile: 'Dockerfile',
      target: 'builder'
    };
    const imageFullName = `${inputs.registry}/${inputs.image}`;

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
    const inputs = {
      image: 'gcp-project/image',
      registry: 'gcr.io',
      tags: 'latest',
      buildArgs: 'VERSION=1.1.1,BUILD_DATE=2020-01-14',
      dockerfile: 'Dockerfile.custom',
      labels: 'version=1.0,maintainer=mr-smithers-excellent'
    };
    const imageFullName = `${inputs.registry}/${inputs.image}`;

    docker.createTags = jest.fn().mockReturnValueOnce(inputs.tags);
    core.getInput = jest.fn().mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs);

    expect(cp.execSync).toHaveBeenCalledWith(
      `docker build -f ${inputs.dockerfile} -t ${inputs.registry}/${inputs.image}:latest --build-arg VERSION=1.1.1 --build-arg BUILD_DATE=2020-01-14 --label version=1.0 --label maintainer=mr-smithers-excellent .`,
      cpOptions
    );
  });
});

// describe('Create Docker image causing an error', () => {
//   test('Docker login error', () => {
//     docker.createTags = jest.fn().mockReturnValueOnce(['some-tag']);
//     docker.build = jest.fn();
//     const error = 'Error: Cannot perform an interactive login from a non TTY device';
//     docker.login = jest.fn().mockImplementation(() => {
//       throw new Error(error);
//     });
//     core.setFailed = jest.fn();

//     run();

//     expect(docker.createTags).toHaveBeenCalledTimes(1);
//     expect(core.setFailed).toHaveBeenCalledWith(error);
//   });
// });
