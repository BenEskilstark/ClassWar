// @flow

const {config} = require('../config');
const {displayMoney, displayPercent} = require('../utils/display');
const {clamp, subtractWithDeficit} = require('bens_utils').math;

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
          if (operation == 'append') {
            obj[p].push(value);
          } else if (operation == 'multiply') {
            obj[p] *= value;
          } else if (operation == 'add') {
            obj[p] += value;
          } else {
            obj[p] = value;
          }
        }
        obj = obj[p];
      }

      return game;
    }
    case 'CHANGE_FAVORABILITY': {
      const {factions, amount} = action;
      for (const factionName of factions) {
        const faction = game.factions[factionName];
        faction.favorability += amount;
        faction.favorability = clamp(faction.favorability, 0, 100);
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
        faction.wealth += subsidyPaid;
        // TODO: compute unfavorability if can't afford subsidy
        if (capitalDeficit != 0) {
          console.log("gov can't pay subsidy", factionName, capitalDeficit);
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
      mids.wealth += midsWagesPaid - midsTaxesCollected;
      corps.wealth = nextCorpWealth;
      // TODO: compute unfavorability/unemployement if corp can't pay
      if (corpWealthDeficit != 0) {
        console.log("corps can't pay mids", corpWealthDeficit);
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
      poors.wealth += poorsWagesPaid - poorsTaxesCollected;
      corps.wealth = nextCorpWealth2;
      // TODO: compute unfavorability/unemployement if corp can't pay
      if (corpWealthDeficit2 != 0) {
        console.log("corps can't pay poors", corpWealthDeficit2);
      }

      // compute production of goods (and gdp?)
      let totalGoods = 0;
      totalGoods += midsActuallyPaid * mids.props.skill * corps.props.production;
      totalGoods += poorsActuallyPaid * corps.props.production;

      // compute purchase of goods (w/ tax)
      const midSpend = mids.wealth * mids.props.consumerism;
      mids.wealth -= midSpend;
      const poorSpend = poors.wealth * poors.props.consumerism;
      poors.wealth -= poorSpend;
      const corpProfit = midSpend + poorSpend;
      const corpTaxesCollected = corpProfit * corps.taxRate;
      game.capital += corpTaxesCollected;
      corps.wealth += corpProfit - corpTaxesCollected;

      // compute favorability (gdp change, taxRate, wealth change, unemployment)
      for (const factionName in game.factions) {
        const faction = game.factions[factionName];
        if (faction.wealth < prevWealth[factionName]) {
          faction.favorability -= 1;
        } else if (faction.wealth - prevWealth[factionName] > prevWealth[factionName] * 0.02) {
          faction.favorability += 1;
        }
        if (faction.props.unemployment > 0.1) {
          faction.favorability -= Math.floor(faction.props.unemployment * 5);
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
