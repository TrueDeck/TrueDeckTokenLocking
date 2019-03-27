pragma solidity 0.4.23;

library SafeMath {
    function mul(uint256 _a, uint256 _b) internal pure returns (uint256) {
        if (_a == 0) {
            return 0;
        }
        uint256 c = _a * _b;
        require(c / _a == _b);

        return c;
    }

    function div(uint256 _a, uint256 _b) internal pure returns (uint256) {
        require(_b > 0);
        uint256 c = _a / _b;

        return c;
    }

    function sub(uint256 _a, uint256 _b) internal pure returns (uint256) {
        require(_b <= _a);
        uint256 c = _a - _b;

        return c;
    }

    function add(uint256 _a, uint256 _b) internal pure returns (uint256) {
        uint256 c = _a + _b;
        require(c >= _a);

        return c;
    }
}

contract ERC20 {
    function totalSupply() public view returns (uint256);

    function balanceOf(address _who) public view returns (uint256);

    function allowance(address _owner, address _spender)
        public view returns (uint256);

    function transfer(address _to, uint256 _value) public returns (bool);

    function approve(address _spender, uint256 _value)
        public returns (bool);

    function transferFrom(address _from, address _to, uint256 _value)
        public returns (bool);

    event Transfer(
        address indexed from,
        address indexed to,
        uint256 value
    );

    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

contract Ownable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor () internal {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), _owner);
    }

    function owner() public view returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        require(isOwner());
        _;
    }

    function isOwner() public view returns (bool) {
        return msg.sender == _owner;
    }

    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    function transferOwnership(address newOwner) public onlyOwner {
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal {
        require(newOwner != address(0));
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

contract TokenBurner {
    function burn() public {
        selfdestruct(address(this));
    }
}

/**
 * @title BurnableTimelock
 * @dev BurnableTimelock is a token holder contract that will allow a
 * beneficiary to extract the tokens after a given release time.
 *
 */
contract BurnableTimelock is Ownable {
    using SafeMath for uint256;

    ERC20 private _token;

    address private _beneficiary;

    uint256 private _releaseTime;

    uint256 private _totalBurned;

    constructor (address token, address beneficiary, uint256 releaseTime) public {
        require(releaseTime > block.timestamp);
        _token = ERC20(token);
        _beneficiary = beneficiary;
        _releaseTime = releaseTime;
    }

    function token() public view returns (ERC20) {
        return _token;
    }

    function beneficiary() public view returns (address) {
        return _beneficiary;
    }

    function releaseTime() public view returns (uint256) {
        return _releaseTime;
    }

    function totalBurned() public view returns (uint256) {
        return _totalBurned;
    }

    function tokenBalance() public view returns (uint256) {
        return _token.balanceOf(address(this));
    }

    function release() public {
        require(block.timestamp >= _releaseTime);

        uint256 amount = _token.balanceOf(address(this));
        require(amount > 0);

        _token.transfer(_beneficiary, amount);
    }

    function burn(uint256 burnAmount) public onlyOwner {
        require(burnAmount > 0);

        uint256 amount = _token.balanceOf(address(this));
        require(amount >= burnAmount);

        TokenBurner burner = new TokenBurner();
        if (_token.transfer(address(burner), burnAmount)) {
            _totalBurned = _totalBurned.add(burnAmount);
            burner.burn();
        }
    }
}
