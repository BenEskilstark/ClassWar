// @flow

const displayMoney = (money): string => {
  if (money < 1000000) {
    return '$' + Number(Math.floor(money)).toLocaleString();
  } else {
    return '$' + (money / 1000000).toFixed(1) + 'M';
  }
}

module.exports = {
  displayMoney,
};
