// @flow

const React = require('react');
const {Button, Modal} = require('bens_ui_components');
const Game = require('./Game.react');
// const Lobby = require('./Lobby.react');

import type {State, Action} from '../types';

type Props = {
  state: State, // Game State
  dispatch: (action: Action) => Action,
  store: Object,
  modal: Object,
};

function Main(props: Props): React.Node {
  const {state, modal} = props;
  let content = null;
  if (state.screen === 'LOBBY') {
    content = <Lobby dispatch={props.dispatch} store={props.store} />;
  } else if (state.screen === 'GAME') {
    content = <Game dispatch={props.dispatch} state={state} store={props.store} />;
  }

  return (
    <React.Fragment>
      {content}
      {modal}
    </React.Fragment>
  )
}

function Lobby(props): React.Node {
  return (
    <div
      style={{
        width: 300,
        margin: 'auto',
        marginTop: 150,
      }}
    >
      <Button
        label="Play"
        style={{
          width: 300,
          height: 30,
        }}
        onClick={() => {
          props.dispatch({
            type: 'SET_MODAL',
            modal: (<PlayModal dispatch={props.dispatch} />),
          });
        }}
      />
    </div>
  );
}

function PlayModal(props): React.Node {
  const {dispatch} = props;
  return (
    <Modal
      title={"Keys To Power"}
      body={
        " "
      }
      buttons={[
        {
          label: "Play",
          onClick: () => {
            dispatch({type: 'DISMISS_MODAL'});
            dispatch({type: 'START', screen: 'GAME'});
            // dispatch({type: 'START_TICK'});
          },
        }
      ]}
    />
  );
}


module.exports = Main;
