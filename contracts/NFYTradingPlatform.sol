pragma solidity 0.6.10;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import "@openzeppelin/contracts/GSN/Context.sol";
import './Ownable.sol';

interface StakingContract {
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function getNFTValue(uint _tokenId) public view returns(uint);
    function incrementNFTValue (uint _tokenId) public onlyTradingPlatform();
    function decrementNFTValue (uint _tokenId, uint _amount) public onlyTradingPlatform();
}

contract NFYTradingPlatform is Ownable {
    using SafeMath for uint;

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

    mapping(address => mapping(bytes32 => uint)) public traderNFT;

    mapping(bytes32 => mapping(uint => Order[])) public orderBook;
    uint public nextOrderId;

    // Function that adds staking NFT
    function addToken( bytes32 _ticker, address _tokenAddress, StakingContract _stakingContract) onlyOwner() external {
        tokens[_ticker] = StakeToken(_ticker, _tokenAddress, _stakingContract);
        stakeTokenList.push(_ticker);
    }

    // Function that allows user to deposit staking NFT
    function depositNFT(uint _tokenId, bytes32 _ticker) stakeNFTExist(_ticker) external {
        require(traderNFT[_msgSender()][_ticker] == 0, "Already have stake NFT in system");
        require(tokens[_ticker].stakingContract.ownerOf(_tokenId) == _msgSender(), "Owner of token is not user");

        IERC721(tokens[_ticker].tokenAddress).transferFrom(
            _msgSender(), address(this), _tokenId
        );

        traderNFT[_msgSender()][_ticker] = _tokenId;
    }

    // Function that allows a user to withdraw their staking NFT
    function withdrawNFT(uint _tokenId, bytes32 _ticker) stakeNFTExist(_ticker) external {
        require(traderNFT[_msgSender()][_ticker] == _tokenId, "User does not have this staking NFT");

        traderNFT[_msgSender()][_ticker] = 0;

        IERC721(tokens[_ticker].tokenAddress).transfer(_msgSender(), _tokenId);
    }

    //function sellStake(bytes32 _ticker, uint _amount, uint _price) stakeNFTExist(_ticker) public {
    //}

    // Function that will allow a user to buy a stake in their desired pool
    function order(bytes32 _ticker, uint _amount, uint _tokenId, uint _price, Side _side) stakeNFTExist(_ticker) public {

        require(_amount > 0, "Amount can not be 0");

        if(_side == Side.BUY) {
            require(msg.value > 0, "Can not purchase no stake");
            require(msg.value >= amount.mul(price), "Eth balance too low");
        }

        else {
            //require(tokens[_ticker].stakingContract.ownerOf(_tokenId) == _msgSender(), "Owner of token is not user");
            require(traderNFT[_msgSender()][_ticker] == _tokenId, "User does not have this staking NFT");
            uint _NFTValue = tokens[_ticker].stakingContract.getNFTValue(_tokenId);
            require(_NFTValue >= _amount, "Not enough wrapped in NFT");
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

    }


}