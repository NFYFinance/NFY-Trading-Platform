// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import 'https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/math/SafeMath.sol';
import './Ownable.sol';


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
    bytes32[] public stakeTokenList;
    uint public nextTradeId;
    uint public nextOrderId;
    address pending;

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
        address  userAddress;
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
    
    mapping(address => PendingTransactions) public pendingETH;
    
    mapping(bytes32 => mapping(address => PendingTransactions)) public pendingToken;
   
    mapping(bytes32 => StakeToken) public tokens;

    mapping(address => mapping(bytes32 => uint)) public traderBalances;

    mapping(bytes32 => mapping(uint => Order[])) public orderBook;
    
    mapping(address => uint) ethBalance;

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
    
    function depositETH(uint amount) public{
        ethBalance[msg.sender] = ethBalance[msg.sender].add(amount);
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

    // // Function that gets total all orders
    // function getOrders(
    //     bytes32 ticker,
    //     Side side)
    //     external
    //     view
    //     returns(Order[] memory) {
    //     return orderBook[ticker][uint(side)];
    // }

    // // Function that gets all trading
    // function getTokens() 
    //     external
    //     view
    //     returns(StakeToken[] memory) {
    //     StakeToken[] memory _tokens = new StakeToken[](stakeTokenList.length);
    //     for (uint i = 0; i < stakeTokenList.length; i++) {
    //         _tokens[i] = StakeToken(
    //           tokens[stakeTokenList[i]].ticker,
    //           tokens[stakeTokenList[i]].tokenAddress,
    //           tokens[stakeTokenList[i]].nftContract,
    //           tokens[stakeTokenList[i]].stakingContract
    //         );
    //     }
    //     return _tokens;
    // }

    // Function that creates limit order
    function createLimitOrder(string memory ticker, uint _amount, uint _price, Side _side) payable stakeNFTExist(ticker) public {
        bytes32 _ticker = stringToBytes32(ticker); 
        require(_amount > 0, "Amount can not be 0");

        if(_side == Side.BUY) {
            require(pendingETH[msg.sender].pendingAmount > 0, "Can not purchase no stake");
            require(pendingETH[msg.sender].pendingAmount>= _amount.mul(_price), "Eth too low");
        //works only if users are allowed to make a single trade at a time
            pendingETH[msg.sender].pendingAmount = pendingETH[msg.sender].pendingAmount.add(_amount.mul(_price));
            pendingETH[msg.sender].id = nextOrderId;
            ethBalance[msg.sender] = ethBalance[msg.sender].sub(_amount.mul(_price));
        }
        else {
            require(traderBalances[msg.sender][_ticker] >= _amount, "Token too low");
            //works only if users are allowed to make a single trade at a time
            pendingToken[_ticker][msg.sender].id = nextOrderId;
            pendingToken[_ticker][msg.sender].pendingAmount = pendingToken[_ticker][msg.sender].pendingAmount.add(_amount);
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
    function createMarketOrder(string memory ticker, uint amount, uint price, Side side) payable stakeNFTExist(ticker) tokenIsNotETH(ticker) external {
        bytes32 _ticker = stringToBytes32(ticker); 
        if(side == Side.SELL) {
            require(
                traderBalances[_msgSender()][_ticker] >= amount, 
                'token balance too low'
            );
        }

        Order[] storage orders = orderBook[_ticker][uint(side == Side.BUY ? Side.SELL : Side.BUY)];
        if(orders.length == 0){
            side == Side.BUY ? Side.SELL : Side.BUY; 
            createLimitOrder(ticker,amount,price, side);
        }
        else{
            uint d;
            uint remaining = amount;
            uint loopCountStart = orders.length;
            for (d = 0; d < loopCountStart; d++){
                uint i;
                while(i < orders.length && remaining > 0) {
                    if(orders.length  - i  == 1){
                        side == Side.BUY ? Side.SELL : Side.BUY;
                       createLimitOrder(ticker,amount,price, side);
                       d = loopCountStart;
                       i = orders.length;
                    }
                    else{
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
                            ethBalance[msg.sender]  = ethBalance[msg.sender].add(matched.mul(orders[i].price));
                            uint matchedETH = pendingETH[orders[i].userAddress].pendingAmount.sub(matched.mul(orders[i].price));
                            pendingETH[orders[i].userAddress].pendingAmount  = matchedETH;
                        }
            
                        if(side == Side.BUY) {
                            require(ethBalance[msg.sender] >= matched.mul(orders[i].price), 'eth balance too low');
                            traderBalances[msg.sender][_ticker] = traderBalances[msg.sender][_ticker].add(matched);
                            pendingToken[_ticker][orders[i].userAddress].pendingAmount = pendingToken[_ticker][orders[i].userAddress].pendingAmount.sub(matched);
                            ethBalance[orders[i].userAddress]  = ethBalance[orders[i].userAddress].add(matched.mul(orders[i].price));
                        }
            
                        nextTradeId++;
                        i++;
                    }}
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
    }
    
    function cancelOrder(string memory ticker, Side _side) public stakeNFTExist(ticker) {
        bytes32 _ticker = stringToBytes32(ticker); 
        Order[] storage orders = orderBook[_ticker][uint(_side)];
        
        if(_side == Side.BUY) {
            uint id =  pendingETH[msg.sender].id;
            
            for(uint j = 0; j < orders.length - 1; j++ ) {
                require(orders[j].id == id && orders[j].filled == 0, 'user has no order');
                if(orders[j].id == id){
                    orders[j] = orders[j + 1];
                }
            }
            orders.pop();
             
            uint amount = pendingETH[msg.sender].pendingAmount;
            require(amount > 0, 'user has no pending funds');
            ethBalance[msg.sender]  = ethBalance[msg.sender].sub(amount);
        }
        else{
            uint id =  pendingToken[_ticker][msg.sender].id;
            
            for(uint j = 0; j < orders.length - 1; j++ ) {
                require(orders[j].id == id && orders[j].filled == 0, 'user has no order');
                if(orders[j].id == id){
                    orders[j] = orders[j + 1];
                }
            }
            orders.pop();
            
            uint amount = pendingToken[_ticker][msg.sender].pendingAmount;
            pendingToken[_ticker][msg.sender].pendingAmount = pendingToken[_ticker][msg.sender].pendingAmount.sub(amount);
            traderBalances[_msgSender()][_ticker] = traderBalances[_msgSender()][_ticker].add(amount);
        }
    }
    
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