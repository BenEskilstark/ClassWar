// @flow

const React = require('react');
const {
  Button, InfoCard, Divider,
  Plot, plotReducer,
  Modal,
} = require('bens_ui_components');
const PolicyModal = require('./PolicyModal.react');
const Indicator = require('./Indicator.react');
const {config} = require('../config');
const {
  displayMoney, displayPercent,
} = require('../utils/display');
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
            modal: <PolicyModal dispatch={dispatch} policy={game.policy} />,
          });
        }}
      />
    </InfoCard>
  );
}

function Faction(properties): React.Node {
  const {
    name, wealth, taxRate, subsidy,
    population, favorability, props,
  } = properties;

  const propList = [];
  for (const propName in props) {
    let displayedVal = props[propName];
    if (propName == 'unemployment') {
      displayedVal = displayPercent(props[propName]);
    } else if (propName == 'wage' || propName == 'rent') {
      displayedVal = displayMoney(props[propName]);
    }
    propList.push(
      <div key={'prop_' + name + '_' + propName}>
        {propName}: {displayedVal} <Indicator value={props[propName]} />
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
