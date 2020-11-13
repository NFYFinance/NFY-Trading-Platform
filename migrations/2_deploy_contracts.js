const NFYTradingPlatform = artifacts.require("NFYTradingPlatform");

module.exports = async function (deployer, networks, accounts) {

    const owner = accounts[2];

    // Deploy Trading Platform
    await deployer.deploy(NFYTradingPlatform);

    const tradingPlatform = await NFYTradingPlatform.deployed();

    // Transfer ownership
    await tradingPlatform.transferOwnership(owner);
};