// @flow

const config = {
  msPerTick: 1000,
  maxTickerLength: 7,

  capital: 1000000,

  factions: {
    ['Corporations']: {
      name: 'Corporations',
      wealth: 500000,
      taxRate: 0.2,
      subsidy: 0,
      population: 50,
      favorability: 50,
      props: {
        production: 10, // value multiplier for each corp
      },
    },

    ['Middle Class']: {
      name: 'Middle Class',
      wealth: 50000,
      taxRate: 0.4,
      subsidy: 0,
      population: 1000,
      favorability: 50,
      props: {
        unemployment: 0.1, // rate of not employed
        wage: 10, // wage going to each employed person
        skill: 5, // how much more productive than working class each employed person is
        consumerism: 0.5, // how much wealth goes to buying things
      },
    },

    ['Working Class']: {
      name: 'Working Class',
      wealth: 0,
      taxRate: 0.3,
      subsidy: 0,
      population: 10000,
      favorability: 50,
      props: {
        unemployment: 0.1, // rate of not employed
        wage: 3, // wage going to each employed person
        consumerism: 0.9, // how much wealth goes to buying things
      },
    },

    // Intelligentsia -- produce production and skill gains (+ subsidy)

    // Military -- cost money for upkeep (subsidy)

    // Landowners -- produce food, charge rent
  },
};

module.exports = {
  config,
};
