// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import 'https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/math/SafeMath.sol';
import './Ownable.sol';
import 'https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/IERC20.sol';

interface NFTContract {
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function nftTokenId(address _stakeholder) external view returns(uint256 id);
    function revertNftTokenId(address _stakeholder, uint256 _tokenId) external;
}

interface NFYContract {
    function getNFTBalance(uint256 _tokenId) external view returns(uint256 _amountStaked);
    function addStakeholderExternal(address _stakeholder) external;
    function incrementNFTValue (uint256 _tokenId, uint256 _amount) external;
    function decrementNFTValue (uint256 _tokenId, uint256 _amount) external;
}

contract NFYTradingPlatform is Ownable {
    using SafeMath for uint;

    bytes32 constant ETH = 'ETH';

    bytes32[] private stakeTokenList;
    uint private nextTradeId;
    uint private nextOrderId;

    uint public platformFee;
    uint public fees;
    uint private blockNumber;

    IERC20 public NFYToken;
    address public rewardPool;
    address public communityFund;
    address public devAddress;

    enum Side {
        BUY,
        SELL
    }

    struct StakeToken {
        bytes32 ticker;
        address tokenAddress;
        NFTContract nftContract;
        address nftAddress;
        address stakingContract;
        NFYContract nfyContract;
    }

    struct Order {
        uint id;
        address userAddress;
        Side side;
        bytes32 ticker;
        uint amount;
        uint filled;
        uint price;
        uint date;
    }

    struct PendingTransactions{
        uint pendingAmount;
        uint id;
    }

    mapping(bytes32 => mapping(address => PendingTransactions[])) public pendingETH;

    mapping(bytes32 => mapping(address => PendingTransactions[])) public pendingToken;

    mapping(bytes32 => StakeToken) private tokens;

    mapping(address => mapping(bytes32 => uint)) private traderBalances;

    mapping(bytes32 => mapping(uint => Order[])) private orderBook;

    mapping(address => uint) private ethBalance;

    // Event for a new trade
    event NewTrade(
        uint tradeId,
        uint orderId,
        bytes32 indexed ticker,
        address trader1,
        address trader2,
        uint amount,
        uint price,
        uint date
    );

    constructor(address _nfy, address _rewardPool, uint _fee, address _devFeeAddress, address _communityFundAddress) Ownable() public {
        NFYToken = IERC20(_nfy);
        rewardPool = _rewardPool;
        platformFee = _fee;
        devAddress = _devFeeAddress;
        communityFund = _communityFundAddress;
        blockNumber = block.number.add(6500);
    }

    // Function that updates platform fee
    function setFee(uint _fee) external onlyOwner() {
        platformFee = _fee;
    }

    // Function that updates dev address for portion of fee
    function setDevFeeAddress(address _devAddress) external onlyOwner() {
        devAddress = _devAddress;
    }

    // Function that updates community address for portion of fee
    function setCommunityFeeAddress(address _communityAddress) external onlyOwner() {
        communityFund = _communityAddress;
    }

    // Function that gets balance of a user
    function getTraderBalance(address _user, string memory ticker) external view returns(uint) {
        bytes32 _ticker = stringToBytes32(ticker);

        return traderBalances[_user][_ticker];
    }

    // Function that gets eth balance of a user
    function getEthBalance(address _user) external view returns(uint) {
        return(ethBalance[_user]);
    }

    // Function that adds staking NFT
    function addToken(string memory ticker,address _tokenAddress, NFTContract _NFTContract, address _NFYaddress, address _StakingContract, NFYContract _nfyContract) onlyOwner() external {
        bytes32 _ticker = stringToBytes32(ticker);
        tokens[_ticker] = StakeToken(_ticker, _tokenAddress, _NFTContract, _NFYaddress, _StakingContract, _nfyContract);
        stakeTokenList.push(_ticker);
    }
    // Function that allows user to deposit staking NFT
    function depositStake(string memory ticker, uint _tokenId, uint _amount) stakeNFTExist(ticker) external {
        bytes32 _ticker = stringToBytes32(ticker);
        require(tokens[_ticker].nftContract.ownerOf(_tokenId) == _msgSender(), "Owner of token is not user");

        tokens[_ticker].nfyContract.decrementNFTValue(_tokenId, _amount);

        traderBalances[_msgSender()][_ticker] = traderBalances[_msgSender()][_ticker].add(_amount);
    }

    // Function that allows a user to withdraw their staking NFT
    function withdrawStake(string memory ticker, uint _amount) stakeNFTExist(ticker) external {
        bytes32 _ticker = stringToBytes32(ticker); 
        
        if(idCheck(_ticker) == 0){
            addStakeholder(_ticker);
        }
        
        uint _tokenId = tokens[_ticker].nftContract.nftTokenId(_msgSender());
        require(traderBalances[_msgSender()][_ticker] >= _amount, 'balance too low');

        tokens[_ticker].nfyContract.incrementNFTValue(_tokenId, _amount);

        traderBalances[_msgSender()][_ticker] = traderBalances[_msgSender()][_ticker].sub(_amount);
    }

    function depositEth() external payable{
        ethBalance[msg.sender] = ethBalance[msg.sender].add(msg.value);
    }
    function withdrawETH(uint amount) public{
        require(ethBalance[msg.sender] >= amount);
        ethBalance[msg.sender] = ethBalance[msg.sender].sub(amount);
        msg.sender.transfer(amount);
    }

    function addStakeholder(bytes32 _ticker) private {
        address _stakeholder = _msgSender();
        tokens[_ticker].nfyContract.addStakeholderExternal(_stakeholder);
    }
    
    function idCheck(bytes32 _ticker) private view returns(uint) {
        return tokens[_ticker].nftContract.nftTokenId(_msgSender());
    }

    // Function that gets total all orders
    function getOrders(string memory ticker, Side side) external view returns(Order[] memory) {
        bytes32 _ticker = stringToBytes32(ticker);

        return orderBook[_ticker][uint(side)];
     }

    // Function that gets all trading
    function getTokens() external view returns(StakeToken[] memory) {
         StakeToken[] memory _tokens = new StakeToken[](stakeTokenList.length);
         for (uint i = 0; i < stakeTokenList.length; i++) {
             _tokens[i] = StakeToken(
               tokens[stakeTokenList[i]].ticker,
               tokens[stakeTokenList[i]].tokenAddress,
               tokens[stakeTokenList[i]].nftContract,
               tokens[stakeTokenList[i]].nftAddress,
               tokens[stakeTokenList[i]].stakingContract,
               tokens[stakeTokenList[i]].nfyContract
             );
         }
         return _tokens;
    }

    // Function that creates limit order
    function createLimitOrder(string memory ticker, uint _amount, uint _price, Side _side) external payable {
        require(msg.value >= platformFee, "Do not have enough ETH to cover fee");
        if(block.number >= blockNumber){
            /*function that swaps eth to nfy will be here
                swapETH(fees,address(this));
            */
            uint devFee = platformFee.div(100).mul(10);
            uint communityFee = platformFee.div(100).mul(5);
            uint rewardFee = platformFee.sub(devFee).sub(communityFee);
    
            NFYToken.transfer(devAddress, devFee);
            NFYToken.transfer(communityFund, communityFee);
            NFYToken.transfer(rewardPool, rewardFee);
            fees = 0;
            blockNumber = block.number.add(6500);
        }
        
        fees = fees.add(msg.value);

        limitOrder(ticker, _amount, _price, _side);
    }


    function limitOrder(string memory ticker, uint _amount, uint _price, Side _side) stakeNFTExist(ticker) public {
        bytes32 _ticker = stringToBytes32(ticker); 
        require(_amount > 0, "Amount can not be 0");
        
        Order[] storage orders = orderBook[_ticker][uint(_side == Side.BUY ? Side.SELL : Side.BUY)];
        if(orders.length == 0){
            createOrder(_ticker,_amount,_price, _side);
        }
        else{
            if(_side == Side.BUY){
                uint remaining = _amount;
                uint i;
                uint orderLength = orders.length;
                while(i < orders.length && remaining > 0){
                    if(_price >= orders[i].price){
                       remaining = matchOrder(_ticker,orders, remaining, i, _side);
                        nextTradeId++;
                        
                        if(orders.length  - i  == 1 && remaining > 0){
                            createOrder(_ticker, remaining, _price, _side);
                        }
                        i++;
                    }
                    else{
                        i = orderLength;
                        if(remaining > 0){
                            createOrder(_ticker, remaining, _price, _side);
                        }
                    }
                }
            }
            
            if(_side == Side.SELL){
                uint remaining = _amount;
                uint i;
                uint orderLength = orders.length;
                while(i < orders.length && remaining > 0) {
                    if(_price <= orders[i].price){
                        remaining = matchOrder(_ticker,orders, remaining, i, _side);
                        nextTradeId++;
                        
                        if(orders.length  - i  == 1 && remaining > 0){
                            createOrder(_ticker, remaining, _price, _side);
                        }
                        i++;
                    }
                    else{
                        i = orderLength;
                        if(remaining > 0){
                            createOrder(_ticker, remaining, _price, _side);
                        }
                    }
                }
            }
            
           uint i = 0;
            
            while(i < orders.length && orders[i].filled == orders[i].amount) {
                for(uint j = i; j < orders.length - 1; j++ ) {
                    orders[j] = orders[j + 1];
                }
            orders.pop();
            i++;
        }
        }
    }
    
    function createOrder(bytes32 _ticker, uint _amount, uint _price, Side _side) private {
         if(_side == Side.BUY) {
            require(ethBalance[msg.sender] > 0, "Can not purchase no stake");
            require(ethBalance[msg.sender] >= _amount.mul(_price).div(1e18), "Eth too low");
            PendingTransactions[] storage pending = pendingETH[_ticker][msg.sender];
            pending.push(PendingTransactions(_amount.mul(_price).div(1e18), nextOrderId));
            ethBalance[msg.sender] = ethBalance[msg.sender].sub(_amount.mul(_price).div(1e18));
        }
        else {
            require(traderBalances[msg.sender][_ticker] >= _amount, "Token too low");
            PendingTransactions[] storage pending = pendingToken[_ticker][msg.sender];
            pending.push(PendingTransactions(_amount, nextOrderId));
            traderBalances[_msgSender()][_ticker] = traderBalances[_msgSender()][_ticker].sub(_amount);     
        }
        
        Order[] storage orders = orderBook[_ticker][uint(_side)];

        orders.push(Order(
            nextOrderId,
            _msgSender(),
            _side,
            _ticker,
            _amount,
            0,
            _price,
            now
        ));
        
        uint i = orders.length > 0 ? orders.length - 1 : 0;
        while(i > 0) {
            if(_side == Side.BUY && orders[i - 1].price > orders[i].price) {
                break;   
            }
            if(_side == Side.SELL && orders[i - 1].price < orders[i].price) {
                break;   
            }
            Order memory order = orders[i - 1];
            orders[i - 1] = orders[i];
            orders[i] = order;
            i--;
        }
        nextOrderId++;
    }
    
    function matchOrder(bytes32 _ticker, Order[] storage orders, uint remaining, uint i,Side side) private returns(uint left){
        uint available = orders[i].amount.sub(orders[i].filled);
        uint matched = (remaining > available) ? available : remaining;
        remaining = remaining.sub(matched);
        orders[i].filled = orders[i].filled.add(matched);
        
        emit NewTrade(
            nextTradeId,
            orders[i].id,
            _ticker,
            orders[i].userAddress,
            _msgSender(),
            matched,
            orders[i].price,
            now
        );

        if(side == Side.SELL) {
            traderBalances[msg.sender][_ticker] = traderBalances[msg.sender][_ticker].sub(matched);
            traderBalances[orders[i].userAddress][_ticker] = traderBalances[orders[i].userAddress][_ticker].add(matched);
            ethBalance[msg.sender]  = ethBalance[msg.sender].add(matched.mul(orders[i].price).div(1e18));
            
            PendingTransactions[] storage pending = pendingETH[_ticker][orders[i].userAddress];
            uint userOrders = pending.length;
            uint b = 0;
            uint id = orders[i].id;
            while(b < userOrders){
                if(pending[b].id == id && orders[i].filled == orders[i].amount){
                    for(uint o = b; o < userOrders - 1; o++){
                        pending[o] = pending[o + 1];
                        b = userOrders;
                    }
                    pending.pop();
                }
                b++;
            }
        }

        if(side == Side.BUY) {
            require(ethBalance[msg.sender] >= matched.mul(orders[i].price).div(1e18), 'eth balance too low');
            traderBalances[msg.sender][_ticker] = traderBalances[msg.sender][_ticker].add(matched);
            ethBalance[orders[i].userAddress]  = ethBalance[orders[i].userAddress].add(matched.mul(orders[i].price).div(1e18));
            ethBalance[msg.sender]  = ethBalance[msg.sender].sub(matched.mul(orders[i].price).div(1e18));
            
            PendingTransactions[] storage pending = pendingToken[_ticker][orders[i].userAddress];
            uint userOrders = pending.length;
            uint b = 0;
            while(b < userOrders){
                if(pending[b].id == orders[i].id && orders[i].filled == orders[i].amount){
                    for(uint o = b; o < userOrders - 1; o++){
                        pending[o] = pending[o + 1];
                        b = userOrders;
                    }
                    pending.pop();
                }
                b++;
            }
        }
        left = remaining;
        return left;
    }
    
    function cancelOrder(string memory ticker, Side _side) public stakeNFTExist(ticker) {
        bytes32 _ticker = stringToBytes32(ticker); 
        
        Order[] storage orders = orderBook[_ticker][uint(_side)];
        
        if(_side == Side.BUY) {
            PendingTransactions[] storage pending = pendingETH[_ticker][msg.sender];
            uint amount = _cancelOrder(pending, orders, _ticker);
            ethBalance[msg.sender]  = ethBalance[msg.sender].add(amount);
        }
        else{
            PendingTransactions[] storage pending = pendingToken[_ticker][msg.sender];
            uint amount = _cancelOrder(pending, orders, _ticker);
            traderBalances[msg.sender][_ticker] = traderBalances[msg.sender][_ticker].add(amount);
        }
    }
    
    function _cancelOrder(PendingTransactions[] storage pending, Order[] storage orders, bytes32 _ticker) internal returns(uint left){
        int userOrders = int(pending.length - 1);
        require(userOrders >= 0, 'users has no pending order');
        uint userOrder = uint(userOrders);
        uint orderId = pending[userOrder].id;
        uint orderLength = orders.length;
        
        uint i = 0;
        uint amount;
        
        while(i < orders.length){
        
           if(orders[i].id == orderId){
                
                for(uint c = i; c < orders.length - 1; c++){
                    orders[c] = orders[c + 1]; 
                }
                
                amount = pendingToken[_ticker][msg.sender][userOrder].pendingAmount.sub(orders[i].filled);
                traderBalances[msg.sender][_ticker] = traderBalances[msg.sender][_ticker].add(amount);
                orders.pop();
                pending.pop();
                i = orderLength;
            }
            i++;
        }
        left = amount;
        return left;
    }

    modifier stakeNFTExist(string memory ticker) {
        bytes32 _ticker = stringToBytes32(ticker);
        require(tokens[_ticker].tokenAddress != address(0), "staking NFT does not exist");
        _;
    }

   //HELPER FUNCTION

    // CONVERT STRING TO BYTES32

    function stringToBytes32(string memory _source)
    public pure
    returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(_source);
        string memory tempSource = _source;

        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            result := mload(add(tempSource, 32))
        }
    }

}