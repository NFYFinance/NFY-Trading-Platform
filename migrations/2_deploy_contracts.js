const NFYTradingPlatform = artifacts.require("NFYTradingPlatform");

const NFYStakingNFT = artifacts.require("mocks/NFYStakingNFT");
const LPStakingNFT = artifacts.require("mocks/LPStakingNFT");
const NFYStaking = artifacts.require("mocks/NFYStaking");
const LPStaking = artifacts.require("mocks/LPStaking");
const RewardPool = artifacts.require("mocks/RewardPool");
const Token = artifacts.require("mocks/Demo");
const LP = artifacts.require("mocks/DemoLP")

module.exports = async function (deployer, networks, accounts) {

    let rewardTokensBefore = 60000; // 60,000
    rewardTokens = web3.utils.toWei(rewardTokensBefore.toString(), 'ether');

    // Owner address
    const owner = accounts[1];

    // Deploy token
    await deployer.deploy(Token);
    await deployer.deploy(LP);

    const token = await Token.deployed();
    const lp = await LP.deployed();

    // Deploy reward pool
    await deployer.deploy(RewardPool, token.address);

    const rewardPool = await RewardPool.deployed();

    token.faucet(rewardPool.address, rewardTokens);

    // NFY Staking NFT deployment
    await deployer.deploy(NFYStakingNFT);

    // NFY/ETH LP Staking NFT deployment
    await deployer.deploy(LPStakingNFT);

    const nfyStakingNFT = await NFYStakingNFT.deployed();
    const lpStakingNFT = await LPStakingNFT.deployed()

    // NFY Staking deployment
    await deployer.deploy(NFYStaking, token.address, nfyStakingNFT.address, nfyStakingNFT.address, rewardPool.address, 10);

    // NFY/ETH LP Staking deployment
    await deployer.deploy(LPStaking, lp.address, token.address, lpStakingNFT.address, lpStakingNFT.address, rewardPool.address, 30);

    const nfyStaking = await NFYStaking.deployed();
    const lpStaking = await LPStaking.deployed();

    await nfyStakingNFT.addPlatformAddress(nfyStaking.address);
    await lpStakingNFT.addPlatformAddress(lpStaking.address);

    await rewardPool.allowTransferToStaking(nfyStaking.address, "11579208923731619542357098500868790785326998");
    await rewardPool.allowTransferToStaking(lpStaking.address, "11579208923731619542357098500868790785326998");

    // Transfer ownership to secured secured account
    await nfyStakingNFT.transferOwnership(owner);
    await lpStakingNFT.transferOwnership(owner);
    await nfyStaking.transferOwnership(owner);
    await lpStaking.transferOwnership(owner);
    await rewardPool.transferOwnership(owner);

    // Deploy Trading Platform
    await deployer.deploy(NFYTradingPlatform);
    const tradingPlatform = await NFYTradingPlatform.deployed();

    // Transfer ownership
    await tradingPlatform.transferOwnership(owner);
};