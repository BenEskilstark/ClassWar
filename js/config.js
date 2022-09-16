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


const config = {
  isRandomized: IS_RANDOMIZED,
  msPerTick: 1000,
  maxTickerLength: 7,

  capital: 2500000,

  subsidyDeficitMult: 5,
  wagesDeficitMult: 5,

  factions: {

    ['Corporations']: {
      name: 'Corporations',
      wealth: 1500000,
      taxRate: val(0.2, 0, 0.4),
      subsidy: val(0, 10000, 50000),
      population: val(50, 1, 100, true),
      favorability: 50,
      props: {
        hiringRate: 0.1,
        inventory: 50000,
        price: val(5, 2, 7),
      },
    },

    ['Military']: {
      name: 'Military',
      wealth: 500000,
      taxRate: 0,
      subsidy: val(0, 25000, 75000),
      population: val(500, 1000, 5000, true),
      favorability: 50,
      props: {
        upkeepCosts: val(25000, 25000, 50000), // cost per turn from their wealth
      },
    },

    ['Landowners']: {
      name: 'Landowners',
      wealth: 1000000,
      taxRate: val(0.2, 0.2, 0.6),
      subsidy: val(0, 10000, 50000),
      population: val(50, 1, 100, true),
      favorability: 50,
      props: {
        workingClassRent: val(2, 1, 3), // rent charged to working class per turn
        middleClassRent: val(10, 5, 10), // charged to middle class per turn
      },
    },

    ['Working Class']: {
      name: 'Working Class',
      wealth: 500000,
      taxRate: val(0.3, 0, 0.4),
      subsidy: val(0, 0, 10000),
      population: val(10000, 1000, 50000),
      favorability: 50,
      props: {
        unemployment: val(0.1, 0, 0.3), // rate of not employed
        wage: val(3, 2, 6), // wage going to each employed person
        demand: 1, // how much inventory each person wants
        unhoused: 0, // can't afford housing
      },
    },

    ['Middle Class']: {
      name: 'Middle Class',
      wealth: 750000,
      taxRate: val(0.4, 0, 0.4),
      subsidy: val(0, 5000, 15000),
      population: val(1000, 100, 10000),
      favorability: 50,
      props: {
        unemployment: val(0.1, 0, 0.3), // rate of not employed
        wage: val(10, 2, 30, true), // wage going to each employed person
        demand: val(2, 2, 5), // how much inventory each person wants
        skill: val(5, 3, 8), // how much more productive than working class employed person is
      },
    },

    ['Intelligentsia']: {
      name: 'Intelligentsia',
      wealth: 1000000,
      taxRate: 0,
      subsidy: val(0, 25000, 75000),
      population: val(1000, 100, 10000),
      favorability: 50,
      props: {
        upkeepCosts: val(25000, 25000, 50000), // cost per turn from their wealth
        universities: 1, // makes skill increases more likely
        movieStudios: 1, // makes favorability increases more likely
      },
    },


    // Intelligentsia -- produce production and skill gains (+ subsidy)

    // Military -- cost money for upkeep (subsidy)

    // Landowners -- produce food, charge rent
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
    oppose: ['Middle Class', 'Working Class'],
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
          value: -1 * handout,
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
    oppose: ['Working Class', 'Middle Class'],
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
    oppose: ['Corporations', 'Working Class'],
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
    oppose: ['Corporations', 'Working Class'],
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
        value: vale(0.5, 0.3, 0.9),
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
    oppose: ['Corporations'],
    changes: (game) => {
      return [{
        path: ['factions', 'Working Class', 'props', 'wage'],
        operation: 'ADD',
        value: val(3, 1, 4),
      }];
    },
    getWeight: (game) => {
      return 100 - game.factions['Working Class'].favorability;
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
      return 100 - game.factions['Working Class'].favorability;
    },
  },
  {
    name: 'Working Class Relief Checks',
    description: 'The Working Class is the bedrock of the economy so we need to give all the ' +
      'support that we can afford.',
    support: ['Working Class'],
    oppose: ['Corporations', 'Middle Class'],
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
    oppose: ['Corporations'],
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
    support: ['Corporations', 'Middle Class'],
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
      return 100 - game.factions['Corporations'].favorability;
    },
  },

  // Intelligentsia policies

  // Army policies
];


module.exports = {
  config,
  policies,
};
