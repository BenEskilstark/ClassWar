// @flow

const React = require('react');
const {
  oneOf, weightedOneOf, randomIn, normalIn,
} = require('bens_utils').stochastic;
const PolicyModal = require('../UI/PolicyModal.react');
const {policies, config} = require('../config');

const initEventsSystem = (store) => {
  const {dispatch} = store;
  let time = -1;
  store.subscribe(() => {
    const state = store.getState();
    const {game} = state;
    if (!game) return;
    if (game.time == time) return;
    if (game.time == 0) return;
    time = game.time;

    if (game.ticksToNextPolicy == 0) {
      dispatch({type: 'STOP_TICK'});
      const policyWeights = policies.map(p => p.getWeight(game));
      const chosenPolicy = weightedOneOf(policies, policyWeights);
      dispatch({type: 'SET', property: 'policy', value: chosenPolicy});
      dispatch({
        type: 'SET_MODAL',
        modal: <PolicyModal
          dispatch={dispatch} policy={store.getState().game.policy}
          game={game}
        />,
      });
    }

  });
};

module.exports = {initEventsSystem};
