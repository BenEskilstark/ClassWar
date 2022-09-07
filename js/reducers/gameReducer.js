// @flow

const {config} = require('../config');
const {
  getCommodity, subtractWithDeficit, totalPopulation,
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

      // corporations:
      // compute payment to middle/lower classes (w/ tax)
      // compute production of goods
      // compute purchase of goods (w/ tax)
      // compute gdp
      // compute favorability (gdp change, taxRate, wealth)

      // middle/lower class
      // compute favorability (unemployment, wealth, taxRate)

      // intelligentsia
      // compute production and skill gains

      // army
      // subsidies (for every faction)

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
