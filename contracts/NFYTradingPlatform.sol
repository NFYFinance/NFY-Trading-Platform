pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import './Ownable.sol';

interface NFTContract {
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function nftTokenId(address _stakeholder) external view returns(uint256 id);
}

interface NFYContract {
    function getNFTBalance(uint256 _tokenId) external view returns(uint256 _amountStaked);
}

contract NFYTradingPlatform is Ownable {
    using SafeMath for uint;

    bytes32 constant ETH = 'ETH';
    bytes32[] public stakeTokenList;
    uint public nextTradeId;
    uint public nextOrderId;
    //address pending;

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

    mapping(bytes32 => StakeToken) public tokens;

    mapping(address => mapping(bytes32 => uint)) public traderBalances;

    mapping(bytes32 => mapping(uint => Order[])) public orderBook;

    mapping(address => uint) public ethBalance;

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

    // Function that gets balance of a user
    function getTraderBalance(address _user, string memory ticker) external view returns(uint) {
        bytes32 _ticker = stringToBytes32(ticker);

        return traderBalances[_user][_ticker];
    }

    // Function that gets eth balance of a user
    function getEthBalance(address _user) external view returns(uint) {
        return ethBalance[_user];
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

        (bool success, bytes memory data) = tokens[_ticker].stakingContract.call(abi.encodeWithSignature("decrementNFTValue(uint256,uint256)", _tokenId, _amount));
        require(success == true, "decrement call failed");

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

        (bool success, bytes memory data) = tokens[_ticker].stakingContract.call(abi.encodeWithSignature("incrementNFTValue(uint256,uint256)", _tokenId, _amount));
        require(success == true, "increment call failed");

        traderBalances[_msgSender()][_ticker] = traderBalances[_msgSender()][_ticker].sub(_amount);
    }

    function depositEth() external payable{
        ethBalance[msg.sender] = ethBalance[msg.sender].add(msg.value);
    }

    function withdrawEth(uint _amount) external{
        require(_amount > 0, "cannot withdraw 0 eth");
        require(ethBalance[_msgSender()] >= _amount, "Not enough eth in trading balance");

        uint amountToWithdraw = _amount;
        ethBalance[_msgSender()] = ethBalance[_msgSender()].sub(_amount);

        _msgSender().transfer(amountToWithdraw);
    }

    function addStakeholder(bytes32 _ticker) private {
        address _stakeholder = _msgSender();
        (bool success, bytes memory data) = tokens[_ticker].stakingContract.call(abi.encodeWithSignature("addStakeholderExternal(address)", _stakeholder));
        require(success == true, "add stakeholder call failed");
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
    function createLimitOrder(string memory ticker, uint _amount, uint _price, Side _side) stakeNFTExist(ticker) public {
        bytes32 _ticker = stringToBytes32(ticker);
        require(_amount > 0, "Can not purchase no stake");

        if(_side == Side.BUY) {
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

    // Function that creates a market order
    function createMarketOrder(string memory ticker, uint amount, uint price, Side side) stakeNFTExist(ticker) tokenIsNotETH(ticker) external {
        bytes32 _ticker = stringToBytes32(ticker);
        // uint price;
        if(side == Side.SELL) {
            require(
                traderBalances[_msgSender()][_ticker] >= amount,
                'token balance too low'
            );
        }

        Order[] storage orders = orderBook[_ticker][uint(side == Side.BUY ? Side.SELL : Side.BUY)];
        if(orders.length == 0){
            createLimitOrder(ticker,amount,price, side);
        }
        else{
            uint remaining = amount;
            uint i;
            while(i < orders.length && remaining > 0) {

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

                    if(orders.length  - i  == 1 && remaining > 0){
                       createLimitOrder(ticker,remaining,price, side);
                    }
                    nextTradeId++;
                    i++;

            }

            i = 0;

            while(i < orders.length && orders[i].filled == orders[i].amount) {
                for(uint j = i; j < orders.length - 1; j++ ) {
                    orders[j] = orders[j + 1];
                }
                orders.pop();
                i++;
            }
        }
    }

    /*function cancelOrder(string memory ticker, Side _side) external stakeNFTExist(ticker) {
        bytes32 _ticker = stringToBytes32(ticker);

        Order[] storage orders = orderBook[_ticker][uint(_side)];

        if(_side == Side.BUY) {
            PendingTransactions[] storage pending = pendingETH[_ticker][msg.sender];
            int userOrders = int(pending.length - 1);
            require(userOrders >= 0, 'users has no pending order');
            uint userOrder = uint(userOrders);
            uint orderId = pending[userOrder].id;
            uint orderLength = orders.length;

            uint i = 0;

            while(i < orders.length){

                if(orders[i].id == orderId){
                    require(orders[i].filled == 0, 'order is already getting filled');

                    for(uint c = i; c < orders.length - 1; c++){
                        orders[c] = orders[c + 1];
                    }

                    i = orderLength;
                    uint amount = pendingETH[_ticker][msg.sender][userOrder].pendingAmount;
                    pendingETH[_ticker][msg.sender][userOrder].pendingAmount = pendingETH[_ticker][msg.sender][userOrder].pendingAmount.sub(amount);
                    ethBalance[msg.sender]  = ethBalance[msg.sender].add(amount);
                    orders.pop();
                    pending.pop();
                }
                i++;
            }
        }
        else{
            PendingTransactions[] storage pending = pendingToken[_ticker][msg.sender];
            int userOrders = int(pending.length - 1);
            require(userOrders >= 0, 'users has no pending order');
            uint userOrder = uint(userOrders);
            uint orderId = pending[userOrder].id;
            uint orderLength = orders.length;

            uint i = 0;

            while(i < orders.length){

                if(orders[i].id == orderId){
                    require(orders[i].filled == 0, 'order is already getting filled');

                    for(uint c = i; c < orders.length - 1; c++){
                        orders[c] = orders[c + 1];
                    }

                    i = orderLength;
                    uint amount = pendingToken[_ticker][msg.sender][userOrder].pendingAmount;
                    pendingToken[_ticker][msg.sender][userOrder].pendingAmount = pendingToken[_ticker][msg.sender][userOrder].pendingAmount.sub(amount);
                    traderBalances[msg.sender][_ticker] = traderBalances[msg.sender][_ticker].add(amount);
                    orders.pop();
                    pending.pop();
                }
                i++;
            }
        }
    }*/

    modifier stakeNFTExist(string memory ticker) {
        bytes32 _ticker = stringToBytes32(ticker);
        require(tokens[_ticker].tokenAddress != address(0), "staking NFT does not exist");
        _;
    }

    modifier tokenIsNotETH(string memory ticker) {
        bytes32 _ticker = stringToBytes32(ticker);
       require(_ticker != ETH, 'cannot trade ETH');
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