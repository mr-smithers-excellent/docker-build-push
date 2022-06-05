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

const mockInputs = (image, registry, tags, buildArgs, dockerfile, githubOrg, labels, target, platform) => {
  core.getInput = jest
    .fn()
    .mockReturnValueOnce(image)
    .mockReturnValueOnce(registry)
    .mockReturnValueOnce(tags)
    .mockReturnValueOnce(buildArgs)
    .mockReturnValueOnce(githubOrg)
    .mockReturnValueOnce(labels)
    .mockReturnValueOnce(target)
    .mockReturnValueOnce(platform)
    .mockReturnValueOnce(dockerfile);
};

const mockOutputs = (imageFullName, image, tags) => {
  core.setOutput = jest.fn().mockReturnValue('imageFullName', imageFullName);
  core.setOutput = jest.fn().mockReturnValue('imageName', image);
  core.setOutput = jest.fn().mockReturnValue('tags', tags);
};

const convertBuildArgs = buildArgs => {
  const output = buildArgs.split(',');
  return output.map(arg => `--build-arg ${arg}`).join(' ');
};

const runAssertions = (imageFullName, image, tags, dockerfile, buildArgs) => {
  expect(docker.createTags).toHaveBeenCalledTimes(1);
  expect(core.getInput).toHaveBeenCalledTimes(10);
  expect(core.setOutput).toHaveBeenCalledTimes(3);
  expect(core.setOutput).toHaveBeenCalledWith('imageFullName', imageFullName);
  expect(core.setOutput).toHaveBeenCalledWith('imageName', image);
  expect(core.setOutput).toHaveBeenCalledWith('tags', tags.join(','));

  if (buildArgs) {
    expect(cp.execSync).toHaveBeenCalledWith(
      `docker build -f ${dockerfile} -t ${imageFullName}:${tags[0]} ${convertBuildArgs(buildArgs)} .`,
      cpOptions
    );
  } else {
    expect(cp.execSync).toHaveBeenCalledWith(
      `docker build -f ${dockerfile} -t ${imageFullName}:${tags[0]} .`,
      cpOptions
    );
  }
};

const createFullImageName = (registry, image) => `${registry}/${image}`;

const createGitHubImageName = (registry, githubOrg, image) => `${registry}/${githubOrg}/${image}`;

describe('Create & push Docker image to GitHub Registry', () => {
  test('Override GitHub organization', () => {
    const image = 'repo-name/image-name';
    const registry = 'docker.pkg.github.com';
    const tags = ['latest'];
    const buildArgs = '';
    const dockerfile = 'Dockerfile';
    const githubOrg = 'override-org';
    const imageFullName = createGitHubImageName(registry, githubOrg, image);

    docker.login = jest.fn();
    docker.createTags = jest.fn().mockReturnValueOnce(tags);
    mockInputs(image, registry, null, buildArgs, dockerfile, githubOrg);
    mockOutputs(imageFullName, image, tags);
    cp.execSync = jest.fn();

    run();

    runAssertions(imageFullName, image, tags, dockerfile);
  });

  test('Keep default GitHub organization', () => {
    const image = `${mockRepoName}/image-name`;
    const registry = 'ghcr.io';
    const tags = ['latest'];
    const buildArgs = '';
    const dockerfile = 'Dockerfile';
    const imageFullName = createGitHubImageName(registry, mockOwner, image);

    docker.login = jest.fn();
    docker.createTags = jest.fn().mockReturnValueOnce(tags);
    mockInputs(image, registry, null, buildArgs, dockerfile, null);
    mockOutputs(imageFullName, image, tags);
    cp.execSync = jest.fn();

    run();

    runAssertions(imageFullName, image, tags, dockerfile);
  });

  test('Converts owner name to lowercase', () => {
    const image = `${mockRepoName}/image-name`;
    const registry = 'docker.pkg.github.com';
    const tags = ['latest'];
    const buildArgs = '';
    const dockerfile = 'Dockerfile';
    const imageFullName = createGitHubImageName(registry, 'mockuser', image);

    docker.login = jest.fn();
    docker.createTags = jest.fn().mockReturnValueOnce(tags);
    mockInputs(image, registry, null, buildArgs, dockerfile, null);
    mockOutputs(imageFullName, image, tags);
    cp.execSync = jest.fn();

    process.env.GITHUB_REPOSITORY = `MockUser/${mockRepoName}`;

    run();

    runAssertions(imageFullName, image, tags, dockerfile);
  });
});

