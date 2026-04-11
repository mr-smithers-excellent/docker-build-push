import { jest } from '@jest/globals';

jest.unstable_mockModule('@actions/core', () => ({
  getInput: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
  info: jest.fn(),
  warning: jest.fn()
}));

jest.unstable_mockModule('../src/docker.js', () => ({
  createFullImageName: jest.fn(),
  createTags: jest.fn(),
  build: jest.fn(),
  login: jest.fn(),
  push: jest.fn()
}));

const core = await import('@actions/core');
const docker = await import('../src/docker.js');
const { default: run } = await import('../src/docker-build-push.js');
const { parseArray } = await import('../src/utils.js');

const mockOwner = 'owner';
const mockRepoName = 'some-repo';

const GITHUB_REGISTRY_URLS = ['docker.pkg.github.com', 'ghcr.io'];

const runAssertions = (imageFullName, inputs, tagOverrides) => {
  expect(core.getInput).toHaveBeenCalledTimes(22);

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
  // Restore createFullImageName to its real behaviour so imageFullName is computed correctly
  docker.createFullImageName.mockImplementation((registry, image, githubOwner) => {
    if (GITHUB_REGISTRY_URLS.includes(registry)) {
      return `${registry}/${githubOwner.toLowerCase()}/${image}`;
    }
    return `${registry}/${image}`;
  });
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

    docker.createTags.mockReturnValueOnce(tagOverrides);
    core.getInput.mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs, tagOverrides);
    expect(docker.build).toHaveBeenCalledWith(
      imageFullName,
      inputs.dockerfile,
      expect.objectContaining({ tags: tagOverrides })
    );
  });

  test('Keep default GitHub organization', () => {
    inputs.image = `${mockRepoName}/image-name`;
    inputs.registry = 'ghcr.io';
    imageFullName = `${inputs.registry}/${mockOwner}/${inputs.image}`;
    const tagOverrides = ['feat-123'];

    docker.createTags.mockReturnValueOnce(tagOverrides);
    core.getInput.mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs, tagOverrides);
    expect(docker.build).toHaveBeenCalledWith(
      imageFullName,
      inputs.dockerfile,
      expect.objectContaining({ tags: tagOverrides })
    );
  });

  test('Converts owner name MockUser to lowercase mockuser', () => {
    inputs.image = `${mockRepoName}/image-name`;
    inputs.registry = 'docker.pkg.github.com';
    inputs.tags = 'latest';
    const mockOrg = `MockUser`;
    process.env.GITHUB_REPOSITORY = `${mockOrg}/${mockRepoName}`;
    imageFullName = `${inputs.registry}/${mockOrg.toLowerCase()}/${inputs.image}`;

    core.getInput.mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs);
    expect(docker.build).toHaveBeenCalledWith(
      imageFullName,
      inputs.dockerfile,
      expect.objectContaining({ tags: ['latest'] })
    );
  });
});

describe('Create & push Docker image to GCR', () => {
  test('Valid Docker inputs', () => {
    inputs.image = 'gcp-project/image';
    inputs.registry = 'gcr.io';
    const tagOverrides = ['dev-1234667'];
    imageFullName = getDefaultImageName();

    docker.createTags.mockReturnValueOnce(tagOverrides);
    core.getInput.mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs, tagOverrides);
    expect(docker.build).toHaveBeenCalledWith(
      imageFullName,
      inputs.dockerfile,
      expect.objectContaining({ tags: tagOverrides, buildDir: '.' })
    );
  });

  test('Valid Docker inputs with two tags', () => {
    inputs.image = 'gcp-project/image';
    inputs.registry = 'gcr.io';
    inputs.tags = 'latest,   v1';
    inputs.target = 'builder';
    imageFullName = getDefaultImageName();

    core.getInput.mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs);
    expect(docker.build).toHaveBeenCalledWith(
      imageFullName,
      inputs.dockerfile,
      expect.objectContaining({ target: 'builder' })
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

    core.getInput.mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs);
    expect(docker.build).toHaveBeenCalledWith(
      imageFullName,
      inputs.dockerfile,
      expect.objectContaining({
        buildArgs: ['VERSION=1.1.1', 'BUILD_DATE=2020-01-14'],
        labels: ['version=1.0', 'maintainer=mr-smithers-excellent']
      })
    );
  });

  test('Valid Docker inputs with platform', () => {
    inputs.image = 'gcp-project/image';
    inputs.registry = 'gcr.io';
    inputs.tags = 'latest,   v1';
    inputs.platform = 'linux/amd64,linux/arm64';
    imageFullName = getDefaultImageName();

    core.getInput.mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs);
    expect(docker.build).toHaveBeenCalledWith(
      imageFullName,
      inputs.dockerfile,
      expect.objectContaining({ platform: 'linux/amd64,linux/arm64' })
    );
  });

  test('Enable buildKit', () => {
    inputs.image = 'gcp-project/image';
    inputs.registry = 'gcr.io';
    inputs.tags = 'latest';
    inputs.enableBuildKit = 'true';
    imageFullName = getDefaultImageName();

    core.getInput.mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs);
    expect(docker.build).toHaveBeenCalledWith(
      imageFullName,
      inputs.dockerfile,
      expect.objectContaining({ enableBuildKit: true })
    );
  });

  test('Enable multi-platform', () => {
    inputs.image = 'gcp-project/image';
    inputs.registry = 'gcr.io';
    inputs.tags = 'latest';
    inputs.multiPlatform = 'true';
    imageFullName = getDefaultImageName();

    core.getInput.mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs);
    expect(docker.build).toHaveBeenCalledWith(
      imageFullName,
      inputs.dockerfile,
      expect.objectContaining({ multiPlatform: true })
    );
  });

  test('Enable multi-platform skip push', () => {
    inputs.image = 'gcp-project/image';
    inputs.registry = 'gcr.io';
    inputs.tags = 'latest';
    inputs.multiPlatform = 'true';
    inputs.pushImage = 'false';
    imageFullName = getDefaultImageName();

    core.getInput.mockImplementation(mockGetInput(inputs));

    run();

    runAssertions(imageFullName, inputs);
    expect(docker.build).toHaveBeenCalledWith(
      imageFullName,
      inputs.dockerfile,
      expect.objectContaining({ multiPlatform: true, skipPush: true })
    );
  });

  test('Enable appendMode to combine generated and custom tags', () => {
    inputs.image = 'gcp-project/image';
    inputs.registry = 'gcr.io';
    inputs.tags = 'custom-tag';
    inputs.appendMode = 'true';
    imageFullName = getDefaultImageName();

    const generatedTags = ['auto-tag'];
    docker.createTags.mockReturnValue(generatedTags);
    core.getInput.mockImplementation(mockGetInput(inputs));

    run();

    const expectedTags = ['auto-tag', 'custom-tag'];
    expect(core.setOutput).toHaveBeenCalledWith('tags', expectedTags.toString());
    expect(docker.build).toHaveBeenCalledWith(
      imageFullName,
      inputs.dockerfile,
      expect.objectContaining({ tags: expectedTags })
    );
  });

  test('Docker login error', () => {
    const error = 'Error: Cannot perform an interactive login from a non TTY device';
    docker.login.mockImplementation(() => {
      throw new Error(error);
    });

    run();

    expect(core.setFailed).toHaveBeenCalledWith(error);
  });
});
