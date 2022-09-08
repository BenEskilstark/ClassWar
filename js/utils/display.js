// @flow

const displayMoney = (money): string => {
  if (money < 1000000) {
    return '$' + Number(Math.floor(money)).toLocaleString();
  } else {
    return '$' + (money / 1000000).toFixed(2) + 'M';
  }
}

const displayPercent = (percent): string => {
  const diff = percent * 100 - (Math.floor(percent * 100));
  if (diff >= 0.01) {
    return (percent * 100).toFixed(2) + '%';
  }
  return (percent * 100).toFixed(0) + '%';
}

module.exports = {
  displayMoney,
  displayPercent,
};
