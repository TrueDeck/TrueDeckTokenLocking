var BurnableTimelock = artifacts.require("BurnableTimelock");

module.exports = function(deployer, network, accounts) {
    var tdpTokenAddress = "0x5b11aAcB6Bddb9ffab908FDCE739Bf4aed554327";
    var releaseTime = 1648771200;   // Friday, April 1, 2022 12:00:00 AM UTC
    var releaseDelay = 864000;      // 10 days

    if (network === "ropsten") {
        tdpTokenAddress = "0x861B765D069bb08C4c8fC294CebfB4e85d2cA8B0";
        releaseTime = 1553618317;
    }

    console.log(`  Deploying BurnableTimelock on ${network}:`);
    console.log(`  - TOKEN = ${tdpTokenAddress}`);
    console.log(`  - FROM  = ${accounts[0]}`);
    console.log(`  - TIME  = ${releaseTime}`);
    console.log(`  - DELAY = ${releaseDelay}`);

    deployer.deploy(BurnableTimelock, tdpTokenAddress, accounts[0], releaseTime, releaseDelay);
};
