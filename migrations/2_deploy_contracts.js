const NFYTradingPlatform = artifacts.require("NFYTradingPlatform");

const NFYStakingNFT = artifacts.require("mocks/NFYStakingNFT");
const LPStakingNFT = artifacts.require("mocks/LPStakingNFT");
const NFYStaking = artifacts.require("mocks/NFYStaking");
const LPStaking = artifacts.require("mocks/LPStaking");
const RewardPool = artifacts.require("mocks/RewardPool");
const Token = artifacts.require("mocks/Demo");
const LP = artifacts.require("mocks/DemoLP");

module.exports = async function (deployer, networks, accounts) {

    // MOCKS //
  //           //
    let rewardTokensBefore = 60000; // 60,000
    rewardTokens = web3.utils.toWei(rewardTokensBefore.toString(), 'ether');

    initialBalanceBefore = 1000
    allowanceBefore = 2000;
    stakeAmountBefore = 5;
    rewardTokensBefore = 60000

    initialBalance = web3.utils.toWei(initialBalanceBefore.toString(), 'ether');
    allowance = web3.utils.toWei(allowanceBefore.toString(), 'ether');
    stakeAmount = web3.utils.toWei(stakeAmountBefore.toString(), 'ether');
    rewardTokens = web3.utils.toWei(rewardTokensBefore.toString(), 'ether');

    // Owner address
    const owner = accounts[1];
    const initialDev = accounts[1];

    const user = accounts[3];

    const user2 = accounts[4];

    const user3 = accounts[5];

    const devAddress = accounts[6];

    const communityAddress = accounts[7];


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

    // DEMO LP token faucet
    await lp.faucet(user, initialBalance);
    await lp.faucet(user2, initialBalance);
    await lp.faucet(user3, initialBalance);

    // Approve LP staking address
    await lp.approve(lpStaking.address, allowance, {from: user});
    await lp.approve(lpStaking.address, allowance, {from: user2});
    await lp.approve(lpStaking.address, allowance, {from: user3});

    // DEMO NFY faucet
    await token.faucet(user, initialBalance);
    await token.faucet(user2, initialBalance);
    await token.faucet(user3, initialBalance);

    // Approve NFY staking address
    await token.approve(nfyStaking.address, allowance, {from: user});
    await token.approve(nfyStaking.address, allowance, {from: user2});
    await token.approve(nfyStaking.address, allowance, {from: user3});

    // Stake DEMO LP Tokens
    await lpStaking.stakeLP(stakeAmount, {from: user});
    await lpStaking.stakeLP(stakeAmount, {from: user2});
    await lpStaking.stakeLP(stakeAmount, {from: user3});

    // Stake DEMO NFY Tokens
    await nfyStaking.stakeNFY(stakeAmount, {from: user});
    await nfyStaking.stakeNFY(stakeAmount, {from: user2});
    await nfyStaking.stakeNFY(stakeAmount, {from: user3});

    // END MOCKS  //
      //       //


    // TRADING PLATFORM //

    // Deploy Trading Platform
    await deployer.deploy(NFYTradingPlatform, token.address, rewardPool.address, web3.utils.toWei('0.25', 'ether'), devAddress, communityAddress, devAddress);
    const tradingPlatform = await NFYTradingPlatform.deployed();

    // Transfer ownership to secured secured account
    await nfyStakingNFT.transferOwnership(owner);
    await lpStakingNFT.transferOwnership(owner);
    await nfyStaking.transferOwnership(owner);
    await lpStaking.transferOwnership(owner);
    await rewardPool.transferOwnership(owner);
    await tradingPlatform.transferOwnership(owner);
};