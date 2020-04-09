const main = require('./docker-build-push');

if (require.main === module) {
  main.run();
}
