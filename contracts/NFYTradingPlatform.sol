pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import "./Ownable.sol";

contract NFYTradingPlatform is Ownable {
    using SafeMath for uint;

    struct StakeToken {
        bytes32 ticker;
        address tokenAddress;
    }

    mapping(bytes32 => StakeToken) public tokens;
    bytes32[] public stakeTokenList;
    mapping(address => mapping(bytes32 => uint)) public traderBalances;

    // Function that adds staking NFT
    function addToken( bytes32 _ticker, address _tokenAddress) onlyOwner() external {
        tokens[_ticker] = StakeToken(_ticker, _tokenAddress);
        stakeTokenList.push(_ticker);
    }

    // Function that allows user to deposit staking NFT
    function depositNFT(uint _tokenId, bytes32 _ticker) external {

    }
    
    function sellStake() public {
    }

    function buyStake() public {
        require(msg.value > 0, "Can not purchase no stake");
    }


}