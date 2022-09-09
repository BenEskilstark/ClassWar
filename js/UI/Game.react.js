// @flow

const React = require('react');
const {
  Button, InfoCard, Divider,
  Plot, plotReducer,
  Modal,
} = require('bens_ui_components');
const Indicator = require('./Indicator.react');
const {config} = require('../config');
const {
  displayMoney, displayPercent,
} = require('../utils/display');
const {totalPopulation} = require('../selectors/selectors');
const {initGameOverSystem} = require('../systems/gameOverSystem');
const {initEventsSystem} = require('../systems/eventsSystem');
const {useState, useMemo, useEffect, useReducer} = React;

import type {State, Action} from '../types';

type Props = {
  state: State, // Game State
  dispatch: (action: Action) => Action,
};

const PLOT_HEIGHT = 14;
const PLOT_WIDTH = 120;
const PLOT_POINTS = 300;

function Game(props: Props): React.Node {
  const {state, dispatch, store} = props;
  const game = state.game;

  // initializations
  useEffect(() => {
    initGameOverSystem(store);
    initEventsSystem(store);
  }, []);

  const factions = [];
  for (const factionName in game.factions) {
    const faction = game.factions[factionName];
    factions.push(<Faction
      key={'faction_' + factionName}
      {...faction}
    />);
  }

  return (
    <div>
      <div
        style={{
          overflow: 'hidden',
          width: '100%',
          marginBottom: 6,
        }}
      >
        <Info game={game} dispatch={dispatch} />
        <Ticker game={game} />
      </div>
      {factions}
    </div>
  );
}

function Ticker(props): React.Node {
  const {game} = props;
  const messages = [];
  for (let i = 0; i < game.ticker.length; i++) {
    const message = game.ticker[i];
    messages.push(
      <div
        key={"ticker_" + i}
        style={{

        }}
      >
        {message}
      </div>
    );
  }
  return (
    <InfoCard
      style={{
        height: 128,
        padding: 4,
        marginTop: 4,
        marginRight: 4,
        overflow: 'hidden',
        display: 'block',
      }}
    >
      {messages}
    </InfoCard>
  );
}

function Info(props): React.Node {
  const {game, dispatch} = props;

  return (
    <InfoCard
      style={{
        width: 375,
        float: 'left',
        marginTop: 4,
        marginRight: 4,
      }}
    >
      <div>
        Capital: {displayMoney(game.capital)} <Indicator value={game.capital} />
      </div>
      <div>
        GDP: ${game.gdp}
      </div>
      <div>
      <Button
        label={'Step Simulation'}
        disabled={game.policy != null}
        onClick={() => {
          dispatch({type: 'TICK'});
        }}
      />
      </div>
      <Button
        id={game.tickInterval ? '' : 'PLAY'}
        label={game.tickInterval ? 'Pause Simulation' : 'Start Simulation'}
        disabled={game.policy != null}
        onClick={() => {
          // dispatch({type: 'TICK'});
          if (game.tickInterval) {
            dispatch({type: 'STOP_TICK'});
          } else {
            dispatch({type: 'START_TICK'});
          }
        }}
      />
      <Button
        label="View Policy Proposal"
        disabled={game.policy == null}
        onClick={() => {
          dispatch({
            type: 'SET_MODAL',
            modal: <Policy dispatch={dispatch} policy={game.policy} />,
          });
        }}
      />
    </InfoCard>
  );
}

function Policy(props): React.Node {
  const {dispatch, policy} = props;

  const prettifiedChanges = [];
  for (const change of policy.changes) {
    let operation = ' = ';
    if (change.operation == 'ADD') {
      operation = ' + ';
    } else if (change.operation == 'MULTIPLY') {
      operation = ' x ';
    }
    let path = '';
    for (const prop of change.path) {
      if (prop == 'factions') continue;
      path += prop + ' ';
    }
    prettifiedChanges.push(
      <div key={"change_" + path + operation + change.value}>
        {path}{operation}{change.value}
      </div>
    );
  }

  const supporters = [];
  for (const supporter of policy.support) {
    supporters.push(
      <div key={"supporter_"+supporter}>
        {supporter}
      </div>
    );
  }
  const opposition = [];
  for (const opposed of policy.oppose) {
    opposition.push(
      <div key={"opposed_"+opposed}>
        {opposed}
      </div>
    );
  }

  return (
    <Modal
      title={"Proposal: " + policy.name}
      body={
        <div>
          {policy.description}
          <div></div>
          <Divider style={{marginTop: 6, marginBottom: 6}} />
          <b>Changes:</b> {prettifiedChanges}
          <Divider style={{marginTop: 6, marginBottom: 6}} />
          <b>Factions in Favor:</b> {supporters}
          <Divider style={{marginTop: 6, marginBottom: 6}} />
          <b>Factions Opposed:</b> {opposition}
          <Divider style={{marginTop: 6, marginBottom: 6}} />
        </div>
      }
      buttons={[
        {label: 'Hide Proposal', onClick: () => {
          dispatch({type: 'DISMISS_MODAL'});
        }},
        {label: 'Accept', onClick: () => {
          // implement changes
          for (const change of policy.changes) {
            dispatch({type: 'POLICY_CHANGE', change});
          }
          // make opposition unhappy
          dispatch({type: 'CHANGE_FAVORABILITY', factions: policy.oppose, amount: -5});
          // clear policy
          dispatch({type: 'SET', property: 'policy', value: null});
          dispatch({type: 'DISMISS_MODAL'});
        }},
        {label: 'Reject', onClick: () => {
          // make supporters unhappy
          dispatch({type: 'CHANGE_FAVORABILITY', factions: policy.support, amount: -5});
          // clear policy
          dispatch({type: 'SET', property: 'policy', value: null});
          dispatch({type: 'DISMISS_MODAL'});
        }}
      ]}
    />
  );
}

function Faction(properties): React.Node {
  const {
    name, wealth, taxRate, subsidy,
    population, favorability, props,
  } = properties;

  const propList = [];
  for (const propName in props) {
    propList.push(
      <div key={'prop_' + name + '_' + propName}>
        {propName}: {props[propName]} <Indicator value={props[propName]} />
      </div>
    );
  }

  return (
    <InfoCard
      style={{
        width: 375,
      }}
    >
      <div><b>{name}</b></div>
      <div>Wealth: {displayMoney(wealth)} <Indicator value={wealth} minChange={1}/></div>
      <div>Tax Rate: {displayPercent(taxRate)} <Indicator value={taxRate} /></div>
      <div>Subsidy: {displayMoney(subsidy)} <Indicator value={subsidy} minChange={1}/></div>
      <div>Population: {population} <Indicator value={population} /></div>
      <div>Favorability: {displayPercent(favorability / 100)} <Indicator value={favorability} /></div>
      <Divider />
      {propList}
    </InfoCard>
  );
}


module.exports = Game;
