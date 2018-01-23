var SmartTaskDispatcher = artifacts.require("./SmartTaskDispatcher.sol");

module.exports = function(deployer) {
  deployer.deploy(SmartTaskDispatcher);
};
