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

    if (game.time > 0 && game.time % normalIn(3, 8) == 0) {
      dispatch({type: 'STOP_TICK'});
      const chosenPolicy = oneOf(policies);
      dispatch({type: 'SET', property: 'policy', value: chosenPolicy});
      dispatch({
        type: 'SET_MODAL',
        modal: <PolicyModal dispatch={dispatch} policy={chosenPolicy} />,
      });
    }

    // if (time == 120) {
    //   dispatch({type: 'APPEND_TICKER', message:
    //     'Industrial process for shirts discovered'
    //   });
    //   dispatch({type: 'APPEND_TICKER', message:
    //     'Simulation paused while you reconfigure the economy. Press Start to resume',
    //   });
    //   dispatch({type: 'UNLOCK_COMMODITY', name: 'Shirts'});
    //   dispatch({type: 'STOP_TICK'});
    // }


  });
};

module.exports = {initEventsSystem};
