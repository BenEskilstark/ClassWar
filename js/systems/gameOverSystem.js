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
    if (game.gameOver) {
      handleGameLoss(store, dispatch, state, 'loss');
    }

  });
};

const checkWin = (game) => {
  return false;
}

const handleGameLoss = (store, dispatch, state, reason): void => {
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
    {`Unrest is too high and the people have overthrown you! You kept the economy going
      for ${game.time} days`}
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
