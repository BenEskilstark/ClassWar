// @flow

const {randomIn, normalIn} = require('bens_utils').stochastic;

// function to potentially initialize with randomized values
const IS_RANDOMIZED = true;

const val = (base, min, max, isNormal) => {
  if (!IS_RANDOMIZED) return base;
  // handle floats between 0 and 1
  let mult = 1;
  if ((min > 0 && min < 1) || (max > 0 && max <= 1)) {
    mult = 100;
  }
  if (isNormal) {
    return normalIn(min * mult, max * mult) / mult;
  }
  return randomIn(min * mult, max * mult) / mult;
};

const factionHealth = (game) => {
  let scores = {};
  for (const factionName in game.factions) {
    const faction = game.factions[factionName];
    const wealthScore = 10000000 * 1 / (faction.wealth + 1)
    scores[factionName] = (100 - faction.favorability) + wealthScore;
  }
  return scores;
}

window.dire = factionHealth;


const config = {
  isRandomized: IS_RANDOMIZED,
  msPerTick: 1000,
  maxTickerLength: 7,

  capital: 5000000,

  subsidyDeficitMult: 5,
  wagesDeficitMult: 5,

  factions: {
    // ['Military']: {
    //   name: 'Military',
    //   wealth: 500000,
    //   taxRate: 0,
    //   subsidy: val(0, 25000, 75000),
    //   population: val(500, 1000, 5000, true),
    //   favorability: 50,
    //   favTotal: 0,
    //   props: {
    //     upkeepCosts: val(25000, 25000, 50000), // cost per turn from their wealth
    //   },
    // },

    ['Landowners']: {
      name: 'Landowners',
      description: 'The landed aristocracy owns the land where people live and farm',
      wealth: 1000000,
      taxRate: val(0.2, 0.2, 0.6),
      subsidy: val(0, 1000, 5000),
      population: val(50, 1, 100, true),
      favorability: 50,
      favTotal: 0,
      props: {
        workingClassRent: val(2, 1, 3), // rent charged to working class per turn
        middleClassRent: val(10, 5, 10), // charged to middle class per turn
        hiringRate: 0.1,
        foodInventory: 100000, // how much food is available
      },
    },

    ['Corporations']: {
      name: 'Corporations',
      description: 'Businesses that employ the Working ' +
        'and Middle Classes to produce goods people need',
      wealth: 3500000,
      taxRate: val(0.2, 0, 0.4),
      subsidy: val(0, 10000, 50000),
      population: val(50, 1, 100, true),
      favorability: 50,
      favTotal: 0,
      props: {
        hiringRate: 0.1,
        inventory: 1000000,
        price: val(5, 3, 6),
      },
    },

    ['Intelligentsia']: {
      name: 'Intelligentsia',
      description: 'The intellectual and cultural elite of society. From time to' +
        ' time they produce movies that people like and skill gains that increase' +
        ' productivity',
      wealth: 1000000,
      taxRate: 0,
      subsidy: val(0, 25000, 75000),
      population: val(1000, 100, 10000),
      favorability: 50,
      favTotal: 0,
      props: {
        upkeepCosts: val(25000, 25000, 50000), // cost per turn from their wealth
        universities: 1, // makes skill increases more likely
        movieStudios: 1, // makes favorability increases more likely
      },
    },

    ['Farmers']: {
      name: 'Farmers',
      description: 'Farmers work the land owned by landowners to produce food ' +
        'which everyone needs to eat',
      wealth: 500000,
      taxRate: 0.01,
      subsidy: val(0, 25000, 75000),
      population: val(10000, 20000, 50000),
      favorability: 50,
      favTotal: 0,
      props: {
        wage: val(3, 3, 6), // wage going to each employed person
        unemployment: val(0.1, 0, 0.2), // rate of not employed
        skill: 2, // how much food each employed farmed produces
        unhoused: 0, // can't afford housing
      },
    },

    ['Working Class']: {
      name: 'Working Class',
      description: 'Factory workers are employed by the corporations and work to ' +
        'produce the goods people need',
      wealth: 500000,
      taxRate: val(0.3, 0, 0.4),
      subsidy: val(0, 0, 10000),
      population: val(10000, 10000, 50000),
      favorability: 50,
      favTotal: 0,
      props: {
        unemployment: val(0.1, 0, 0.3), // rate of not employed
        wage: val(3, 4, 7), // wage going to each employed person
        demand: 1, // how much inventory each person wants
        unhoused: 0, // can't afford housing
      },
    },

    ['Middle Class']: {
      name: 'Middle Class',
      description: 'Middle class workers also work for the corporations and contribute' +
        ' to the production of goods proportional to their skill',
      wealth: 750000,
      taxRate: val(0.4, 0, 0.4),
      subsidy: val(0, 5000, 15000),
      population: val(1000, 2000, 10000),
      favorability: 50,
      favTotal: 0,
      props: {
        unemployment: val(0.1, 0, 0.3), // rate of not employed
        wage: val(10, 25, 35, true), // wage going to each employed person
        demand: val(2, 4, 5), // how much inventory each person wants
        skill: 3, // val(5, 3, 4), // how much more productive than working class
      },
    },

  },
};

