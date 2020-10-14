pragma solidity 0.6.10;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import "@openzeppelin/contracts/GSN/Context.sol";
import './Ownable.sol';

contract NFYTradingPlatform is Ownable {
    using SafeMath for uint;

    modifier stakeNFTExist(bytes32 _ticker) {
        require(tokens[ticker].tokenAddress != address(0), "staking NFT does not exist");
        _;
    }

    enum Side {
        BUY,
        SELL
    }

    struct StakeToken {
        bytes32 ticker;
        address tokenAddress;
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

    mapping(bytes32 => StakeToken) public tokens;
    bytes32[] public stakeTokenList;
    mapping(address => mapping(bytes32 => uint)) public traderNFT;
    
    // Function that adds staking NFT
    function addToken( bytes32 _ticker, address _tokenAddress) onlyOwner() external {
        tokens[_ticker] = StakeToken(_ticker, _tokenAddress);
        stakeTokenList.push(_ticker);
    }

    // Function that allows user to deposit staking NFT
    function depositNFT(uint _tokenId, bytes32 _ticker) stakeNFTExist(_ticker) external {
        IERC721(tokens[_ticker].tokenAddress).transferFrom(
            _msgSender(), address(this), _tokenId
        );
        traderNFT[_msgSender()][_ticker] = _tokenId;
    }

    // Function that allows a user to withdraw their staking NFT
    function withdrawNFT(uint _tokenId, bytes32 _ticker) stakeNFTExist(_ticker) external {
        require(traderNFT[_msgSender()][_ticker] == _tokenId, "User does not have this staking NFT");

        traderNFT[_msgSender()][_ticker] = 0;

        IERC721(tokens[_ticker].tokenAddress).transfer(address(this), _tokenId);
    }

    function sellStake() public {
    }

    function buyStake() public {
        require(msg.value > 0, "Can not purchase no stake");
    }


}