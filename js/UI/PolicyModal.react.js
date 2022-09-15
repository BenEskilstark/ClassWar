// @flow
const React = require('react');
const {
  Button, InfoCard, Divider,
  Modal,
} = require('bens_ui_components');
const {config} = require('../config');
const {
  displayMoney, displayPercent,
} = require('../utils/display');
const {useState, useMemo, useEffect, useReducer} = React;

function PolicyModal(props): React.Node {
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
      if (prop == 'props') continue;
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
        {label: 'Minimize', onClick: () => {
          dispatch({type: 'DISMISS_MODAL'});
        }},
        {label: 'Accept', onClick: () => {
          // implement changes
          for (const change of policy.changes) {
            dispatch({type: 'POLICY_CHANGE', change});
          }
          // make supporters happy
          dispatch({type: 'CHANGE_FAVORABILITY', factions: policy.support, amount: 5, pass: true});
          // make opposition unhappy
          dispatch({type: 'CHANGE_FAVORABILITY', factions: policy.oppose, amount: -5, pass: true});
          // clear policy
          dispatch({type: 'SET', property: 'policy', value: null});
          // add to history
          dispatch({
            type: 'POLICY_CHANGE',
            change: {path: ['policiesAccepted'], value: policy, operation: 'APPEND',},
          });
          dispatch({type: 'DISMISS_MODAL'});
        }},
        {label: 'Reject', onClick: () => {
          // make opposition happy
          dispatch({type: 'CHANGE_FAVORABILITY', factions: policy.oppose, amount: 5, pass: false});
          // make supporters unhappy
          dispatch({type: 'CHANGE_FAVORABILITY', factions: policy.support, amount: -5, pass: false})
          // add to history
          dispatch({
            type: 'POLICY_CHANGE',
            change: {path: ['policiesRejected'], value: policy, operation: 'APPEND',},
          });
          // clear policy
          dispatch({type: 'SET', property: 'policy', value: null});
          dispatch({type: 'DISMISS_MODAL'});
        }}
      ]}
    />
  );
}

module.exports = PolicyModal;
