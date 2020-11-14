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
    function unstakeNFY(uint256 _tokenId) external;
}

contract NFYTradingPlatform is Ownable {
    using SafeMath for uint;
 
    bytes32 constant ETH = 'ETH';
    bytes32[] public stakeTokenList;
    uint public nextTradeId;
    uint public nextOrderId;

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
        address payable userAddress;
        Side side;
        bytes32 ticker;
        uint amount;
        uint filled;
        uint price;
        uint date;
    }
   
    mapping(bytes32 => StakeToken) public tokens;

    mapping(address => mapping(bytes32 => uint)) public traderBalances;

    mapping(bytes32 => mapping(uint => Order[])) public orderBook;

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
        tokens[_ticker] = StakeToken(_ticker, _tokenAddress, _NFTContract, _NFTaddress, _StakingContract, _nfyContract);
        stakeTokenList.push(_ticker);
    }

    // Function that allows user to deposit staking NFT
    function depositStake(string memory ticker, uint _tokenId, uint _amount) stakeNFTExist(ticker) external {
        bytes32 _ticker = stringToBytes32(ticker); 
        require(tokens[_ticker].nftContract.ownerOf(_tokenId) == _msgSender(), "Owner of token is not user");

        (bool success, bytes memory data) = tokens[_ticker].stakingContract.call(abi.encodeWithSignature("decrementNFTValue(uint256,uint256)", _tokenId, _amount));
        require(success == true, "decrement call failed");

        traderBalances[_msgSender()][_ticker] = traderBalances[_msgSender()][_ticker].add(_amount);
        if(tokens[_ticker].nfyContract.getNFTBalance(_tokenId) == 0){
            tokens[_ticker].nfyContract.unstakeNFY(_tokenId);
            tokens[_ticker].nftContract.revertNftTokenId(_msgSender(),_tokenId);
        } 
    }

    // Function that allows a user to withdraw their staking NFT
    function withdrawStake(string memory ticker, uint _amount) stakeNFTExist(ticker) external {
        bytes32 _ticker = stringToBytes32(ticker); 
        if(tokens[_ticker].nftContract.nftTokenId(_msgSender()) == 0){
            address _stakeholder = _msgSender();
             (bool success, bytes memory data) = tokens[_ticker].stakingContract.call(abi.encodeWithSignature("addStakeholderExternal(address)", _stakeholder));
             require(success == true, "add stakeholder call failed");
        } 
        uint _tokenId = tokens[_ticker].nftContract.nftTokenId(_msgSender());
        require(traderBalances[_msgSender()][_ticker] >= _amount, 'balance too low');

        (bool success, bytes memory data) = tokens[_ticker].stakingContract.call(abi.encodeWithSignature("incrementNFTValue(uint256,uint256)", _tokenId, _amount));
        require(success == true, "increment call failed");

        traderBalances[_msgSender()][_ticker] = traderBalances[_msgSender()][_ticker].sub(_amount);
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
            require(msg.value > 0, "Can not purchase no stake");
            require(msg.value >= _amount.mul(_price), "Eth too low");
        }

        else {
             require(
                traderBalances[_msgSender()][_ticker] >= _amount, 
                'token balance too low'
            );
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
    function createMarketOrder(string memory ticker, uint amount, Side side) payable stakeNFTExist(ticker) tokenIsNotETH(ticker) external {
        bytes32 _ticker = stringToBytes32(ticker); 
        if(side == Side.SELL) {
            require(
                traderBalances[_msgSender()][_ticker] >= amount, 
                'token balance too low'
            );
        }

        Order[] storage orders = orderBook[_ticker][uint(side == Side.BUY ? Side.SELL : Side.BUY)];
        uint i;
        uint remaining = amount;

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
                traderBalances[_msgSender()][_ticker] = traderBalances[_msgSender()][_ticker].sub(matched);
                traderBalances[orders[i].userAddress][_ticker] = traderBalances[orders[i].userAddress][_ticker].add(matched);
                _msgSender().transfer(matched.mul(orders[i].price));
            }

            if(side == Side.BUY) {
                require(msg.value >= matched.mul(orders[i].price), 'eth balance too low');

                traderBalances[_msgSender()][_ticker] = traderBalances[_msgSender()][_ticker].add(matched);
                traderBalances[orders[i].userAddress][_ticker] = traderBalances[orders[i].userAddress][_ticker].sub(matched);
                orders[i].userAddress.transfer(matched.mul(orders[i].price));
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
   
   //HELPER FUNCTIONS
    
    //CONVERT BYTES32 TO STRING
    
    function bytes32ToString(bytes32 _x) 
    public pure 
    returns (string memory result) {
        bytes memory bytesString = new bytes(32);
        uint charCount = 0;
        for (uint j = 0; j < 32; j++) {
            byte char = byte(bytes32(uint(_x) * 2 ** (8 * j)));
            if (char != 0) {
                bytesString[charCount] = char;
                charCount++;
            }
        }
        bytes memory bytesStringTrimmed = new bytes(charCount);
        for (uint j = 0; j < charCount; j++) {
            bytesStringTrimmed[j] = bytesString[j];
        }
        
        result = string(bytesStringTrimmed);
    }
    
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