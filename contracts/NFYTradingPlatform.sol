pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import '@openzeppelin/contracts/math/SafeMath.sol';
import './Ownable.sol';

interface NFTContract {
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function nftTokenId(address _stakeholder) external view returns(uint256 id);
}

contract NFYTradingPlatform is Ownable {
    using SafeMath for uint;
 
    bytes32 constant ETH = 'ETH';
    bytes32[] public stakeTokenList;
    uint nextTradeId;
    uint public nextOrderId;

    enum Side {
        BUY,
        SELL
    }

    struct StakeToken {
        bytes32 ticker;
        address tokenAddress;
        NFTContract nftContract;
        address stakingContract;
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
    function addToken( bytes32 _ticker, address _tokenAddress, NFTContract _NFTContract, address _StakingContract) onlyOwner() external {
        tokens[_ticker] = StakeToken(_ticker, _tokenAddress, _NFTContract, _StakingContract);
        stakeTokenList.push(_ticker);
    }

    // Function that allows user to deposit staking NFT
    function depositNFT(bytes32 _ticker, uint _tokenId, uint _amount) stakeNFTExist(_ticker) external {
        require(tokens[_ticker].nftContract.ownerOf(_tokenId) == _msgSender(), "Owner of token is not user");
        require(traderBalances[_msgSender()][_ticker] >= _amount, 'balance too low');

        tokens[_ticker].stakingContract.call(abi.encodeWithSignature("decrementNFTValue(uint256,uint256)", _tokenId, _amount));

        traderBalances[_msgSender()][_ticker] = traderBalances[_msgSender()][_ticker].add(_amount);
    }

    // Function that allows a user to withdraw their staking NFT
    function withdrawNFT(bytes32 _ticker, uint _amount) stakeNFTExist(_ticker) external {
        uint id = tokens[_ticker].nftContract.nftTokenId(_msgSender());

        if(id == 0){
             tokens[_ticker].stakingContract.call(abi.encodeWithSignature("addStakeholderExternal(address)", _msgSender()));
             id = tokens[_ticker].nftContract.nftTokenId(_msgSender());
        }     

        tokens[_ticker].stakingContract.call(abi.encodeWithSignature("incrementNFTValue(uint256, uint256)", id, _amount));

        traderBalances[id][_ticker] = traderBalances[id][_ticker].sub(_amount);
    }

    // Function that gets total all orders
    function getOrders(
        bytes32 ticker,
        Side side)
        external
        view
        returns(Order[] memory) {
        return orderBook[ticker][uint(side)];
    }

    // Function that gets all trading
    function getTokens() 
        external
        view
        returns(StakeToken[] memory) {
        StakeToken[] memory _tokens = new StakeToken[](stakeTokenList.length);
        for (uint i = 0; i < stakeTokenList.length; i++) {
            _tokens[i] = StakeToken(
              tokens[stakeTokenList[i]].ticker,
              tokens[stakeTokenList[i]].tokenAddress,
              tokens[stakeTokenList[i]].stakingContract
            );
        }
        return _tokens;
    }

    // Function that creates limit order
    function createLimitOrder(bytes32 _ticker, uint _amount, uint _price, Side _side) payable stakeNFTExist(_ticker) public {        
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
    function createMarketOrder(
        bytes32 ticker,
        uint amount,
        Side side)
        payable
        stakeNFTExist(ticker)
        tokenIsNotETH(ticker)
        external {        
        if(side == Side.SELL) {
            require(
                traderBalances[_msgSender()][ticker] >= amount, 
                'token balance too low'
            );
        }

        Order[] storage orders = orderBook[ticker][uint(side == Side.BUY ? Side.SELL : Side.BUY)];
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
                ticker,
                orders[i].userAddress,
                _msgSender(),
                matched,
                orders[i].price,
                now
            );

            if(side == Side.SELL) {
                traderBalances[_msgSender()][ticker] = traderBalances[_msgSender()][ticker].sub(matched);
                traderBalances[orders[i].userAddress][ticker] = traderBalances[orders[i].userAddress][ticker].add(matched);
                _msgSender().transfer(matched.mul(orders[i].price));
            }

            if(side == Side.BUY) {
                require(msg.value >= matched.mul(orders[i].price), 'eth balance too low');

                traderBalances[_msgSender()][ticker] = traderBalances[_msgSender()][ticker].add(matched);
                traderBalances[orders[i].userAddress][ticker] = traderBalances[orders[i].userAddress][ticker].sub(matched);
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
    
    modifier stakeNFTExist(bytes32 _ticker) {
        require(tokens[_ticker].tokenAddress != address(0), "staking NFT does not exist");
        _;
    }
    
    modifier tokenIsNotETH(bytes32 ticker) {
       require(ticker != ETH, 'cannot trade ETH');
       _;
   }

}