describe('Create & push Docker image to GCR', () => {
  test('Valid Docker inputs', () => {
    const image = 'gcp-project/image';
    const registry = 'gcr.io';
    const tag = 'dev-1234667';
    const buildArgs = '';
    const dockerfile = 'Dockerfile';
    const imageFullName = createFullImageName(registry, image);

    docker.login = jest.fn();
    docker.createTags = jest.fn().mockReturnValueOnce([tag]);
    mockInputs(image, registry, null, buildArgs, dockerfile);
    mockOutputs(imageFullName, image, tag);
    cp.execSync = jest.fn();

    run();

    runAssertions(imageFullName, image, [tag], dockerfile);
  });
});

describe('Create & push Docker image with multiple tags and target', () => {
  test('Valid Docker inputs with two tags', () => {
    const image = 'gcp-project/image';
    const registry = 'gcr.io';
    const tag1 = 'latest';
    const tag2 = 'v1';
    const inputTags = ` ${tag1},   ${tag2} `;
    const outputTags = `${tag1},${tag2}`;
    const buildArgs = '';
    const dockerfile = 'Dockerfile';
    const imageFullName = createFullImageName(registry, image);
    const target = 'builder';

    docker.login = jest.fn();
    docker.createTags = jest.fn().mockReturnValueOnce([tag1]);
    mockInputs(image, registry, inputTags, buildArgs, dockerfile, null, null, target);
    mockOutputs(imageFullName, image, outputTags);
    cp.execSync = jest.fn();

    run();

    expect(docker.createTags).toHaveBeenCalledTimes(0);
    expect(core.getInput).toHaveBeenCalledTimes(10);
    expect(core.setOutput).toHaveBeenCalledTimes(3);
    expect(core.setOutput).toHaveBeenCalledWith('imageFullName', imageFullName);
    expect(core.setOutput).toHaveBeenCalledWith('imageName', image);
    expect(core.setOutput).toHaveBeenCalledWith('tags', outputTags);

    expect(cp.execSync).toHaveBeenCalledWith(
      `docker build -f ${dockerfile} -t ${imageFullName}:${tag1} -t ${imageFullName}:${tag2} --target builder .`,
      cpOptions
    );
  });
});

describe('Create & push Docker image with build args and labels and platform', () => {
  test('Valid Docker inputs with build args', () => {
    const image = 'gcp-project/image';
    const registry = 'gcr.io';
    const tag = 'latest';
    const buildArgs = 'VERSION=1.1.1,BUILD_DATE=2020-01-14';
    const platform = 'linux/amd64,linux/arm64';
    const dockerfile = 'Dockerfile.custom';
    const imageFullName = createFullImageName(registry, image);
    const labels = 'version=1.0,maintainer=mr-smithers-excellent';

    docker.login = jest.fn();
    docker.createTags = jest.fn().mockReturnValueOnce([tag]);
    mockInputs(image, registry, null, buildArgs, dockerfile, null, labels, null, platform);
    mockOutputs(imageFullName, image, tag);
    cp.execSync = jest.fn();

    run();

    expect(docker.createTags).toHaveBeenCalledTimes(1);
    expect(core.getInput).toHaveBeenCalledTimes(10);
    expect(core.setOutput).toHaveBeenCalledWith('imageFullName', imageFullName);
    expect(core.setOutput).toHaveBeenCalledWith('imageName', image);
    expect(core.setOutput).toHaveBeenCalledWith('tags', tag);

    expect(cp.execSync).toHaveBeenCalledWith(
      `docker build -f ${dockerfile} -t ${registry}/${image}:${tag} --build-arg VERSION=1.1.1 --build-arg BUILD_DATE=2020-01-14 --label version=1.0 --label maintainer=mr-smithers-excellent --platform linux/amd64,linux/arm64 .`,
      cpOptions
    );
  });
});

describe('Create Docker image causing an error', () => {
  test('Docker login error', () => {
    docker.createTags = jest.fn().mockReturnValueOnce(['some-tag']);
    docker.build = jest.fn();
    const error = 'Error: Cannot perform an interactive login from a non TTY device';
    docker.login = jest.fn().mockImplementation(() => {
      throw new Error(error);
    });
    core.setFailed = jest.fn();

    run();

    expect(docker.createTags).toHaveBeenCalledTimes(1);
    expect(core.setFailed).toHaveBeenCalledWith(error);
  });
});
