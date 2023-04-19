// @flow

const React = require('react');
const {
  Button, InfoCard, Divider,
  Plot, plotReducer,
  Modal, Indicator,
} = require('bens_ui_components');
const PolicyModal = require('./PolicyModal.react');
const {config} = require('../config');
const {
  displayMoney, displayPercent,
} = require('../utils/display');
const {initGameOverSystem} = require('../systems/gameOverSystem');
const {initKeyboardControlsSystem} = require('../systems/keyboardControlsSystem');
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
    initKeyboardControlsSystem(store);
    initEventsSystem(store);
    registerHotkeys(dispatch);
  }, []);

  const factions = useMemo(() => {
    const factions = [];
    for (const factionName in game.factions) {
      const faction = game.factions[factionName];
      factions.push(<Faction
        key={'faction_' + factionName}
        {...faction}
      />);
    }
    return factions;
  }, [game.time, game.policy != null]);

  const govInfo = useMemo(() => {
    return (
      <Info game={game} dispatch={dispatch} state={state} />
    );
  }, [game.time, game.policy != null, state.modal]);

  return (
    <div>
      <div
        style={{
          // overflow: 'hidden', // messes up hovercards to have this
          width: '100%',
          marginBottom: 6,
        }}
      >
        {govInfo}
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
    <div
      id="ticker"
      style={{
        border: '1px solid black',
        backgroundColor: 'white',
        verticalAlign: 'top',
        marginBottom: 4,
        marginLeft: 4,
        padding: 4,

        height: 128,
        padding: 4,
        marginTop: 4,
        marginRight: 4,
        overflow: 'scroll',
        display: 'block',
      }}
    >
      {messages}
    </div>
  );
}

function Info(props): React.Node {
  const {state, game, dispatch} = props;

  return (
    <InfoCard
      style={{
        width: 375,
        height: 128,
        float: 'left',
        marginTop: 0,
        marginRight: 4,
      }}
    >
      <Value deltas={game.capitalDelta} displayFn={displayMoney}>
        Capital: {displayMoney(game.capital)} <Indicator value={game.capital} />
      </Value>
      <Button
        id="PLAY"
        label={'End Month'}
        disabled={game.policy != null || game.tickInterval}
        onClick={() => {
          dispatch({type: 'TICK'});
        }}
      />
      <div>
        <Button
          label={`${state.modal ? 'Hide' : 'View'} Policy Proposal`}
          disabled={game.policy == null}
          onClick={() => {
            if (state.modal) {
              dispatch({type: 'DISMISS_MODAL'});
            } else {
              dispatch({
                type: 'SET_MODAL',
                modal: <PolicyModal dispatch={dispatch} policy={game.policy} game={game} />,
              });
            }
          }}
        />
      </div>
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
    if (propName.slice(-5) == 'Delta') continue;
    let displayedVal = props[propName];
    let displayFn = (v) => v;
    if (
      propName == 'unemployment' || propName == 'hiringRate' || propName == 'unhoused'
    ) {
      displayedVal = displayPercent(props[propName]);
      displayFn = displayPercent;
    } else if (
      propName == 'wage' || propName == 'rent' || propName == 'price' ||
      propName == 'upkeepCosts' || propName == 'workingClassRent' ||
      propName == 'middleClassRent'
    ) {
      displayedVal = displayMoney(props[propName]);
      displayFn = displayMoney;
    }
    propList.push(
      <Value
        key={'prop_' + name + '_' + propName}
        deltas={props[propName + 'Delta']}
        displayFn={displayFn}
      >
        {propName}: {displayedVal} <Indicator value={props[propName]} />
      </Value>
    );
  }
  let height = 187;
  // if (name == 'Corporations') {
  //   height = 168.5;
  // }

  const [favOpacity, setFavOpacity] = useState(4); // divided by 10
  const [dir, setDir] = useState(1);
  useEffect(() => {
    let interval = null;
    if (favorability <= 5) {
      interval = setInterval(() => {
        const nextOpacity = (favOpacity + dir);
        if (nextOpacity == 5 || nextOpacity == 0) {
          setDir(dir * -1);
        }
        setFavOpacity(nextOpacity);
      }, 50);
    } else if (favorability > 5) {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [favorability <= 5, favOpacity, dir]);


  return (
    <div
      style={{
        width: '33.3%',
        display: 'inline-block',
        marginBottom: 8,
      }}
    >
    <InfoCard
      style={{
        width: '-webkit-fill-available',
        padding: '2px',
        backgroundColor: favorability <= 5 ? `rgba(255,192,203,${favOpacity / 10})` : 'white',
        height,
      }}
    >
      <div><b>{name}</b></div>
      <Value deltas={properties.wealthDelta} displayFn={displayMoney}>
        Wealth: {displayMoney(wealth)} <Indicator value={wealth} minChange={1}/>
      </Value>
      <Value deltas={properties.taxRateDelta} displayFn={displayPercent}>
        Tax Rate: {displayPercent(taxRate)} <Indicator value={taxRate} />
      </Value>
      <Value deltas={properties.subsidyDelta} displayFn={displayMoney}>
        Subsidy: {displayMoney(subsidy)} <Indicator value={subsidy} minChange={1}/>
      </Value>
      <Value deltas={properties.populationDelta}>
        Population: {population} <Indicator value={population} />
      </Value>
      <Value deltas={properties.favorabilityDelta} displayFn={displayPercent}>
        Favorability: {displayPercent(favorability / 100)} <Indicator value={favorability} />
      </Value>
      <Divider />
      {propList}
    </InfoCard>
    </div>
  );
}

function Value(props): React.Node {
  const {deltas, displayFn} = props;
  const displayDeltas = [];
  let total = 0;
  for (const name in deltas) {
    const val = deltas[name];
    let color = 'black';
    if (val < 0) color = 'red';
    if (val > 0) color = 'green';
    total += val;
    displayDeltas.push(
      <div key={"delta_" + name}>
        {name}: <span style={{color}}>{displayFn ? displayFn(val) : val}</span>
      </div>
    );
  }

  let totalColor = 'black';
  if (total < 0) totalColor = 'red';
  if (total > 0) totalColor = 'green';

  let hoverCard = null;
  if (displayDeltas.length > 0) {
    hoverCard = (
      <div
        className="hidden"
        style={{
          position: 'absolute',
          top: 18,
          left: 36,
          zIndex: 5,
          maxHeight: 500,
          color: 'black',
          whiteSpace: 'nowrap',
        }}
      >
        <InfoCard >
          {displayDeltas}
          <Divider />
          <b>
            Total:
            <span style={{color:totalColor}}>
              {total > 0 ? '+' : ''}{displayFn ? displayFn(total) : total}
            </span>
          </b>
        </InfoCard>
      </div>
    )
  }

  return (
    <div>
      <span
        className="displayChildOnHover"
        style={{
          position: 'relative',
        }}
      >
        {props.children}
        {hoverCard}
      </span>
    </div>
  );
}


function registerHotkeys(dispatch) {
  dispatch({
    type: 'SET_HOTKEY', press: 'onKeyDown',
    key: 'space',
    fn: (s) => {
      const game = s.getState().game;
      if (game.policy == null) {
        s.dispatch({type: 'TICK'});
      }
    }
  });
}

module.exports = Game;
