const NFYTradingPlatform = artifacts.require("NFYTradingPlatform");

const NFYStakingNFT = artifacts.require("mocks/NFYStakingNFT");
const LPStakingNFT = artifacts.require("mocks/LPStakingNFT");
const NFYStaking = artifacts.require("mocks/NFYStaking");
const LPStaking = artifacts.require("mocks/LPStaking");
const RewardPool = artifacts.require("mocks/RewardPool");
const Token = artifacts.require("mocks/Demo");
const LP = artifacts.require("mocks/DemoLP");

const truffleAssert = require("truffle-assertions");
const helper = require('./utils/utils.js');

contract("NFYTradingPlatform", async (accounts) => {

    let owner;
    let rewardPool;
    let user;
    let user2;
    let user3;
    let user4;
    let devAddress;
    let communityAddress;
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
        user5 = accounts[7];
        devAddress = accounts[8];
        communityAddress = accounts[9];
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
        await lp.faucet(user3, web3.utils.toWei('20','ether'));

        // Approve LP staking address
        await lp.approve(lpStaking.address, allowance, {from: user});
        await lp.approve(lpStaking.address, allowance, {from: user2});
        await lp.approve(lpStaking.address, allowance, {from: user3});

        // DEMO NFY faucet
        await token.faucet(user, initialBalance);
        await token.faucet(user2, initialBalance);
        await token.faucet(user3, web3.utils.toWei('20','ether'));
        await token.faucet(user4, initialBalance);

        // Approve NFY staking address
        await token.approve(nfyStaking.address, allowance, {from: user});
        await token.approve(nfyStaking.address, allowance, {from: user2});
        await token.approve(nfyStaking.address, allowance, {from: user3});

        // Stake DEMO LP Tokens
        await lpStaking.stakeLP(web3.utils.toWei('20', 'ether'), {from: user});
        await lpStaking.stakeLP(web3.utils.toWei('20', 'ether'), {from: user2});
        await lpStaking.stakeLP(web3.utils.toWei('20', 'ether'), {from: user3});

        // Stake DEMO NFY Tokens
        await nfyStaking.stakeNFY(web3.utils.toWei('20', 'ether'), {from: user});
        await nfyStaking.stakeNFY(web3.utils.toWei('20', 'ether'), {from: user2});
        await nfyStaking.stakeNFY(web3.utils.toWei('20', 'ether'), {from: user3});

        // TRADING PLATFORM //

        // Deploy Trading Platform
        tradingPlatform = await NFYTradingPlatform.new(token.address, rewardPool.address, web3.utils.toWei('0.25', 'ether'), devAddress, communityAddress, devAddress);

        await token.approve(tradingPlatform.address, allowance, {from: user});
        await token.approve(tradingPlatform.address, allowance, {from: user2});
        await token.approve(tradingPlatform.address, allowance, {from: user3});
        await token.approve(tradingPlatform.address, allowance, {from: user4});
        await token.approve(tradingPlatform.address, allowance, {from: user5});

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

        it("should set nfy address properly", async () => {
            assert.strictEqual(token.address, await tradingPlatform.NFYToken());
        });

        it("should set reward pool address properly", async () => {
            assert.strictEqual(rewardPool.address, await tradingPlatform.rewardPool());
        });

        it("should set fee properly", async () => {
            assert.strictEqual(web3.utils.toWei('0.25', 'ether'), (BigInt(await tradingPlatform.platformFee())).toString());
        });

        it("should set dev fund address properly", async () => {
            assert.strictEqual(devAddress, await tradingPlatform.devAddress());

        });

        it("should set community fund address properly", async () => {
            assert.strictEqual(communityAddress, await tradingPlatform.communityFund());
        });
    });

    describe("# setFee()", () => {
        it("should NOT let a non owner change the fee", async () => {
            await truffleAssert.reverts(tradingPlatform.setFee(web3.utils.toWei('1', 'ether'), {from: user}));
        });

        it("should let owner change the fee", async () => {
            await truffleAssert.passes(tradingPlatform.setFee(web3.utils.toWei('1', 'ether'), {from: owner}));
        });

        it("should properly update fee when changed", async () => {
            await truffleAssert.passes(tradingPlatform.setFee(web3.utils.toWei('1', 'ether'), {from: owner}));

            assert.strictEqual(web3.utils.toWei('1', 'ether'), (BigInt(await tradingPlatform.platformFee())).toString());
        });
    });

    describe("# getTraderBalance()", () => {
       it("should start balance of user at 0", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            assert.strictEqual(BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT")).toString(), "0");
       });

       it("should update balance of user on deposit", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            console.log(BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT")).toString());
            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, depositAmount, {from: user}));

            console.log(BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT")).toString());
            assert.strictEqual(BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT")).toString(), depositAmount.toString());
       });

       it("should update balance of user on withdraw", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, depositAmount, {from: user}));
            assert.strictEqual(BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT")).toString(), depositAmount.toString());

            await truffleAssert.passes(tradingPlatform.withdrawStake("NFYNFT", depositAmount, {from: user}));
            assert.strictEqual(BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT")).toString(), "0");
       });

       it("should start balance of new stake added at 0", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            console.log(BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT")).toString());
            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, depositAmount, {from: user}));

            console.log(BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT")).toString());
            assert.strictEqual(BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT")).toString(), depositAmount.toString());

            await truffleAssert.passes(tradingPlatform.addToken("LPNFT", lpStakingNFT.address, lpStakingNFT.address, lpStaking.address, {from: owner}));
            assert.strictEqual(BigInt(await tradingPlatform.getTraderBalance(user, "LPNFT")).toString(), "0");
       });
    });

    describe("# getEthBalance()", () => {
       it("should start eth balance of user at 0", async () => {
            assert.strictEqual(BigInt(await tradingPlatform.getEthBalance(user)).toString(), "0");
       });

       it("should update balance of user on eth deposit", async () => {
            console.log(BigInt(await tradingPlatform.getEthBalance(user)).toString());
            await truffleAssert.passes(tradingPlatform.depositEth({from: user, value: web3.utils.toWei('3', 'ether')}));

            console.log(BigInt(await tradingPlatform.getEthBalance(user)).toString());
            assert.strictEqual(BigInt(await tradingPlatform.getEthBalance(user)).toString(), web3.utils.toWei('3', 'ether').toString());
       });

       it("should update balance of user on eth withdraw", async () => {

            await truffleAssert.passes(tradingPlatform.depositEth({from: user, value: web3.utils.toWei('3', 'ether')}));
            assert.strictEqual(BigInt(await tradingPlatform.getEthBalance(user)).toString(), web3.utils.toWei('3', 'ether').toString());

            await truffleAssert.passes(tradingPlatform.withdrawEth(web3.utils.toWei('3', 'ether'), {from: user}));
            assert.strictEqual(BigInt(await tradingPlatform.getEthBalance(user)).toString(), '0');
       });
    });

    describe("# addToken()", () => {
        it("should allow owner to add token", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));
            const tokens = await tradingPlatform.getTokens();
        });

        it("should NOT allow non owner to add token", async () => {
            await truffleAssert.reverts(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: user}));
            const tokens = await tradingPlatform.getTokens();
            assert.strictEqual(tokens.length, 0);
        });

        it("should start with 0 tokens", async () => {
            const tokens = await tradingPlatform.getTokens();
            assert.strictEqual(tokens.length, 0);
        });

        it("should have 1 token after add", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));
            const tokens = await tradingPlatform.getTokens();
            assert.strictEqual(tokens.length, 1);
        });

        it("should have 2 token after second add", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));
            await truffleAssert.passes(tradingPlatform.addToken("LPNFT", lpStakingNFT.address, lpStakingNFT.address, lpStaking.address, {from: owner}));
            const tokens = await tradingPlatform.getTokens();
            assert.strictEqual(tokens.length, 2);
        });
    });

    describe("# depositEth()", () => {
        it("should allow a user to deposit eth", async () => {
            await truffleAssert.passes(tradingPlatform.depositEth({from: user, value: web3.utils.toWei('3', 'ether')}));
        });
    });

    describe("# withdrawEth()", () => {
        it("should NOT allow a user to withdraw 0 eth", async () => {
            await truffleAssert.reverts(tradingPlatform.withdrawEth(web3.utils.toWei('0', 'ether'), {from: user}));
        });

        it("should NOT allow a user to withdraw eth when they do not have any in trading platform", async () => {
            await truffleAssert.passes(tradingPlatform.depositEth({from: user, value: web3.utils.toWei('5', 'ether')}));

            await truffleAssert.reverts(tradingPlatform.withdrawEth(web3.utils.toWei('3', 'ether'), {from: user2}));
        });

        it("should allow a user to withdraw eth", async () => {
            await truffleAssert.passes(tradingPlatform.depositEth({from: user, value: web3.utils.toWei('5', 'ether')}));

            await truffleAssert.passes(tradingPlatform.withdrawEth(web3.utils.toWei('3', 'ether'), {from: user}));
        });
    });

    describe("# depositStake()", () => {
        it("should let user deposit stake", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));
            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, depositAmount, {from: user}));
            assert.strictEqual(BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT")).toString(), depositAmount.toString());
        });

        it("should let user deposit stake twice and update balance", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));
            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, depositAmount, {from: user}));
            assert.strictEqual(BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT")).toString(), depositAmount.toString());

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, depositAmount, {from: user}));
            assert.strictEqual(BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT")).toString(), web3.utils.toWei('6', 'ether').toString());
        });

        it("should revert if stake NFT does NOT exist", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.reverts(tradingPlatform.depositStake("TESTNFT", 1, depositAmount, {from: user}));
        });

        it("should revert if user is NOT owner of the NFT id", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.reverts(tradingPlatform.depositStake("NFYNFT", 2, depositAmount, {from: user}));
        });

        it("should revert if deposit amount is greater than balance of stake NFT", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.reverts(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('21', 'ether'), {from: user}));
        });

        it("should send proper rewards when user deposits their stake", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await nfyStaking.claimAllRewards({from: user});
            const balanceBefore = BigInt(await token.balanceOf(user));

            console.log(balanceBefore);

            const rewardPerBlock = await nfyStaking.getRewardPerBlock();

            let i = 0;
            while(i < 20){
            await helper.advanceBlock();
            i++;
            }

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('10', 'ether'), {from: user}));

            const balanceAfter = BigInt(await token.balanceOf(user));

            console.log(balanceAfter - balanceBefore);

            const expectedRewards = BigInt(rewardPerBlock) * BigInt(21) / BigInt(3) - BigInt(10);

            assert.strictEqual((balanceBefore + expectedRewards).toString(), (balanceAfter).toString());
        });
    });

    describe("# withdrawStake()", () => {
        it("should revert if user tries to withdraw with no balance", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.reverts(tradingPlatform.withdrawStake("NFYNFT", web3.utils.toWei('1', 'ether'), {from: user}));
        });

        it("should revert if user tries to withdraw more than balance", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, depositAmount, {from: user}));

            await truffleAssert.reverts(tradingPlatform.withdrawStake("NFYNFT", web3.utils.toWei('4', 'ether'), {from: user}));
        });

        it("should allow user to withdraw if less than balance", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, depositAmount, {from: user}));

            await truffleAssert.passes(tradingPlatform.withdrawStake("NFYNFT", web3.utils.toWei('2', 'ether'), {from: user}));
        });

        it("should allow user to withdraw if equal to balance", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, depositAmount, {from: user}));

            await truffleAssert.passes(tradingPlatform.withdrawStake("NFYNFT", depositAmount, {from: user}));
        });

        it("should set user's balance to 0 after they withdraw", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, depositAmount, {from: user}));

            await truffleAssert.passes(tradingPlatform.withdrawStake("NFYNFT", depositAmount, {from: user}));

            assert.strictEqual((BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT"))).toString(), '0');
        });

        it("should NOT let a user withdraw after they already withdrew balance", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, depositAmount, {from: user}));

            await truffleAssert.passes(tradingPlatform.withdrawStake("NFYNFT", depositAmount, {from: user}));

            assert.strictEqual((BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT"))).toString(), '0');

            await truffleAssert.reverts(tradingPlatform.withdrawStake("NFYNFT", depositAmount, {from: user}));
        });

        it("should allow user who unstakes to withdraw and new nft is minted", async () =>  {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, depositAmount, {from: user}));

            await nfyStaking.unstakeNFY(1, {from: user});

            await truffleAssert.passes(tradingPlatform.withdrawStake("NFYNFT", web3.utils.toWei('2', 'ether'), {from: user}));

            assert.strictEqual((BigInt(await nfyStaking.getNFTBalance(4))).toString(), web3.utils.toWei ('2','ether'));
            assert.strictEqual(await nfyStaking.checkIfNFTInCirculation(1), false);
            assert.strictEqual(await nfyStaking.checkIfNFTInCirculation(4), true);
            console.log(BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT")));
        });

        it("should allow a user who never had a nft to withdraw and nft is minted", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, depositAmount, {from: user}));
            await truffleAssert.passes(tradingPlatform.depositEth({value: web3.utils.toWei('2', 'ether'), from: user4}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('2', 'ether'), web3.utils.toWei('0.05', 'ether'), 1, {from: user}));
            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.06', 'ether'), 0, {from: user4}));

            await truffleAssert.passes(tradingPlatform.withdrawStake("NFYNFT", web3.utils.toWei('2', 'ether'), {from: user4}));
        });

        it("should update properly when a user gets minted a nft", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, depositAmount, {from: user}));
            await truffleAssert.passes(tradingPlatform.depositEth({value: web3.utils.toWei('2', 'ether'), from: user4}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('2', 'ether'), web3.utils.toWei('0.05', 'ether'), 1, {from: user}));
            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.06', 'ether'), 0, {from: user4}));

            await truffleAssert.passes(tradingPlatform.withdrawStake("NFYNFT", web3.utils.toWei('2', 'ether'), {from: user4}));

            assert.strictEqual((BigInt(await nfyStaking.getNFTBalance(4))).toString(), web3.utils.toWei ('2','ether'));
            assert.strictEqual(await nfyStaking.checkIfNFTInCirculation(1), true);
            assert.strictEqual(await nfyStaking.checkIfNFTInCirculation(4), true);
            console.log(BigInt(await tradingPlatform.getTraderBalance(user4, "NFYNFT")));
        });

        it("should send proper rewards when user withdraws their stake", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('10', 'ether'), {from: user}));

            await nfyStaking.claimAllRewards({from: user});
            const balanceBefore = BigInt(await token.balanceOf(user));

            console.log(balanceBefore);

            const rewardPerBlock = await nfyStaking.getRewardPerBlock();

            let i = 0;
            while(i < 20){
            await helper.advanceBlock();
            i++;
            }

            await truffleAssert.passes(tradingPlatform.withdrawStake("NFYNFT", web3.utils.toWei('10', 'ether'), {from: user}));

            const balanceAfter = BigInt(await token.balanceOf(user));

            console.log(balanceAfter - balanceBefore);

            const expectedRewards = BigInt(rewardPerBlock) * BigInt(21) / BigInt(6) - BigInt(5);

            assert.strictEqual((balanceBefore + expectedRewards).toString(), (balanceAfter).toString());
        });
    });

    describe("# createLimitOrder()", () => {
        it("should revert if stakeNFT does not exist", async () => {
            await truffleAssert.reverts(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('1', 'ether'), web3.utils.toWei('0.03', 'ether'), 0, {from: user}));
        });

        it("should revert if user does not have stake deposited", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.reverts(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('1', 'ether'), web3.utils.toWei('0.03', 'ether'), 0, {from: user}));
        });

        it("should revert if user does not have enough NFY to cover fee", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 3, web3.utils.toWei('6', 'ether'), {from: user3}));

            await truffleAssert.reverts(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.003', 'ether'), 1, {from: user3}));
        });

        it("should update reward pool with fee when taken out", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('6', 'ether'), {from: user}));

            let rewardBefore = BigInt(await token.balanceOf(rewardPool.address));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.003', 'ether'), 1, {from: user}));

            console.log(((BigInt(await token.balanceOf(rewardPool.address))) - rewardBefore).toString());
            assert.strictEqual(((BigInt(await token.balanceOf(rewardPool.address))) - rewardBefore).toString(), web3.utils.toWei('0.2125', 'ether'));
        });

        it("should update dev fund with portion of fee", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('6', 'ether'), {from: user}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.003', 'ether'), 1, {from: user}));

            assert.strictEqual((BigInt(await token.balanceOf(devAddress))).toString(), web3.utils.toWei('0.025', 'ether'));
        });

        it("should update community fund with portion of fee", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('6', 'ether'), {from: user}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.003', 'ether'), 1, {from: user}));

            assert.strictEqual((BigInt(await token.balanceOf(communityAddress))).toString(), web3.utils.toWei('0.0125', 'ether'));
        });

        it("should let a user create a sell order if conditions are met", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('6', 'ether'), {from: user}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.003', 'ether'), 1, {from: user}));
            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('1', 'ether'), web3.utils.toWei('0.003', 'ether'), 1, {from: user}));
        });

        it("should let a user create a buy order if conditions are met", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositEth({value: web3.utils.toWei("6", "ether"), from: user}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei("1000", "ether"), web3.utils.toWei("0.003", "ether"), 0, {from: user}));

            assert.strictEqual((BigInt(await tradingPlatform.getEthBalance(user))).toString(), web3.utils.toWei("3", "ether"));

            let orders = await tradingPlatform.getOrders("NFYNFT", 0);

            assert.strictEqual(orders.length, 1);
        });

        it("should NOT let a user create an order with ticker ETH", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('6', 'ether'), {from: user}));

            await truffleAssert.reverts(tradingPlatform.createLimitOrder("ETH", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.003', 'ether'), 1, {from: user}));
        });

        it("should NOT let a user create a sell order and does not have enough", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('6', 'ether'), {from: user}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.003', 'ether'), 1, {from: user}));
            await truffleAssert.reverts(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('2', 'ether'), web3.utils.toWei('0.003', 'ether'), 1, {from: user}));
        });

        it("should add order to order book after a sell order has been created", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('6', 'ether'), {from: user}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.003', 'ether'), 1, {from: user}));

            let orders = await tradingPlatform.getOrders("NFYNFT", 1);

            assert.strictEqual(orders.length, 1);
        });

        it("should add order to order book after a buy order has been created", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositEth({value: web3.utils.toWei("6", "ether"), from: user}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei("1000", "ether"), web3.utils.toWei("0.003", "ether"), 0, {from: user}));

            assert.strictEqual((BigInt(await tradingPlatform.getEthBalance(user))).toString(), web3.utils.toWei("3", "ether"));

            let orders = await tradingPlatform.getOrders("NFYNFT", 0);

            assert.strictEqual(orders.length, 1);
            assert.strictEqual(orders[0].id, '0');
            assert.strictEqual(orders[0].userAddress, user);
            assert.strictEqual(orders[0].side, '0');
            assert.strictEqual(orders[0].amount, web3.utils.toWei('1000', 'ether'));
            assert.strictEqual(orders[0].filled, '0');
            assert.strictEqual(orders[0].price, web3.utils.toWei('0.003', 'ether'));
        });

        it("should have added proper information to orders when sell order has been created", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('6', 'ether'), {from: user}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.003', 'ether'), 1, {from: user}));

            let orders = await tradingPlatform.getOrders("NFYNFT", 1);
        });

        it("should update filled if some of sell order is filled", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('6', 'ether'), {from: user}));
            await truffleAssert.passes(tradingPlatform.depositEth({from: user2, value: web3.utils.toWei('3', 'ether')}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.03', 'ether'), 1, {from: user}));
            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('1', 'ether'), web3.utils.toWei('0.03', 'ether'), 0, {from: user2}));

            let orders = await tradingPlatform.getOrders("NFYNFT", 1);

            console.log(await tradingPlatform.getEthBalance(user));
            assert.strictEqual(orders[0].filled, web3.utils.toWei('1', 'ether'));
        });

        it("should update filled if some of buy order is filled", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositEth({value: web3.utils.toWei("6", "ether"), from: user4}));
            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei("10", "ether"), {from: user}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei("100", "ether"), web3.utils.toWei("0.03", "ether"), 0, {from: user4}));


            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('10', 'ether'), web3.utils.toWei('0.02', 'ether'), 1, {from: user}));

            let orders = await tradingPlatform.getOrders("NFYNFT", 0);

            assert.strictEqual(orders[0].filled, web3.utils.toWei('10', 'ether'));

            console.log(await tradingPlatform.getEthBalance(user));
            assert.strictEqual((BigInt(await tradingPlatform.getEthBalance(user))).toString(), web3.utils.toWei('0.30', 'ether'));
            assert.strictEqual((BigInt(await tradingPlatform.getEthBalance(user4))).toString(), web3.utils.toWei('3', 'ether'));

            assert.strictEqual((BigInt(await tradingPlatform.getTraderBalance(user4, "NFYNFT"))).toString(), web3.utils.toWei("10", "ether"));
        });



        it("should create a new order if sell limit order is filled", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('6', 'ether'), {from: user}));
            await truffleAssert.passes(tradingPlatform.depositEth({from: user2, value: web3.utils.toWei('3', 'ether')}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.03', 'ether'), 1, {from: user}));
            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('6', 'ether'), web3.utils.toWei('0.03', 'ether'), 0, {from: user2}));

            let sellOrders = await tradingPlatform.getOrders("NFYNFT", 1);
            let buyOrders = await tradingPlatform.getOrders("NFYNFT", 0);

            assert.strictEqual(buyOrders[0].filled, web3.utils.toWei('0', 'ether'));
            assert.strictEqual(buyOrders[0].amount, web3.utils.toWei('1', 'ether'));
        });

        it("should create new limit order if nothing on the side of market order", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('6', 'ether'), {from: user}));
            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 2, web3.utils.toWei('6', 'ether'), {from: user2}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.03', 'ether'), 1, {from: user}));
            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('4', 'ether'), web3.utils.toWei('0.029', 'ether'), 1, {from: user2}));

            let sellOrders = await tradingPlatform.getOrders("NFYNFT", 1);

            console.log(sellOrders);
        });

        it("should NOT let a user create a sell order if more than they have deposited", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('6', 'ether'), {from: user}));

            await truffleAssert.reverts(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('7', 'ether'), web3.utils.toWei('0.03', 'ether'), 1, {from: user}));
        });

        it("should NOT let a user create a buy order if more eth than they have deposited", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositEth({from: user, value: web3.utils.toWei('3', 'ether')}));

            await truffleAssert.reverts(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('101', 'ether'), web3.utils.toWei('0.03', 'ether'), 0, {from: user}));
        });

        it("should properly fill limit order and take proper eth from user", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, depositAmount, {from: user}));
            await truffleAssert.passes(tradingPlatform.depositEth({value: web3.utils.toWei('2', 'ether'), from: user4}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('2', 'ether'), web3.utils.toWei('0.05', 'ether'), 1, {from: user}));
            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.06', 'ether'), 0, {from: user4}));

            assert.strictEqual((BigInt(await tradingPlatform.getEthBalance(user4))).toString(), web3.utils.toWei('1.72', 'ether'));
            assert.strictEqual((BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT"))).toString(), web3.utils.toWei('1', 'ether'));

            let buyOrders = await tradingPlatform.getOrders("NFYNFT", 0);

            console.log(buyOrders.length);

            assert.strictEqual(buyOrders[0].amount, web3.utils.toWei('3', 'ether'));
            assert.strictEqual(buyOrders[0].price, web3.utils.toWei('0.06', 'ether'));
        });

        it("should update the eth balance of a seller when their sell order gets filled", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, depositAmount, {from: user}));
            await truffleAssert.passes(tradingPlatform.depositEth({value: web3.utils.toWei('2', 'ether'), from: user4}));

            assert.strictEqual((BigInt(await tradingPlatform.getEthBalance(user))).toString(), web3.utils.toWei('0', 'ether'));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('2', 'ether'), web3.utils.toWei('0.05', 'ether'), 1, {from: user}));
            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.05', 'ether'), 0, {from: user4}));

            await truffleAssert.passes(tradingPlatform.withdrawStake("NFYNFT", web3.utils.toWei('2', 'ether'), {from: user4}));

            assert.strictEqual((BigInt(await tradingPlatform.getEthBalance(user))).toString(), web3.utils.toWei('0.10', 'ether'));
        });

        it("should properly fill the rest of a users order after the initial amount is filled", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('8', 'ether'), {from: user}));
            await truffleAssert.passes(tradingPlatform.depositEth({value: web3.utils.toWei('2', 'ether'), from: user4}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('2', 'ether'), web3.utils.toWei('0.05', 'ether'), 1, {from: user}));
            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.05', 'ether'), 0, {from: user4}));

            assert.strictEqual((BigInt(await tradingPlatform.getTraderBalance(user4, "NFYNFT"))).toString(), web3.utils.toWei('2', 'ether'));

            assert.strictEqual((BigInt(await tradingPlatform.getEthBalance(user4))).toString(), web3.utils.toWei('1.75', 'ether'));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.04', 'ether'), 1, {from: user}));

            assert.strictEqual((BigInt(await tradingPlatform.getTraderBalance(user4, "NFYNFT"))).toString(), web3.utils.toWei('5', 'ether'));
            assert.strictEqual((BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT"))).toString(), web3.utils.toWei('1', 'ether'));
        });
    });

    describe("# cancelOrder()", () => {
        it("should revert if stakeNFT does not exist", async () => {
            await truffleAssert.reverts(tradingPlatform.cancelOrder("NFYNFT", 1, {from: user}));
        });

        it("should allow user to cancel their sell order that is not filled at all", async () => {

            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('6', 'ether'), {from: user}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.003', 'ether'), 1, {from: user}));

            await truffleAssert.passes(tradingPlatform.cancelOrder("NFYNFT", 1, {from: user}));
        });

        it("should allow user to cancel their buy order that is not filled at all", async () => {

            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositEth({value: web3.utils.toWei('6', 'ether'), from: user}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.003', 'ether'), 0, {from: user}));

            await truffleAssert.passes(tradingPlatform.cancelOrder("NFYNFT", 0, {from: user}));
        });

        it("should NOT let a user cancel sell order if they have no sell orders", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('6', 'ether'), {from: user}));

            await truffleAssert.reverts(tradingPlatform.cancelOrder("NFYNFT", 1, {from: user}));
        });

        it("should NOT let a user cancel buy order if they have no buy orders", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('6', 'ether'), {from: user}));

            await truffleAssert.reverts(tradingPlatform.cancelOrder("NFYNFT", 0, {from: user}));
        });

        it("should update balance after unfilled sell order is cancelled", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei("6", "ether"), {from: user}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei("5", "ether"), web3.utils.toWei("0.003", "ether"), 1, {from: user}));

            assert.strictEqual((BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT"))).toString(), web3.utils.toWei("1", "ether"));

            await truffleAssert.passes(tradingPlatform.cancelOrder("NFYNFT", 1, {from: user}));

            assert.strictEqual((BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT"))).toString(), web3.utils.toWei("6", "ether"));
        });

        it("should update balance after unfilled buy order is cancelled", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositEth({value: web3.utils.toWei("6", "ether"), from: user}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei("1000", "ether"), web3.utils.toWei("0.003", "ether"), 0, {from: user}));

            assert.strictEqual((BigInt(await tradingPlatform.getEthBalance(user))).toString(), web3.utils.toWei("3", "ether"));

            await truffleAssert.passes(tradingPlatform.cancelOrder("NFYNFT", 0, {from: user}));

            assert.strictEqual((BigInt(await tradingPlatform.getEthBalance(user))).toString(), web3.utils.toWei("6", "ether"));
        });

        it("should remove sell order from array once cancelled", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei("6", "ether"), {from: user}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei("5", "ether"), web3.utils.toWei("0.003", "ether"), 1, {from: user}));

            assert.strictEqual((BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT"))).toString(), web3.utils.toWei("1", "ether"));

            let ordersBefore = await tradingPlatform.getOrders("NFYNFT", 1);

            assert.strictEqual(ordersBefore.length, 1);

            await truffleAssert.passes(tradingPlatform.cancelOrder("NFYNFT", 1, {from: user}));

            assert.strictEqual((BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT"))).toString(), web3.utils.toWei("6", "ether"));

            let ordersAfter = await tradingPlatform.getOrders("NFYNFT", 1);

            assert.strictEqual(ordersAfter.length, 0);
        });

        it("should remove buy order from array once cancelled", async () => {

            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositEth({value: web3.utils.toWei("6", "ether"), from: user}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei("1000", "ether"), web3.utils.toWei("0.003", "ether"), 0, {from: user}));

            assert.strictEqual((BigInt(await tradingPlatform.getEthBalance(user))).toString(), web3.utils.toWei("3", "ether"));

            let ordersBefore = await tradingPlatform.getOrders("NFYNFT", 0);

            assert.strictEqual(ordersBefore.length, 1);

            await truffleAssert.passes(tradingPlatform.cancelOrder("NFYNFT", 0, {from: user}));

            assert.strictEqual((BigInt(await tradingPlatform.getEthBalance(user))).toString(), web3.utils.toWei("6", "ether"));

            let ordersAfter = await tradingPlatform.getOrders("NFYNFT", 0);

            assert.strictEqual(ordersAfter.length, 0);
        });

        it("should cancel a partly filled sell order", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('6', 'ether'), {from: user}));
            await truffleAssert.passes(tradingPlatform.depositEth({value: web3.utils.toWei("6", "ether"), from: user2}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.03', 'ether'), 1, {from: user}));
            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei("3", "ether"), web3.utils.toWei("0.03", "ether"), 0, {from: user2}));

            await truffleAssert.passes(tradingPlatform.cancelOrder("NFYNFT", 1, {from: user}));
        });

        it("should cancel a partly filled buy order", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositEth({value: web3.utils.toWei("6", "ether"), from: user}));
            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 2, web3.utils.toWei('6', 'ether'), {from: user2}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei("5", "ether"), web3.utils.toWei("0.03", "ether"), 0, {from: user}));
            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('3', 'ether'), web3.utils.toWei('0.03', 'ether'), 1, {from: user2}));

            await truffleAssert.passes(tradingPlatform.cancelOrder("NFYNFT", 0, {from: user}));
        });

        it("should cancel a partly filled sell order and update balances properly", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 1, web3.utils.toWei('6', 'ether'), {from: user}));
            await truffleAssert.passes(tradingPlatform.depositEth({value: web3.utils.toWei("6", "ether"), from: user2}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('5', 'ether'), web3.utils.toWei('0.03', 'ether'), 1, {from: user}));
            assert.strictEqual((BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT"))).toString(), web3.utils.toWei("1", "ether"));

            assert.strictEqual((BigInt(await tradingPlatform.getTraderBalance(user2, "NFYNFT"))).toString(), web3.utils.toWei("0", "ether"));
            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei("3", "ether"), web3.utils.toWei("0.03", "ether"), 0, {from: user2}));

            await truffleAssert.passes(tradingPlatform.cancelOrder("NFYNFT", 1, {from: user}));

            assert.strictEqual((BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT"))).toString(), web3.utils.toWei("3", "ether"));
            assert.strictEqual((BigInt(await tradingPlatform.getEthBalance(user))).toString(), web3.utils.toWei("0.09", "ether"));
        });

        it("should cancel a partly filled buy order and update balances properly", async () => {
            await truffleAssert.passes(tradingPlatform.addToken("NFYNFT", nfyStakingNFT.address, nfyStakingNFT.address, nfyStaking.address, {from: owner}));

            await truffleAssert.passes(tradingPlatform.depositEth({value: web3.utils.toWei("6", "ether"), from: user}));
            await truffleAssert.passes(tradingPlatform.depositStake("NFYNFT", 2, web3.utils.toWei('6', 'ether'), {from: user2}));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei("5", "ether"), web3.utils.toWei("0.03", "ether"), 0, {from: user}));
            assert.strictEqual((BigInt(await tradingPlatform.getEthBalance(user))).toString(), web3.utils.toWei("5.85", "ether"));

            await truffleAssert.passes(tradingPlatform.createLimitOrder("NFYNFT", web3.utils.toWei('3', 'ether'), web3.utils.toWei('0.03', 'ether'), 1, {from: user2}));
            assert.strictEqual((BigInt(await tradingPlatform.getTraderBalance(user2, "NFYNFT"))).toString(), web3.utils.toWei("3", "ether"));
            assert.strictEqual((BigInt(await tradingPlatform.getEthBalance(user2))).toString(), web3.utils.toWei("0.09", "ether"));

            orders = await tradingPlatform.getOrders("NFYNFT", 0);

            await truffleAssert.passes(tradingPlatform.cancelOrder("NFYNFT", 0, {from: user}));

            assert.strictEqual((BigInt(await tradingPlatform.getTraderBalance(user, "NFYNFT"))).toString(), web3.utils.toWei("3", "ether"));
            assert.strictEqual((BigInt(await tradingPlatform.getEthBalance(user))).toString(), web3.utils.toWei("5.91", "ether"));
        });

    });

});