
const React = require('react');
const {useState, useMemo, useEffect, useReducer} = React;


/**
 *
 * props:
 *   value: number, // will watch for changes in this value
 *   minChange: ?number, // changes smaller than this won't be registered
 */

const Indicator = (props) => {
  // track points with watching
  const [indicator, dispatch] = useReducer(
    (state, action) => {
      const {value} = action;
      return {
        prev: state.value,
        value,
      };
    },
    {value: props.value, prev: props.value},
  );
  useEffect(() => {
    dispatch({type: 'SET', value: props.value});
  }, [props.value, dispatch]);

  const minChange = props.minChange ? props.minChange : 0;
  let change = indicator.value - indicator.prev;
  let color = 'black';
  let symbol = '-';
  if (Math.abs(change) > minChange) {
    if (change > 0) {
      color = 'green';
      symbol = '^';
    } else {
      color = 'red';
      symbol = 'V';
    }
  }


  return (
    <div
      style={{
        display: 'inline',
        color,
      }}
    >
      <b>{symbol}</b>
    </div>
  );
}

module.exports = Indicator;
