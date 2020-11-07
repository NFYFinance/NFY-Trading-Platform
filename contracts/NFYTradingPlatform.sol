pragma solidity 0.6.10;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import "@openzeppelin/contracts/GSN/Context.sol";
import './Ownable.sol';

interface StakingContract {
    function ownerOf(uint256 tokenId) external view returns (address owner);
}

interface INFYStakingNFT {
    function nftTokenId(address _stakeholder) external view returns(uint256 id);
}

contract NFYTradingPlatform is Ownable {
    using SafeMath for uint;
    
    address nftContract;
    INFYStakingNFT public StakingNFT;

    modifier stakeNFTExist(bytes32 _ticker) {
        require(tokens[_ticker].tokenAddress != address(0), "staking NFT does not exist");
        _;
    }

    enum Side {
        BUY,
        SELL
    }

    struct StakeToken {
        bytes32 ticker;
        address tokenAddress;
        StakingContract stakingContract;
    }

    struct Order {
        uint id;
        Side side;
        bytes32 ticker;
        uint amount;
        uint filled;
        uint price;
        uint date;
    }

    bytes32[] public stakeTokenList;
    mapping(bytes32 => StakeToken) public tokens;

    mapping(uint => mapping(bytes32 => uint)) public traderBalances;

    mapping(bytes32 => mapping(uint => Order[])) public orderBook;
    uint public nextOrderId;
    
    constructor(address _nftContract, address _StakingNFT) public {
        nftContract = _nftContract;
        StakingNFT = INFYStakingNFT(_StakingNFT);
    }

    // Function that adds staking NFT
    function addToken( bytes32 _ticker, address _tokenAddress, StakingContract _stakingContract) onlyOwner() external {
        tokens[_ticker] = StakeToken(_ticker, _tokenAddress, _stakingContract);
        stakeTokenList.push(_ticker);
    }

    // Function that allows user to deposit staking NFT
    function depositNFT(bytes32 _ticker,uint _tokenId, uint _amount) stakeNFTExist(_ticker) external {
        require(tokens[_ticker].stakingContract.ownerOf(_tokenId) == _msgSender(), "Owner of token is not user");

        nftContract.call(abi.encodeWithSignature("decrementNFTValue(uint256,uint256)", _tokenId, _amount));

        traderNFT[_tokenId][_ticker] = _amount;
    }

    // Function that allows a user to withdraw their staking NFT
    function withdrawNFT(bytes32 _ticker, uint amount) stakeNFTExist(_ticker) external {
        uint id  = StakingNFT.nftTokenId(_msgSender());
         if(id== 0){
             nftContract.call(abi.encodeWithSignature("addStakeholderExternal(address)", _msgSender()));
        }
        require(
            traderBalances[id][_ticker] >= amount,
            'balance too low'
        ); 

        nftContract.call(abi.encodeWithSignature("incrementNFTValue(uint256,uint256)", id, _amount));

        traderNFT[id][_ticker] = traderNFT[id][_ticker].sub(amount);
    }

    // Function that will allow a user to buy a stake in their desired pool
    function order(bytes32 _ticker, uint _amount, uint _price, Side _side) stakeNFTExist(_ticker) public {
        uint id  = StakingNFT.nftTokenId(_msgSender());
        require(_amount > 0, "Amount can not be 0");

        if(_side == Side.BUY) {
            require(msg.value > 0, "Can not purchase no stake");
            require(msg.value >= amount.mul(price), "Eth balance too low");
        }

        else {
             require(
                traderBalances[id][_ticker] >= amount, 
                'token balance too low'
            );
        }

        Order[] storage orders = orderBook[_ticker][uint(_side)];

        orders.push(Order(
            nextOrderId,
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


}