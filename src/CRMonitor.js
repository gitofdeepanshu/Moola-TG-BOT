const { newKit } = require("@celo/contractkit");
const LendingPoolAddressesProvider = require("../abi/LendingPoolAddressesProvider.json");
const LendingPool = require("../abi/LendingPool.json");
const LendingPoolDataProvider = require("../abi/LendingPoolDataProvider.json");
const BigNumber = require("bignumber.js");

const ether = "1000000000000000000";

function toBN(num) {
  return new BigNumber(num);
}
function scale(num) {
  return toBN(num).dividedBy(ether).toFixed();
}

function getWeb3() {
  return newKit("https://forno.celo.org");
}

async function getUserData(userAddress) {
  let kit;
  let addressProvider;

  kit = getWeb3();
  addressProvider = new kit.web3.eth.Contract(
    LendingPoolAddressesProvider,
    "0xD1088091A174d33412a968Fa34Cb67131188B332"
  );

  const web3 = kit.web3;
  const eth = web3.eth;

  const lendingPool = new eth.Contract(
    LendingPool,
    await addressProvider.methods.getLendingPool().call()
  );

  const user = userAddress;
  let data = await lendingPool.methods.getUserAccountData(user).call();
 
  const parsedData = {
    TotalLiquidity: scale(
      data.totalLiquidityETH || data.totalLiquidityBalanceETH
    ),
    TotalCollateral: scale(
      data.totalCollateralETH || data.totalCollateralBalanceETH
    ),
    TotalBorrow: scale(data.totalBorrowsETH || data.totalBorrowBalanceETH),
    TotalFees: scale(data.totalFeesETH),
    AvailableBorrow: scale(data.availableBorrowsETH),
    LiquidationThreshold: `${data.currentLiquidationThreshold}%`,
    LoanToValue: `${data.ltv || data.currentLtv}%`,
    healthFactor: scale(data.healthFactor),
  };

  return parsedData;
}

module.exports = {
  getUserData,
  getWeb3
};
