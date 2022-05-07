require("dotenv").config();
const { newKit } = require("@celo/contractkit");
const BigNumber = require("bignumber.js");
// ABIs
const LendingPoolAddressesProvider = require("./abi/LendingPoolAddressesProvider.json");
const LendingPool = require("./abi/LendingPool.json");
const LendingPoolDataProvider = require("./abi/LendingPoolDataProvider.json");
const { isUserDataEmpty } = require("./src/common");
const ether = "1000000000000000000";

function toBN(num) {
  return new BigNumber(num);
}

function scale(num) {
  return toBN(num).dividedBy(ether).toFixed();
}

async function getUserData(userAddress) {
  let kit;
  let addressProvider;

  kit = newKit("https://forno.celo.org");
  addressProvider = new kit.web3.eth.Contract(
    LendingPoolAddressesProvider,
    "0x7AAaD5a5fa74Aec83b74C2a098FBC86E17Ce4aEA"
  );

  const web3 = kit.web3;
  const eth = web3.eth;

  const lendingPool = new eth.Contract(
    LendingPool,
    await addressProvider.methods.getLendingPool().call()
  );

  const lendingPoolDataProvider = new eth.Contract(
    LendingPoolDataProvider,
    await addressProvider.methods.getLendingPoolDataProvider().call()
  );

  const user = userAddress;
  let data;
  try {
    data = await lendingPool.methods.getUserAccountData(user).call();
  } catch (err) {
    data = await lendingPoolDataProvider.methods
      .calculateUserGlobalData(user)
      .call();
    data.availableBorrowsETH = 0;
  }
  const parsedData = {
    totalLiquidity: scale(
      data.totalLiquidityETH || data.totalLiquidityBalanceETH
    ),
    totalCollateral: scale(
      data.totalCollateralETH || data.totalCollateralBalanceETH
    ),
    totalBorrow: scale(data.totalBorrowsETH || data.totalBorrowBalanceETH),
    totalFees: scale(data.totalFeesETH),
    availableBorrow: scale(data.availableBorrowsETH),
    liquidationThreshold: `${data.currentLiquidationThreshold}%`,
    loanToValue: `${data.ltv || data.currentLtv}%`,
    healthFactor: scale(data.healthFactor),
  };

  return parsedData;
}

module.exports = {
  getUserData,
};

getUserData("0x714F03f55b07B067C31d550677d2e436D84d7A47").then((v) =>
  console.log(v)
);