const policies = [
  // Government Policies
  {
    name: 'Reduce Corporate Subsidies',
    description: 'We must stop the corporate handouts and keep the money for more important ' +
      'societal projects.',
    support: ['Intelligentsia'],
    oppose: ['Corporations'],
    changes: (game) => {
      return [{
        path: ['factions', 'Corporations', 'subsidy'],
        operation: 'MULTIPLY',
        value: val(0.5, 0.2, 0.8),
      }];
    },
    getWeight: (game) => {
      let mult = 1;
      if (game.capital < 100000) {
        mult = 4;
      }
      return mult * (100 - game.factions['Working Class'].favorability);
    },
  },
  {
    name: 'Reduce Middle Class Subsidies',
    description: 'We must reel in the nanny state and keep the money for more important ' +
      'societal projects.',
    support: ['Landowners', 'Corporations'],
    oppose: ['Middle Class'],
    changes: (game) => {
      return [{
        path: ['factions', 'Middle Class', 'subsidy'],
        operation: 'MULTIPLY',
        value: val(0.5, 0.2, 0.8),
      }];
    },
    getWeight: (game) => {
      let mult = 1;
      if (game.capital < 100000) {
        mult = 4;
      }
      return mult * (100 - game.factions['Corporations'].favorability);
    },
  },
  {
    name: 'Reduce Working Class Subsidies',
    description: 'We must reel in the nanny state and keep the money for more important ' +
      'societal projects.',
    support: ['Landowners', 'Corporations'],
    oppose: ['Working Class'],
    changes: (game) => {
      return [{
        path: ['factions', 'Working Class', 'subsidy'],
        operation: 'MULTIPLY',
        value: val(0.5, 0.2, 0.8),
      }];
    },
    getWeight: (game) => {
      let mult = 1;
      if (game.capital < 100000) {
        mult = 4;
      }
      return mult * (100 - game.factions['Corporations'].favorability);
    },
  },
  {
    name: 'Reduce Subsidy to Intelligentsia',
    description: 'These elitists are wasting money.',
    support: ['Landowners', 'Corporations', 'Working Class'],
    oppose: ['Intelligentsia'],
    changes: (game) => {
      return [{
        path: ['factions', 'Intelligentsia', 'subsidy'],
        operation: 'MULTIPLY',
        value: val(0.5, 0.4, 0.8),
      }];
    },
    getWeight: (game) => {
      let mult = 1;
      if (game.capital < 100000) {
        mult = 4;
      }
      return mult * (100 - game.factions['Corporations'].favorability);
    },
  },
  {
    name: 'Reduce Subsidy to Farmers',
    description: 'Farmers are taking too much from the government',
    support: ['Landowners'],
    oppose: ['Farmers'],
    changes: (game) => {
      return [{
        path: ['factions', 'Farmers', 'subsidy'],
        operation: 'MULTIPLY',
        value: val(0.5, 0.4, 0.8),
      }];
    },
    getWeight: (game) => {
      let mult = 1;
      if (game.capital < 100000) {
        mult = 4;
      }
      return mult * (100 - game.factions['Landowners'].favorability);
    },
  },
  {
    name: 'Raise Middle Class Tax Rate',
    description: "To balance the budget, we'll have to ask for a fairer share from " +
      "the more privileged among us.",
    support: ['Corporations', 'Landowners'],
    oppose: ['Middle Class'],
    changes: (game) => {
      return [{
        path: ['factions', 'Middle Class', 'taxRate'],
        operation: 'MULTIPLY',
        value: val(1, 11, 20) / 10,
      }];
    },
    getWeight: (game) => {
      let mult = 1;
      if (game.capital < 100000) {
        mult = 3;
      }
      return mult * (100 - game.factions['Corporations'].favorability);
    },
  },
  {
    name: 'Raise Working Class Tax Rate',
    description: "In these times of austerity, everyone must chip in to keep " +
      "society afloat.",
    support: ['Corporations', 'Landowners'],
    oppose: ['Working Class'],
    changes: (game) => {
      return [{
        path: ['factions', 'Working Class', 'taxRate'],
        operation: 'MULTIPLY',
        value: val(1, 11, 20) / 10,
      }];
    },
    getWeight: (game) => {
      let mult = 1;
      if (game.capital < 100000) {
        mult = 3;
      }
      return mult * (100 - game.factions['Corporations'].favorability);
    },
  },
  {
    name: 'Raise Farmers Tax Rate',
    description: "In these times of austerity, everyone must chip in to keep " +
      "society afloat.",
    support: ['Corporations', 'Landowners'],
    oppose: ['Farmers'],
    changes: (game) => {
      return [{
        path: ['factions', 'Farmers', 'taxRate'],
        operation: 'MULTIPLY',
        value: val(1, 11, 20) / 10,
      }];
    },
    getWeight: (game) => {
      let mult = 1;
      if (game.capital < 100000) {
        mult = 3;
      }
      return mult * (100 - game.factions['Landowners'].favorability);
    },
  },
  {
    name: 'Raise Corporate Tax Rate',
    description: "To balance the budget, we'll have to ask for a fairer share from " +
      "the richest among us",
    support: ['Intelligentsia', 'Working Class', 'Middle Class'],
    oppose: ['Corporations'],
    changes: (game) => {
      return [{
        path: ['factions', 'Corporations', 'taxRate'],
        operation: 'MULTIPLY',
        value: val(1, 11, 20) / 10,
      }];
    },
    getWeight: (game) => {
      let mult = 1;
      if (game.capital < 100000) {
        mult = 4;
      }
      return mult * (100 - game.factions['Middle Class'].favorability);
    },
  },
  {
    name: 'Raise Landowners Tax Rate',
    description: "To balance the budget, we'll have to ask for a fairer share from " +
      "the richest among us",
    support: ['Working Class', 'Middle Class', 'Intelligentsia'],
    oppose: ['Landowners'],
    changes: (game) => {
      return [{
        path: ['factions', 'Landowners', 'taxRate'],
        operation: 'MULTIPLY',
        value: val(1, 11, 20) / 10,
      }];
    },
    getWeight: (game) => {
      let mult = 1;
      if (game.capital < 100000) {
        mult = 5;
      }
      return mult * (100 - game.factions['Intelligentsia'].favorability);
    },
  },
  {
    name: 'Reclaim Landowners money',
    description: "To balance the budget, we'll have to ask for a fairer share from " +
      "the richest among us",
    support: ['Working Class', 'Middle Class', 'Intelligentsia'],
    oppose: ['Landowners'],
    changes: (game) => {
      const value = Math.min(val(250000, 50000, 500000), game.factions.Landowners.wealth);
      return [
        {
          path: ['factions', 'Landowners', 'wealth'],
          operation: 'ADD',
          value: -1 * value,
        },
        {
          path: ['capital'],
          operation: 'ADD',
          value,
        },
        {
          path: ['factions', 'Landowners', 'favorability'],
          operation: 'ADD',
          value: -10,
        },
      ];
    },
    getWeight: (game) => {
      let mult = 1;
      if (game.capital < 100000) {
        mult = 5;
      }
      return mult * (100 - game.factions['Intelligentsia'].favorability);
    },
  },
  {
    name: 'Lower Prices',
    description: 'Supply and Demand dictates lower prices required!',
    support: ['Middle Class', 'Working Class'],
    oppose: ['Corporations'],
    changes: (game) => {
      const priceChange = val(0.5, 0.5, 0.8);
      return [
        {
          path: ['factions', 'Corporations', 'props', 'price'],
          operation: 'MULTIPLY',
          value: priceChange,
        },
        {
          path: ['factions', 'Middle Class', 'props', 'demand'],
          operation: 'MULTIPLY',
          value: Math.round(1 / priceChange * 100) / 100,
        },
      ];
    },
    getWeight: (game) => {
      return 100 - game.factions['Middle Class'].favorability;
    },
  },

  // Corporate Policies
  {
    name: 'Subsidize Corporations',
    description: 'Business is the bedrock of the economy so we need to give all the ' +
      'support that we can afford.',
    support: ['Corporations'],
    oppose: ['Intelligentsia', 'Middle Class', 'Working Class'],
    changes: (game) => {
      return [{
        path: ['factions', 'Corporations', 'subsidy'],
        operation: 'ADD',
        value: val(25000, 10000, 100000),
      }];
    },
    useOnce: false,
    getWeight: (game) => {
      return 100 - game.factions['Corporations'].favorability;
    },
  },
  {
    name: 'Raise Prices',
    description: 'Supply and Demand dictates higher prices required!',
    support: ['Corporations'],
    oppose: ['Middle Class', 'Working Class', 'Intelligentsia'],
    changes: (game) => {
      const priceChange = val(15, 11, 30) / 10;
      return [
        {
          path: ['factions', 'Corporations', 'props', 'price'],
          operation: 'MULTIPLY',
          value: priceChange,
        },
        {
          path: ['factions', 'Middle Class', 'props', 'demand'],
          operation: 'MULTIPLY',
          value: Math.round(1 / priceChange * 100) / 100 + 0.1,
        },
      ];
    },
    getWeight: (game) => {
      const mids = game.factions['Middle Class'];
      if (mids.props.demand > mids.props.skill) {
        return 500;
      } else {
        return 100 - game.factions['Corporations'].favorability;
      }
    },
  },
  {
    name: 'Lower Corporate Tax Rate',
    description: 'Business leaders NEED lower taxes in order to keep the economy ' +
      'going, please lower their taxes.',
    support: ['Corporations'],
    oppose: ['Intelligentsia', 'Middle Class', 'Working Class'],
    changes: (game) => {
      return [{
        path: ['factions', 'Corporations', 'taxRate'],
        operation: 'MULTIPLY',
        value: val(0.5, 0.3, 0.8),
      }];
    },
    getWeight: (game) => {
      return 100 - game.factions['Corporations'].favorability;
    },
  },
  {
    name: 'Lower Middle Class Wages',
    description: "Workers don't deserve as much pay as they're getting, by lowering " +
      "their wages we can focus on the important things -- business.",
    support: ['Corporations'],
    oppose: ['Middle Class', 'Intelligentsia'],
    changes: (game) => {
      return [{
        path: ['factions', 'Middle Class', 'props', 'wage'],
        operation: 'MULTIPLY',
        value: val(0.5, 0.5, 0.9),
      }];
    },
    getWeight: (game) => {
      return 100 - game.factions['Corporations'].favorability;
    },
  },
  {
    name: 'Lower Working Class Wages',
    description: "Workers don't deserve as much pay as they're getting, by lowering " +
      "their wages we can focus on the important things -- business.",
    support: ['Corporations'],
    oppose: ['Working Class', 'Intelligentsia'],
    changes: (game) => {
      return [{
        path: ['factions', 'Working Class', 'props', 'wage'],
        operation: 'MULTIPLY',
        value: val(0.5, 0.5, 0.9),
      }];
    },
    getWeight: (game) => {
      return 100 - game.factions['Corporations'].favorability;
    },
  },
  {
    name: 'Corporate Handout',
    description: 'Business is the bedrock of the economy so we need to give all the ' +
      'support that we can afford.',
    support: ['Corporations'],
    oppose: ['Intelligentsia', 'Middle Class', 'Working Class'],
    changes: (game) => {
      const value = Math.min(val(250000, 100000, 500000), game.capital);
      return [
        {
          path: ['factions', 'Corporations', 'wealth'],
          operation: 'ADD',
          value,
        },
        {
          path: ['capital'],
          operation: 'ADD',
          value: -1 * value,
        },
      ];
    },
    useOnce: false,
    getWeight: (game) => {
      return 100 - game.factions['Corporations'].favorability;
    },
  },
  {
    name: "Corporate Bailout",
    isRadical: true,
    description: "We need radical solutions to save the Corporations",
    support: ['Corporations'],
    oppose: ['Intelligentsia', 'Working Class', 'Middle Class'],
    changes: (game) => {
      const handout = Math.min(val(500000, 250000, 1000000), game.capital);
      return [
        {
          path: ['factions', 'Corporations', 'wealth'],
          operation: 'ADD',
          value: handout,
        },
        {
          path: ['capital'],
          operation: 'ADD',
          value: -1 * handout,
        },
        {
          path: ['factions', 'Corporations', 'taxRate'],
          operation: 'MULTIPLY',
          value: 0.1,
        },
        {
          path: ['factions', 'Corporations', 'props', 'price'],
          operation: 'MULTIPLY',
          value: 2,
        },
        {
          path: ['factions', 'Corporations', 'favorability'],
          operation: 'ADD',
          value: 20,
        },
      ];
    },
    getWeight: (game) => {
      if (game.factions['Corporations'].favorability > 0) {
        return 1;
      } else {
        return 1000;
      }
    },
  },


  // Middle Class Policies
  {
    name: 'Lower Middle Class Tax Rate',
    description: 'A thriving Middle Class is critical to a healthy society -- ' +
      ' we must reduce their burden by lowering their taxes.',
    support: ['Middle Class'],
    oppose: ['Working Class'],
    changes: (game) => {
      return [{
        path: ['factions', 'Middle Class', 'taxRate'],
        operation: 'MULTIPLY',
        value: val(0.5, 0.3, 0.8),
      }];
    },
    getWeight: (game) => {
      return 100 - game.factions['Middle Class'].favorability;
    },
  },
  {
    name: 'Subsidize Middle Class',
    description: 'The Middle Class is the bedrock of the economy so we need to give all the ' +
      'support that we can afford.',
    support: ['Middle Class'],
    oppose: ['Corporations', 'Working Class'],
    changes: (game) => {
      return [{
        path: ['factions', 'Middle Class', 'subsidy'],
        operation: 'ADD',
        value: val(15000, 5000, 25000),
      }];
    },
    useOnce: false,
    getWeight: (game) => {
      return 100 - game.factions['Middle Class'].favorability;
    },
  },
  {
    name: 'Lower Middle Class Rent',
    description: 'Rent is too high for our most skilled workers.',
    support: ['Middle Class'],
    oppose: ['Landowners'],
    changes: (game) => {
      return [{
        path: ['factions', 'Landowners', 'props', 'middleClassRent'],
        operation: 'MULTIPLY',
        value: val(0.5, 0.5, 0.9),
      }];
    },
    getWeight: (game) => {
      return 100 - game.factions['Middle Class'].favorability;
    },
  },
  {
    name: 'Middle Class Relief Checks',
    description: 'The Middle Class is the bedrock of the economy so we need to give all the ' +
      'support that we can afford.',
    support: ['Middle Class'],
    oppose: ['Corporations', 'Landowners', 'Working Class'],
    changes: (game) => {
      const handout = Math.min(val(50000, 50000, 150000), game.capital);
      return [
        {
          path: ['factions', 'Middle Class', 'wealth'],
          operation: 'ADD',
          value: handout,
        },
        {
          path: ['capital'],
          operation: 'ADD',
          value: -1 * handout,
        },
      ];
    },
    useOnce: false,
    getWeight: (game) => {
      return 100 - game.factions['Middle Class'].favorability;
    },
  },
  {
    name: 'Raise Middle Class Wages',
    description: "Skilled workers need to be compensated fairly for their work",
    support: ['Middle Class'],
    oppose: ['Corporations'],
    changes: (game) => {
      return [{
        path: ['factions', 'Middle Class', 'props', 'wage'],
        operation: 'MULTIPLY',
        value: val(12.5, 11, 25) / 10,
      }];
    },
    getWeight: (game) => {
      return 100 - game.factions['Middle Class'].favorability;
    },
  },
  {
    name: "Save the Middle Class",
    isRadical: true,
    description: "We need radical solutions to get the Middle Class back on track",
    support: ['Middle Class'],
    oppose: ['Corporations', 'Landowners'],
    changes: (game) => {
      const handout = Math.min(val(50000, 50000, 250000), game.capital);
      return [
        {
          path: ['factions', 'Middle Class', 'wealth'],
          operation: 'ADD',
          value: handout,
        },
        {
          path: ['capital'],
          operation: 'ADD',
          value: -1 * handout,
        },
        {
          path: ['factions', 'Middle Class', 'taxRate'],
          operation: 'MULTIPLY',
          value: 0.1,
        },
        {
          path: ['factions', 'Middle Class', 'props', 'wage'],
          operation: 'ADD',
          value: 2,
        },
        {
          path: ['factions', 'Middle Class', 'props', 'unemployment'],
          operation: 'MULTIPLY',
          value: 0.1,
        },
        {
          path: ['factions', 'Middle Class', 'favorability'],
          operation: 'ADD',
          value: 20,
        },
      ];
    },
    getWeight: (game) => {
      if (game.factions['Middle Class'].favorability > 0) {
        return 1;
      } else {
        return 1000;
      }
    },
  },


  // Working Class Policies
  {
    name: 'Lower Working Class Tax Rate',
    description: "Enough is enough! We must stop taking so much from the people!",
    support: ['Working Class'],
    oppose: ['Corporations'],
    changes: (game) => {
      return [{
        path: ['factions', 'Working Class', 'taxRate'],
        operation: 'MULTIPLY',
        value: val(0.5, 0.3, 0.9),
      }];
    },
    getWeight: (game) => {
      return 100 - game.factions['Working Class'].favorability;
    },
  },
  {
    name: 'Raise Working Class Wages',
    description: "All workers deserve a living wage",
    support: ['Working Class'],
    oppose: ['Corporations', 'Landowners'],
    changes: (game) => {
      return [{
        path: ['factions', 'Working Class', 'props', 'wage'],
        operation: 'ADD',
        value: val(3, 1, 4),
      }];
    },
    getWeight: (game) => {
      return 2 * (100 - game.factions['Working Class'].favorability);
    },
  },
  {
    name: 'Lower Working Class Rent',
    description: 'The rent is too damn high!',
    support: ['Working Class'],
    oppose: ['Landowners'],
    changes: (game) => {
      return [{
        path: ['factions', 'Landowners', 'props', 'workingClassRent'],
        operation: 'MULTIPLY',
        value: val(0.5, 0.5, 0.9),
      }];
    },
    getWeight: (game) => {
      return 100 - game.factions['Working Class'].favorability;
    },
  },
  {
    name: 'Subsidize Working Class',
    description: 'The Working Class is the bedrock of the economy so we need to give all the ' +
      'support that we can afford.',
    support: ['Working Class'],
    oppose: ['Corporations', 'Middle Class'],
    changes: (game) => {
      return [{
        path: ['factions', 'Working Class', 'subsidy'],
        operation: 'ADD',
        value: val(15000, 5000, 25000),
      }];
    },
    useOnce: false,
    getWeight: (game) => {
      return 2 * (100 - game.factions['Working Class'].favorability);
    },
  },
  {
    name: 'Working Class Relief Checks',
    description: 'The Working Class is the bedrock of the economy so we need to give all the ' +
      'support that we can afford.',
    support: ['Working Class'],
    oppose: ['Corporations', 'Landowners'],
    changes: (game) => {
      const handout = Math.min(val(100000, 50000, 150000), game.capital);
      return [
        {
          path: ['factions', 'Working Class', 'wealth'],
          operation: 'ADD',
          value: handout,
        },
        {
          path: ['capital'],
          operation: 'ADD',
          value: -1 * handout,
        },
      ];
    },
    useOnce: false,
    getWeight: (game) => {
      return 100 - game.factions['Working Class'].favorability;
    },
  },
  {
    name: "Worker's Rights Overhaul",
    isRadical: true,
    description: "We need radical solutions to get the Working Class back on track",
    support: ['Working Class'],
    oppose: ['Corporations', 'Landowners'],
    changes: (game) => {
      const handout = Math.min(val(100000, 50000, 150000), game.capital);
      return [
        {
          path: ['factions', 'Working Class', 'wealth'],
          operation: 'ADD',
          value: handout,
        },
        {
          path: ['capital'],
          operation: 'ADD',
          value: -1 * handout,
        },
        {
          path: ['factions', 'Working Class', 'props', 'wage'],
          operation: 'ADD',
          value: 5,
        },
        {
          path: ['factions', 'Working Class', 'props', 'unemployment'],
          operation: 'MULTIPLY',
          value: 0.1,
        },
        {
          path: ['factions', 'Working Class', 'favorability'],
          operation: 'ADD',
          value: 20,
        },
      ];
    },
    getWeight: (game) => {
      if (game.factions['Working Class'].favorability > 0) {
        return 1;
      } else {
        return 10000;
      }
    },
  },
  {
    name: "Break the Strike!",
    isRadical: true,
    description: "We need radical solutions to get the Working Class back on track",
    support: ['Corporations', 'Landowners'],
    oppose: ['Working Class'],
    changes: (game) => {
      return [
        {
          path: ['factions', 'Working Class', 'population'],
          operation: 'MULTIPLY',
          value: val(0.7, 0.5, 0.8),
        },
        {
          path: ['factions', 'Working Class', 'props', 'unemployment'],
          value: 0,
        },
        {
          path: ['factions', 'Working Class', 'favorability'],
          operation: 'ADD',
          value: 15,
        },
      ];
    },
    getWeight: (game) => {
      if (game.factions['Working Class'].favorability > 0) {
        return 0;
      } else {
        return 10000;
      }
    },
  },

  // Landowner policies
  {
    name: 'Raise Working Class Rent',
    description: 'Renters must simply pay for the service provided',
    support: ['Landowners'],
    oppose: ['Working Class', 'Intelligentsia'],
    changes: (game) => {
      return [{
        path: ['factions', 'Landowners', 'props', 'workingClassRent'],
        operation: 'MULTIPLY',
        value: val(15, 11, 20) / 10,
      }];
    },
    getWeight: (game) => {
      return 100 - game.factions['Landowners'].favorability;
    },
  },
  {
    name: 'Raise Middle Class Rent',
    description: 'Renters must simply pay for the service provided',
    support: ['Landowners'],
    oppose: ['Middle Class', 'Intelligentsia'],
    changes: (game) => {
      return [{
        path: ['factions', 'Landowners', 'props', 'middleClassRent'],
        operation: 'MULTIPLY',
        value: val(15, 11, 20) / 10,
      }];
    },
    getWeight: (game) => {
      return 100 - game.factions['Landowners'].favorability;
    },
  },
  {
    name: 'Lower Landowners Tax Rate',
    description: 'Landowners NEED lower taxes in order to keep people in their homes',
    support: ['Landowners'],
    oppose: ['Middle Class', 'Working Class', 'Intelligentsia'],
    changes: (game) => {
      return [{
        path: ['factions', 'Landowners', 'taxRate'],
        operation: 'MULTIPLY',
        value: val(0.5, 0.5, 0.8),
      }];
    },
    getWeight: (game) => {
      return 100 - game.factions['Landowners'].favorability;
    },
  },
  {
    name: 'Subsidize Landowners',
    description: 'Landowners are the bedrock of the economy so we need to give all the ' +
      'support that we can afford.',
    support: ['Landowners'],
    oppose: ['Intelligentsia'],
    changes: (game) => {
      return [{
        path: ['factions', 'Landowners', 'subsidy'],
        operation: 'ADD',
        value: val(15000, 10000, 25000),
      }];
    },
    useOnce: false,
    getWeight: (game) => {
      return 100 - game.factions['Landowners'].favorability;
    },
  },

  // Intelligentsia policies
  {
    name: 'Subsidize Intelligentsia',
    description: 'Intelligentsia are the bedrock of the economy so we need to give all the ' +
      'support that we can afford.',
    support: ['Intelligentsia'],
    oppose: ['Landowners', 'Corporations'],
    changes: (game) => {
      return [{
        path: ['factions', 'Intelligentsia', 'subsidy'],
        operation: 'ADD',
        value: val(15000, 10000, 25000),
      }];
    },
    useOnce: false,
    getWeight: (game) => {
      return 100 - game.factions['Landowners'].favorability;
    },
  },
  {
    name: 'Build University',
    description: 'Intelligentsia work in universities and will add more value to society ' +
      'if we have more of them',
    support: ['Intelligentsia'],
    oppose: ['Landowners', 'Corporations'],
    changes: (game) => {
      const handout = Math.min(val(50000, 50000, 250000), game.capital);
      return [
        {
          path: ['factions', 'Intelligentsia', 'props', 'universities'],
          operation: 'ADD',
          value: 1,
        },
        {
          path: ['factions', 'Intelligentsia', 'props', 'upkeepCosts'],
          operation: 'ADD',
          value: val(15000, 10000, 25000),
        },
        {
          path: ['factions', 'Intelligentsia', 'wealth'],
          operation: 'ADD',
          value: handout,
        },
        {
          path: ['capital'],
          operation: 'ADD',
          value: -1 * handout,
        },
      ];
    },
    useOnce: false,
    getWeight: (game) => {
      const numUs = game.factions.Intelligentsia.props.universities;
      return Math.max(10, 3 * game.factions['Intelligentsia'].favorability - 10 * (numUs - 1));
    },
  },
  {
    name: 'Fund a movie',
    description: 'Intelligentsia produce great works of culture that make people happier',
    support: ['Intelligentsia'],
    oppose: ['Landowners', 'Corporations'],
    changes: (game) => {
      const handout = Math.min(val(50000, 50000, 150000), game.capital);
      return [
        {
          path: ['factions', 'Intelligentsia', 'props', 'movieStudios'],
          operation: 'ADD',
          value: 1,
        },
        {
          path: ['factions', 'Intelligentsia', 'props', 'upkeepCosts'],
          operation: 'ADD',
          value: val(15000, 5000, 15000),
        },
        {
          path: ['factions', 'Intelligentsia', 'wealth'],
          operation: 'ADD',
          value: handout,
        },
        {
          path: ['capital'],
          operation: 'ADD',
          value: -1 * handout,
        },
      ];
    },
    useOnce: false,
    getWeight: (game) => {
      const numMs = game.factions.Intelligentsia.props.movieStudios;
      return Math.max(20, 3 * game.factions['Intelligentsia'].favorability - 10 * (numMs - 1));
    },
  },

  // Farmer Policies
  {
    name: 'Lower Farmers Tax Rate',
    description: "Enough is enough! We must stop taking so much from the people!",
    support: ['Farmers'],
    oppose: ['Corporations'],
    changes: (game) => {
      return [{
        path: ['factions', 'Farmers', 'taxRate'],
        operation: 'MULTIPLY',
        value: val(0.5, 0.3, 0.9),
      }];
    },
    getWeight: (game) => {
      return 100 - game.factions['Farmers'].favorability;
    },
  },
  {
    name: 'Raise Farmers Wages',
    description: "All workers deserve a living wage",
    support: ['Farmers'],
    oppose: ['Corporations', 'Landowners'],
    changes: (game) => {
      return [{
        path: ['factions', 'Farmers', 'props', 'wage'],
        operation: 'ADD',
        value: val(3, 1, 4),
      }];
    },
    getWeight: (game) => {
      return 2 * (100 - game.factions['Farmers'].favorability);
    },
  },
  {
    name: 'Subsidize Farmers',
    description: 'Farmers are the bedrock of the economy so we need to give all the ' +
      'support that we can afford.',
    support: ['Farmers'],
    oppose: ['Corporations', 'Middle Class', 'Landowners'],
    changes: (game) => {
      return [{
        path: ['factions', 'Farmers', 'subsidy'],
        operation: 'ADD',
        value: val(15000, 5000, 25000),
      }];
    },
    useOnce: false,
    getWeight: (game) => {
      return 2 * (100 - game.factions['Farmers'].favorability);
    },
  },
  {
    name: 'Farmers Relief Checks',
    description: 'Farmers are the bedrock of the economy so we need to give all the ' +
      'support that we can afford.',
    support: ['Farmers'],
    oppose: ['Corporations', 'Landowners'],
    changes: (game) => {
      const handout = Math.min(val(100000, 50000, 150000), game.capital);
      return [
        {
          path: ['factions', 'Farmers', 'wealth'],
          operation: 'ADD',
          value: handout,
        },
        {
          path: ['capital'],
          operation: 'ADD',
          value: -1 * handout,
        },
      ];
    },
    useOnce: false,
    getWeight: (game) => {
      return 100 - game.factions['Farmers'].favorability;
    },
  },
  {
    name: "Worker's Rights Overhaul",
    isRadical: true,
    description: "We need radical solutions to get the Farmers back on track",
    support: ['Farmers'],
    oppose: ['Corporations', 'Landowners'],
    changes: (game) => {
      const handout = Math.min(val(100000, 50000, 150000), game.capital);
      return [
        {
          path: ['factions', 'Farmers', 'wealth'],
          operation: 'ADD',
          value: handout,
        },
        {
          path: ['capital'],
          operation: 'ADD',
          value: -1 * handout,
        },
        {
          path: ['factions', 'Farmers', 'props', 'wage'],
          operation: 'ADD',
          value: 5,
        },
        {
          path: ['factions', 'Farmers', 'props', 'unemployment'],
          operation: 'MULTIPLY',
          value: 0.1,
        },
        {
          path: ['factions', 'Farmers', 'favorability'],
          operation: 'ADD',
          value: 20,
        },
      ];
    },
    getWeight: (game) => {
      if (game.factions['Farmers'].favorability > 0) {
        return 1;
      } else {
        return 10000;
      }
    },
  },
];


module.exports = {
  config,
  policies,
};
