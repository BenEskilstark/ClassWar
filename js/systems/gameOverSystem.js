// @flow

const React = require('react');
const {Button, Divider, Modal} = require('bens_ui_components');
const {useState} = React;

/**
 * Checks the state every tick for game-over conditions, then orchestrates
 * transition out of the level on win or loss
 *
 * Can short-circuit the game-over checks by setting the gameOver flag on the
 * game directly or with the SET_GAME_OVER action
 */
const initGameOverSystem = (store) => {
  const {dispatch} = store;
  let time = -1;
  store.subscribe(() => {
    const state = store.getState();
    const {game} = state;
    if (!game) return;
    if (game.time == time) return;
    if (game.time == 0) return;
    time = game.time;

    let {gameOver} = game;

    // handle win conditions
    const gameWon = checkWin(game);
    if (gameWon) {
      handleGameWon(store, dispatch, state, 'win');
    }

    // loss conditions
    let numZeroFav = 0;
    const dislikes = [];
    for (const factionName in game.factions) {
      const faction = game.factions[factionName];
      if (faction.favorability == 0) {
        numZeroFav++;
        dislikes.push(factionName);
      }
    }
    if (game.gameOver || numZeroFav > 1) {
      handleGameLoss(store, dispatch, state, dislikes);
    }

  });
};

const checkWin = (game) => {
  return false;
}

const handleGameLoss = (store, dispatch, state, dislikes): void => {
  const {game} = state;
  dispatch({type: 'STOP_TICK'});

  const returnButton = {
    label: 'Back to Main Menu',
    onClick: () => {
      dispatch({type: 'DISMISS_MODAL'});
      dispatch({type: 'SET_SCREEN', screen: 'LOBBY'});
    }
  };
  const resetButton = {
    label: 'Restart',
    onClick: () => {
      dispatch({type: 'DISMISS_MODAL'});
      dispatch({type: 'SET_SCREEN', screen: 'LOBBY'});
      dispatch({type: 'START', screen: 'GAME'});
    },
  };
  const buttons = [returnButton, resetButton];

  const favAvgs = {};
  let largestAvg = 0;
  let largestFaction = 'Government';
  for (const factionName in game.factions) {
    const faction = game.factions[factionName];
    favAvgs[factionName] = faction.favTotal / game.time;
    if (favAvgs[factionName] > largestAvg) {
      largestAvg = favAvgs[factionName];
      largestFaction = factionName;
    }
  }
  console.log(favAvgs);
  const body = (
    <div>
    {`You are too unpopular and the ${dislikes[0]} and the ${dislikes[1]} teamed up to
    overthrow you. You survived in power for ${game.time} months`}
    <Divider />
    {`The faction most favorable towards you was ${largestFaction} with
    ${largestAvg.toFixed(2)} average favorability`}
    </div>
  );


  dispatch({type: 'SET_MODAL',
    modal: (<Modal
      title={'Game Over'}
      body={body}
      buttons={buttons}
    />),
  });
};

const handleGameWon = (store, dispatch, state, reason): void => {
  const {game} = state;
  dispatch({type: 'STOP_TICK'});

  const returnButton = {
    label: 'Back to Main Menu',
    onClick: () => {
      dispatch({type: 'DISMISS_MODAL'});
      dispatch({type: 'SET_SCREEN', screen: 'LOBBY'});
    }
  };
  const resetButton = {
    label: 'Restart',
    onClick: () => {
      dispatch({type: 'DISMISS_MODAL'});
      dispatch({type: 'SET_SCREEN', screen: 'LOBBY'});
      dispatch({type: 'START', screen: 'GAME'});
    },
  };
  const buttons = [returnButton, resetButton];

  const body = (
    <div>
    {`You reached a post-scarcity society that will endure far into the future! It took you
      ${game.time} days`}
    </div>
  );

  dispatch({type: 'SET_MODAL',
    modal: (<Modal
      title={'Game Won!'}
      body={body}
      buttons={buttons}
    />),
  });
};

module.exports = {initGameOverSystem};
