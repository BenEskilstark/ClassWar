// @flow

const {config} = require('../config');
const {displayMoney, displayPercent} = require('../utils/display');
const {initFactionDeltas} = require('../utils/factionUtils');
const {clamp, subtractWithDeficit} = require('bens_utils').math;
const {randomIn, normalIn, oneOf, weightedOneOf} = require('bens_utils').stochastic;

const gameReducer = (game, action) => {
  switch (action.type) {
    case 'SET': {
      const {property, value} = action;
      game[property] = value;
      return game;
    }
    case 'POLICY_CHANGE': {
      const {change} = action;
      const {path, value, operation} = change;
      let obj = game;
      for (let i = 0; i < path.length; i++) {
        const p = path[i];
        if (p == null) break; // don't apply change if it doesn't have a valid path
        if (i == path.length - 1) {
          let delta = 0;
          if (operation == 'append' || operation == 'APPEND') {
            obj[p].push(value);
          } else if (operation == 'multiply' || operation == 'MULTIPLY') {
            delta = obj[p] * value - obj[p];
            obj[p] *= value;
          } else if (operation == 'add' || operation == 'ADD') {
            delta = value;
            obj[p] += value;
          } else {
            delta = value - obj[p]
            obj[p] = value;
          }

          // apply delta too
          if (obj[p + 'Delta']) {
            obj[p + 'Delta']['Policy Change'] = delta;
          }
        }
        obj = obj[p];
      }

      return game;
    }
    case 'CHANGE_FAVORABILITY': {
      const {factions, amount, pass} = action;
      for (const factionName of factions) {
        const faction = game.factions[factionName];
        faction.favorability += amount;
        faction.favorability = clamp(faction.favorability, 0, 100);
        if (pass && amount > 0) {
          faction.favorabilityDelta['Preferred policy passed'] = amount / 100;
        } else if (pass && amount < 0) {
          faction.favorabilityDelta['Opposed policy passed'] = amount / 100;
        } else if (!pass && amount > 0) {
          faction.favorabilityDelta['Opposed policy rejected'] = amount / 100;
        } else if (!pass && amount < 0) {
          faction.favorabilityDelta['Preferred policy passed'] = amount / 100;
        }
      }
      return game;
    }
    case 'START_TICK': {
      if (game != null && game.tickInterval != null) {
        return game;
      }
      game.prevTickTime = new Date().getTime();
      return {
        ...game,
        tickInterval: setInterval(
          // HACK: store is only available via window
          () => store.dispatch({type: 'TICK'}),
          config.msPerTick,
        ),
      };
    }
    case 'STOP_TICK': {
      clearInterval(game.tickInterval);
      game.tickInterval = null;

      return game;
    }
    case 'TICK': {
      game.time += 1;
      game.ticksToNextPolicy--;
      if (game.ticksToNextPolicy == -1) {
        game.ticksToNextPolicy = normalIn(4, 8);
      }

      // clear faction deltas
      for (const factionName in game.factions) {
        game.factions[factionName] = initFactionDeltas(game.factions[factionName]);
      }

      // subsidies (for every faction)
      let prevWealth = {}; // starting wealth for every faction
      for (const factionName in game.factions) {
        const faction = game.factions[factionName];
        prevWealth[factionName] = faction.wealth;
        const {
          result: nextCapital,
          deficit: capitalDeficit,
          amount: subsidyPaid,
        } = subtractWithDeficit(game.capital, faction.subsidy);
        game.capital = nextCapital;
        game.capitalDelta[`${factionName} subsidy`] = -1 * subsidyPaid;
        faction.wealth += subsidyPaid;
        faction.wealthDelta['Government subsidy'] = subsidyPaid;
        // compute unfavorability if can't afford subsidy
        if (capitalDeficit != 0) {
          appendTicker(game,
            `Government is ${displayMoney(capitalDeficit)} short of subsidy for ${factionName}`,
          );
          const favorabilityPenalty = Math.ceil(
            (capitalDeficit / faction.subsidy)
            * config.subsidyDeficitMult);
          appendTicker(game,
            `This is reducing their favorability for the government by ${displayPercent(favorabilityPenalty / 100)}`,
          );
          faction.favorability = clamp(faction.favorability - favorabilityPenalty, 0, 100);
          faction.favorabilityDelta['Unpaid subsidy'] = favorabilityPenalty;
        }
      }

      const corps = game.factions['Corporations'];
      const mids = game.factions['Middle Class'];
      const poors = game.factions['Working Class'];
      // const nerds = game.factions['Intelligentsia'];
      // const army = game.factions['Military'];
      // const lords = game.factions['Landowners'];

      // compute payment to middle class (with tax)
      const employedMids = mids.population * (1 - mids.props.unemployment);
      const midPay = employedMids * mids.props.wage;
      let {
        result: nextCorpWealth,
        deficit: corpWealthDeficit,
        amount: midsWagesPaid,
      } = subtractWithDeficit(corps.wealth, midPay, mids.props.wage);
      const midsActuallyPaid = corpWealthDeficit == 0
        ? employedMids
        : midsWagesPaid / mids.props.wage;

      const midsTaxesCollected = midsWagesPaid * mids.taxRate;
      game.capital += midsTaxesCollected;
      game.capitalDelta['Middle Class taxes'] = midsTaxesCollected;
      mids.wealth += midsWagesPaid - midsTaxesCollected;
      mids.wealthDelta['Wages paid'] = midsWagesPaid;
      mids.wealthDelta['Taxes paid'] = -1 * midsTaxesCollected;
      corps.wealth = nextCorpWealth;
      corps.wealthDelta['Middle Class wages paid'] = -1 * midsWagesPaid;
      // compute unemployement if corp can't pay
      if (corpWealthDeficit != 0) {
        appendTicker(game,
          `Corporations are ${displayMoney(corpWealthDeficit)} short of wages for Middle Class`,
        );
        appendTicker(game,
          `They'll have to fire everyone they can't afford to pay`);
        const unemploymentDelta =
          (corpWealthDeficit / mids.props.wage) / mids.population;
        mids.props.unemployment += unemploymentDelta;
        mids.props.unemploymentDelta['Unpaid workers'] = unemploymentDelta;
      }


      // compute payment to working class (with tax)
      const employedPoors = poors.population * (1 - poors.props.unemployment);
      const poorPay = employedPoors * poors.props.wage;
      let {
        result: nextCorpWealth2,
        deficit: corpWealthDeficit2,
        amount: poorsWagesPaid,
      } = subtractWithDeficit(corps.wealth, poorPay, poors.props.wage);
      const poorsActuallyPaid = corpWealthDeficit2 == 0
        ? employedPoors
        : poorsWagesPaid / poors.props.wage;

      const poorsTaxesCollected = poorsWagesPaid * poors.taxRate;
      game.capital += poorsTaxesCollected;
      game.capitalDelta['Working Class taxes'] = poorsTaxesCollected;
      poors.wealth += poorsWagesPaid - poorsTaxesCollected;
      poors.wealthDelta['Wages paid'] = poorsWagesPaid;
      poors.wealthDelta['Taxes paid'] = -1 * poorsTaxesCollected;
      corps.wealth = nextCorpWealth2;
      corps.wealthDelta['Working Class wages paid'] = -1 * poorsWagesPaid;
      // compute unfavorability/unemployement if corp can't pay
      if (corpWealthDeficit2 != 0) {
        appendTicker(game,
          `Corporations are ${displayMoney(corpWealthDeficit2)} short of wages for Working Class`,
        );
        appendTicker(game,
          `They'll have to fire everyone they can't afford to pay`);
        const unemploymentDelta =
          (corpWealthDeficit2 / poors.props.wage) / poors.population;
        poors.props.unemployment += unemploymentDelta;
        poors.props.unemploymentDelta['Unpaid workers'] = unemploymentDelta;
      }

      // compute production of goods (and gdp?)
      let totalGoods = 0;
      totalGoods += midsActuallyPaid * mids.props.skill * corps.props.production;
      totalGoods += poorsActuallyPaid * corps.props.production;

      // compute purchase of goods (w/ tax)
      const midSpend = mids.wealth * mids.props.consumerism;
      mids.wealth -= midSpend;
      mids.wealthDelta['Goods purchased'] = -1 * midSpend;
      const poorSpend = poors.wealth * poors.props.consumerism;
      poors.wealth -= poorSpend;
      poors.wealthDelta['Goods purchased'] = -1 * poorSpend;
      const corpProfit = midSpend + poorSpend;
      const corpTaxesCollected = corpProfit * corps.taxRate;
      game.capital += corpTaxesCollected;
      game.capitalDelta['Corporate taxes'] = corpTaxesCollected;
      corps.wealth += corpProfit - corpTaxesCollected;
      corps.wealthDelta['Business profits'] = corpProfit;
      corps.wealthDelta['Taxes paid'] = -1 * corpTaxesCollected;

      // compute favorability (gdp change, taxRate, wealth change, unemployment)
      for (const factionName in game.factions) {
        const faction = game.factions[factionName];
        if (faction.wealth < prevWealth[factionName]) {
          faction.favorability -= 1;
          faction.favorabilityDelta['Wealth decreasing'] = -1/100;
        } else if (faction.wealth - prevWealth[factionName] > prevWealth[factionName] * 0.02) {
          faction.favorability += 1;
          faction.favorabilityDelta['Wealth increasing'] = 1/100;
        }
        if (faction.props.unemployment > 0.1) {
          const favorabilityDelta = Math.floor(faction.props.unemployment * 5);
          faction.favorability -= favorabilityDelta;
          faction.favorabilityDelta['High unemployment'] = -1 * favorabilityDelta / 100;
        }
        faction.favorability = clamp(faction.favorability, 0, 100);
      }

      // middle/lower class
      // compute favorability (unemployment, wealth, taxRate)

      // compute social mobility

      // intelligentsia
      // compute production and skill gains

      // army

      // landowners
      // produce food, charge rent

      return game;
    }
    case 'APPEND_TICKER': {
      const {message} = action;
      appendTicker(game, message);
      return game;
    }
    case 'SET_GAME_OVER': {
      game.gameOver = true;
      return game;
    }
  }
  return game;
}

function appendTicker(game, message) {
    game.ticker.push(message);
    if (game.ticker.length > config.maxTickerLength) {
      game.ticker.shift();
    }
}


module.exports = {gameReducer}
