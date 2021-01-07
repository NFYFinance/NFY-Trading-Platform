const NFYTradingPlatform = artifacts.require("NFYTradingPlatform");

module.exports = async function (deployer, networks, accounts) {

    const rewardPoolAddress = "0x2f822dA8016d5e8ce3c93b53eE1528392Ca3ac57";
    const nfyAddress = "0x1cBb83EbcD552D5EBf8131eF8c9CD9d9BAB342bC";
    const owner = "0x5530fb19c22B1B410708b0A9fD230c714cbA12Ed";

    const devFeeAddress = "0x628c3A02DC2f08F3592286150dbD679725832765";
    const communityAddress = "0x51e486E7D62a798Ff8c9bc105C1372B15C939669";

    // TRADING PLATFORM //

    // Deploy Trading Platform
    await deployer.deploy(NFYTradingPlatform, nfyAddress, rewardPoolAddress, web3.utils.toWei('0.25', 'ether'), devFeeAddress, communityAddress, owner);
    const tradingPlatform = await NFYTradingPlatform.deployed();

    // Transfer ownership
    await tradingPlatform.transferOwnership(owner);
};