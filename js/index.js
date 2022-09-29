// @flow

const {createStore} = require('redux');
const Main = require('./ui/Main.react');
const React = require('react');
const ReactDOM = require('react-dom/client');
const {rootReducer} = require('./reducers/rootReducer');

import type {Store} from './types';

const store = createStore(rootReducer);
window.store = store; // useful for debugging and a few hacks


function renderUI(store: Store): React.Node {
  const state = store.getState();
  root.render(
    <Main dispatch={store.dispatch}
      store={store} state={state}
      modal={state.modal}
    />
  );
}

// subscribe the game rendering to the store
const root = ReactDOM.createRoot(document.getElementById('container'));
renderUI(store);
store.subscribe(() => {
  renderUI(store);
});

