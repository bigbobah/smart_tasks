# Smart Tasks

A "proof of concept" application for the payable tasks board implemented with Ethereum smart contract.

Installation:
-------------

1. Install npm dependencies:
```
npm install
```

2. Run truffle develop console:
```
truffle develop
```

3. Under truffle console, compile & migrate smart contract:
```
compile
migrate --reset
```

4. In separate shell run dev server:
```
npm run dev
```


Deploy notes
------------

To build a front-end app package ready to deploy run:
```
npm run build
```

An instance of working smart-contract is already reployed on Ropsten network, by address
```
0x91A91DBFfCe57baEd9033fFb3A5B766996ce3289
```

To interact with Ropsten-deployed smart-contract, use the prebuilt artifact file from directory "ropsten_build"
