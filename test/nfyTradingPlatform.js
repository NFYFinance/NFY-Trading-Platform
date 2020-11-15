const NFYTradingPlatform = artifacts.require("NFYTradingPlatform");

const NFYStakingNFT = artifacts.require("mocks/NFYStakingNFT");
const LPStakingNFT = artifacts.require("mocks/LPStakingNFT");
const NFYStaking = artifacts.require("mocks/NFYStaking");
const LPStaking = artifacts.require("mocks/LPStaking");
const RewardPool = artifacts.require("mocks/RewardPool");
const Token = artifacts.require("mocks/Demo");
const LP = artifacts.require("mocks/DemoLP");

const truffleAssert = require("truffle-assertions");

contract("NFYTradingPlatform", async (accounts) => {

    let owner;
    let rewardPool;
    let user;
    let user2;
    let user3;
    let user4;
    let testPlatform;
    let rewardTokensBefore
    let token;
    let nfyStaking;
    let nfyStakingNFT;
    let lp;
    let lpStakingNFT;
    let lpStaking;
    let initialBalance;
    let stakeAmount;
    let depositAmount;

    before(async () => {

        let rewardTokensBefore = 60000; // 60,000
        rewardTokens = web3.utils.toWei(rewardTokensBefore.toString(), 'ether');

        initialBalanceBefore = 1000
        allowanceBefore = 2000;
        stakeAmountBefore = 5;
        depositAmountBefore = 3;
        rewardTokensBefore = 60000

        initialBalance = web3.utils.toWei(initialBalanceBefore.toString(), 'ether');
        allowance = web3.utils.toWei(allowanceBefore.toString(), 'ether');
        stakeAmount = web3.utils.toWei(stakeAmountBefore.toString(), 'ether');
        depositAmount = web3.utils.toWei(depositAmountBefore.toString(), 'ether');
        rewardTokens = web3.utils.toWei(rewardTokensBefore.toString(), 'ether');

        // Owner address
        owner = accounts[1];
        user = accounts[3];
        user2 = accounts[4];
        user3 = accounts[5];
        user4 = accounts[6];

    });

    beforeEach(async () => {

        // Deploy token
        token = await Token.new();
        lp = await LP.new();
        nfyStakingNFT = await NFYStakingNFT.new();
        lpStakingNFT = await LPStakingNFT.new();

        rewardPool = await RewardPool.new(token.address);

        token.faucet(rewardPool.address, rewardTokens);

        // NFY Staking deployment
        nfyStaking = await NFYStaking.new(token.address, nfyStakingNFT.address, nfyStakingNFT.address, rewardPool.address, 10);

        // NFY/ETH LP Staking deployment
        lpStaking = await LPStaking.new(lp.address, token.address, lpStakingNFT.address, lpStakingNFT.address, rewardPool.address, 30);

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

        // TRADING PLATFORM //

        // Deploy Trading Platform
        tradingPlatform = await NFYTradingPlatform.new();

        // Add trading platform as platform address
        await nfyStakingNFT.addPlatformAddress(tradingPlatform.address);
        await lpStakingNFT.addPlatformAddress(tradingPlatform.address);
        await nfyStaking.addPlatformAddress(tradingPlatform.address);
        await lpStaking.addPlatformAddress(tradingPlatform.address);

        // Transfer ownership to secured secured account
        await nfyStakingNFT.transferOwnership(owner);
        await lpStakingNFT.transferOwnership(owner);
        await nfyStaking.transferOwnership(owner);
        await lpStaking.transferOwnership(owner);
        await rewardPool.transferOwnership(owner);
        await tradingPlatform.transferOwnership(owner);

    });

    describe("# constructor()", () => {
        it("should set Owner properly", async () => {
            assert.strictEqual(owner, await tradingPlatform.owner());
        });
    });

    describe("# addToken()", () => {
        it("should allow owner to add token", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", token.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));
            const tokens = await tradingPlatform.getTokens();
        });

        it("should NOT allow non owner to add token", async () => {
            await truffleAssert.reverts(tradingPlatform.addToken("NFYNFT", token.address, nfyStakingNFT.address, nfyStaking.address, {from: user}));
            const tokens = await tradingPlatform.getTokens();
            assert.strictEqual(tokens.length, 0);
        });

        it("should start with 0 tokens", async () => {
            const tokens = await tradingPlatform.getTokens();
            assert.strictEqual(tokens.length, 0);
        });

        it("should have 1 token after add", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", token.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));
            const tokens = await tradingPlatform.getTokens();
            assert.strictEqual(tokens.length, 1);
        });
    });

    describe("# depositStake()", () => {
        it("should let user deposit stake", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", token.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));
            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, depositAmount, {from: user}));
        });
    });

    /*describe("# withdrawStake()", () => {
        it("should mint NFT if user does not have one", async () => {

        });
    });*/
});