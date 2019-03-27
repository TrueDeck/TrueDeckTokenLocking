// Allows us to use ES6 in our migrations and tests.
require("babel-register");
require("babel-polyfill");
require('dotenv').config();

var HDWalletProvider = require("truffle-hdwallet-provider");

let mnemonic = process.env.MNEMONIC;
let infura_apikey = process.env.INFURA_API_KEY;

module.exports = {
    // See <http://truffleframework.com/docs/advanced/configuration>
    // for more about customizing your Truffle configuration!
    networks: {
        development: {
            host: "127.0.0.1",
            port: 8545,
            network_id: "*" // Match any network id
        },
        ropsten: {
            provider: function() {
                return new HDWalletProvider(mnemonic, "https://ropsten.infura.io/" + infura_apikey);
            },
            network_id: 3,
            gas: 4600000
        },
        mainnet: {
            provider: function() {
                return new HDWalletProvider(mnemonic, "https://mainnet.infura.io/" + infura_apikey);
            },
            network_id: 1,
            gas: 4600000
        }
    },
    solc: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
};
