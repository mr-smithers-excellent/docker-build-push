jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('child_process');

const core = require('@actions/core');
const cp = require('child_process');
const docker = require('../src/docker');
const main = require('../src/docker-build-push');
const maxBufferSize = require('../src/settings');

const mockOwner = 'owner';
const mockRepoName = 'some-repo';

beforeAll(() => {
  docker.push = jest.fn();
  main.getRepoName = jest.fn().mockReturnValue(`${mockOwner}/${mockRepoName}`);
});

const mockInputs = (image, registry, tag, buildArgs, dockerfile, githubRepo) => {
  core.getInput = jest
    .fn()
    .mockReturnValueOnce(image)
    .mockReturnValueOnce(registry)
    .mockReturnValueOnce(tag)
    .mockReturnValueOnce(buildArgs)
    .mockReturnValueOnce(githubRepo)
    .mockReturnValueOnce(dockerfile);
};

describe('Create & push Docker image to GitHub Registry - override repo', () => {
  test('Valid Docker inputs', () => {
    const image = 'image-name';
    const registry = 'docker.pkg.github.com';
    const tag = 'latest';
    const buildArgs = '';
    const dockerfile = 'Dockerfile';
    const githubRepo = 'override-repo';
    const githubFullImageName = `${registry}/${githubRepo}/${image}:${tag}`;

    docker.login = jest.fn();
    docker.createTag = jest.fn().mockReturnValueOnce(tag);
    mockInputs(image, registry, null, buildArgs, dockerfile, githubRepo);
    core.setOutput = jest.fn().mockReturnValueOnce('imageFullName', githubFullImageName);
    cp.execSync = jest.fn();

    main.run();

    expect(docker.createTag).toHaveBeenCalledTimes(1);
    expect(core.getInput).toHaveBeenCalledTimes(6);
    expect(core.setOutput).toHaveBeenCalledWith('imageFullName', githubFullImageName);
    expect(cp.execSync).toHaveBeenCalledWith(`docker build -f ${dockerfile} -t ${githubFullImageName} .`, {
      maxBuffer: maxBufferSize
    });
  });
});

describe('Create & push Docker image to GitHub Registry - default repo', () => {
  test('Valid Docker inputs', () => {
    const image = 'image-name';
    const registry = 'docker.pkg.github.com';
    const tag = 'latest';
    const buildArgs = '';
    const dockerfile = 'Dockerfile';
    const githubFullImageName = `${registry}/${mockOwner}/${mockRepoName}/${image}:${tag}`;

    docker.login = jest.fn();
    docker.createTag = jest.fn().mockReturnValueOnce(tag);
    mockInputs(image, registry, null, buildArgs, dockerfile);
    core.setOutput = jest.fn().mockReturnValueOnce('imageFullName', githubFullImageName);
    cp.execSync = jest.fn();

    main.run();

    expect(docker.createTag).toHaveBeenCalledTimes(1);
    expect(core.getInput).toHaveBeenCalledTimes(5);
    expect(core.setOutput).toHaveBeenCalledWith('imageFullName', githubFullImageName);
    expect(cp.execSync).toHaveBeenCalledWith(`docker build -f ${dockerfile} -t ${githubFullImageName} .`, {
      maxBuffer: maxBufferSize
    });
  });
});

describe('Create & push Docker image', () => {
  test('Valid Docker inputs', () => {
    const image = 'gcp-project/image';
    const registry = 'gcr.io';
    const tag = 'dev-1234667';
    const buildArgs = '';
    const dockerfile = 'Dockerfile';

    docker.login = jest.fn();
    docker.createTag = jest.fn().mockReturnValueOnce(tag);
    mockInputs(image, registry, null, buildArgs, dockerfile);
    core.setOutput = jest.fn().mockReturnValueOnce('imageFullName', `${registry}/${image}:${tag}`);
    cp.execSync = jest.fn();

    main.run();

    expect(docker.createTag).toHaveBeenCalledTimes(1);
    expect(core.getInput).toHaveBeenCalledTimes(6);
    expect(core.setOutput).toHaveBeenCalledWith('imageFullName', `${registry}/${image}:${tag}`);
    expect(cp.execSync).toHaveBeenCalledWith(`docker build -f ${dockerfile} -t ${registry}/${image}:${tag} .`, {
      maxBuffer: maxBufferSize
    });
  });
});

describe('Create & push Docker image with build args', () => {
  test('Valid Docker inputs with build args', () => {
    const image = 'gcp-project/image';
    const registry = 'gcr.io';
    const tag = 'latest';
    const buildArgs = 'VERSION=1.1.1,BUILD_DATE=2020-01-14';
    const dockerfile = 'Dockerfile.custom';

    docker.login = jest.fn();
    docker.createTag = jest.fn().mockReturnValueOnce(tag);
    mockInputs(image, registry, null, buildArgs, dockerfile);
    core.setOutput = jest.fn().mockReturnValueOnce('imageFullName', `${registry}/${image}:${tag}`);
    cp.execSync = jest.fn();

    main.run();

    expect(docker.createTag).toHaveBeenCalledTimes(1);
    expect(core.getInput).toHaveBeenCalledTimes(6);
    expect(core.setOutput).toHaveBeenCalledWith('imageFullName', `${registry}/${image}:${tag}`);
    expect(cp.execSync).toHaveBeenCalledWith(
      `docker build -f ${dockerfile} -t ${registry}/${image}:${tag} --build-arg VERSION=1.1.1 --build-arg BUILD_DATE=2020-01-14 .`,
      {
        maxBuffer: maxBufferSize
      }
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

    main.run();

    expect(docker.createTag).toHaveBeenCalledTimes(1);
    expect(core.setFailed).toHaveBeenCalledWith(error);
  });
});
