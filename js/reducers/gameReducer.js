// @flow

const {config} = require('../config');
const {
  subtractWithDeficit,
} = require('../selectors/selectors');

const gameReducer = (game, action) => {
  switch (action.type) {
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
        console.log("corps can't pay ppors", corpWealthDeficit2);
      }

      // compute production of goods
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

      // compute gdp
      // compute favorability (gdp change, taxRate, wealth)

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
    case 'INCREMENT_WAGES': {
      const {wageChange} = action;
      game.wages += wageChange;
      return game;
    }
    case 'INCREMENT_PRICE': {
      const {name, priceChange} = action;
      const commodity = getCommodity(game, name);
      commodity.price += priceChange;
      if (commodity.price < 0) {
        commodity.price = 0;
      }

      commodity.demand = commodity.demandFn(game, commodity.price, totalPopulation(game));

      return game;
    }
    case 'INCREMENT_LABOR': {
      const {name, laborChange} = action;
      const commodity = getCommodity(game, name);
      if (laborChange < 0) { // unassigning labor
        const {amount: laborAmount} =
          subtractWithDeficit(commodity.laborAssigned, -1 * laborChange);
        commodity.laborAssigned -= laborAmount;
        game.labor += laborAmount;
      } else { // assigning labor
        const {amount: laborAmount} = subtractWithDeficit(game.labor, laborChange);
        commodity.laborAssigned += laborAmount;
        game.labor -= laborAmount;
      }
      return game;
    }
    case 'UNLOCK_COMMODITY': {
      const {name} = action;
      const commodity = getCommodity(game, name);
      commodity.unlocked = true;
      commodity.demand = commodity.demandFn(game, commodity.price, totalPopulation(game));
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
