const MoraribleMarketContract = artifacts.require("MoraribleMarketContract");

module.exports = function (deployer) {
  deployer.deploy(MoraribleMarketContract);
};