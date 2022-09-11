// @flow

const initFactionDeltas = (faction) => {
  for (const property in faction) {
    if (typeof faction[property] != 'number') continue;
    faction[property + 'Delta'] = {};
  }
  for (const property in faction.props) {
    if (typeof faction.props[property] != 'number') continue;
    faction.props[property + 'Delta'] = {};
  }
  return faction;
}

module.exports = {
  initFactionDeltas,
};
