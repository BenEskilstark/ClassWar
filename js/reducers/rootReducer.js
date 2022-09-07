// @flow

const {gameReducer} = require('./gameReducer');
const {modalReducer} = require('./modalReducer');
const {config} = require('../config');
const {deepCopy} = require('bens_utils').helpers;
const {totalPopulation} = require('../selectors/selectors');

import type {State, Action} from '../types';

const rootReducer = (state: State, action: Action): State => {
  if (state === undefined) return initState();

  switch (action.type) {
    case 'START': {
      const {screen} = action;
      const game = initGameState();
      return {
        ...state,
        screen,
        game,
      };
    }
    case 'SET_SCREEN': {
      const {screen} = action;
      const nextState = {...state, screen};
      if (screen == 'LOBBY') {
        nextState.game = null;
      }
      return nextState;
    }
    case 'SET_MODAL':
    case 'DISMISS_MODAL':
      return modalReducer(state, action);
    case 'INCREMENT_PRICE':
    case 'INCREMENT_LABOR':
    case 'INCREMENT_WAGES':
    case 'APPEND_TICKER':
    case 'UNLOCK_COMMODITY':
    case 'SET_GAME_OVER':
    case 'START_TICK':
    case 'STOP_TICK':
    case 'TICK': {
      if (!state.game) return state;
      return {
        ...state,
        game: gameReducer(state.game, action),
      };
    }
  }
  return state;
};


//////////////////////////////////////
// Initializations
const initState = () => {
  return {
    screen: 'LOBBY',
    game: null,
  };
}

const initGameState = () => {
  const game = {
    factions: {},
    capital: config.capital,
    gdp: 0,

    ticker: ['Welcome to The Command Economy'],
    time: 0,
  };

  for (const factionName in config.factions) {
    game.factions[factionName] = deepCopy(config.factions[factionName]);
  }

  return game;
}

module.exports = {rootReducer};
