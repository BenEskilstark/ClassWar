// @flow

export type Dollar = number;
export type FactionName = String;

export type Faction = {
  name: FactionName,
  wealth: Dollar, // how much money this faction has
  taxRate: Number, // percent of new wealth that goes to gov
  subsidy: Dollar, // gov money that goes to faction
  population: number, // how many people are in this faction
  favorability: number, // how much this faction favors the gov
  props: Object, // faction-specific properties
};

// factions will also have a [property]Delta value for each numeric property
// that they have that will be a dictionary of name-value pairs (Deltas, below)
// which indicate the values that contributed to the change in this property
export type Delta = {
  [name: String]: number,
}

export type Change = {
  path: Array<String>, // path in game state to the change
  operation: ?String,  // if given, operation to do to at
                       // the end of the path, else just set
  value: mixed,
};

export type Policy = {
  name: String,
  description: String,
  support: Array<FactionName>,
  oppose: Array<FactionName>,
  changes: Array<Change>, // changes if the policy passes
};

export type GameState = {
  factions: {[FactionName]: Faction},
  capital: Dollar, // how much money you have
  gdp: number, // total economic output - wages and costs
  foodSurplus: number, // total food produced
  socialMobility: number, // likelihood of a person changing factions

  time: number,
  ticker: Array<string>,
};
