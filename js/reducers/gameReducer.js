// @flow

const {config} = require('../config');
const {displayMoney, displayPercent} = require('../utils/display');
const {initFactionDeltas} = require('../utils/factionUtils');
const {clamp, subtractWithDeficit} = require('bens_utils').math;
const {randomIn, normalIn, oneOf, weightedOneOf} = require('bens_utils').stochastic;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
];

const gameReducer = (game, action) => {
  switch (action.type) {
    case 'SET': {
      const {property, value} = action;
      game[property] = value;
      return game;
    }
    case 'POLICY_CHANGE': {
      const {change} = action;
      const {path, value, operation} = change;
      let obj = game;
      for (let i = 0; i < path.length; i++) {
        const p = path[i];
        if (p == null) break; // don't apply change if it doesn't have a valid path
        if (i == path.length - 1) {
          let delta = 0;
          if (operation == 'append' || operation == 'APPEND') {
            obj[p].push(value);
          } else if (operation == 'multiply' || operation == 'MULTIPLY') {
            delta = obj[p] * value - obj[p];
            obj[p] *= value;
          } else if (operation == 'add' || operation == 'ADD') {
            delta = value;
            obj[p] += value;
          } else {
            delta = value - obj[p]
            obj[p] = value;
          }
          if (p == 'favorability') {
            delta /= 100;
          }

          // apply delta too
          if (obj[p + 'Delta']) {
            obj[p + 'Delta']['Policy Change'] = delta;
          }
        }
        obj = obj[p];
      }

      return game;
    }
    case 'CHANGE_FAVORABILITY': {
      const {factions, amount, pass} = action;
      for (const factionName of factions) {
        const faction = game.factions[factionName];
        faction.favorability += amount;
        faction.favorability = clamp(faction.favorability, 0, 100);
        if (pass && amount > 0) {
          faction.favorabilityDelta['Preferred policy passed'] = amount / 100;
        } else if (pass && amount < 0) {
          faction.favorabilityDelta['Opposed policy passed'] = amount / 100;
        } else if (!pass && amount > 0) {
          faction.favorabilityDelta['Opposed policy rejected'] = amount / 100;
        } else if (!pass && amount < 0) {
          faction.favorabilityDelta['Preferred policy rejected'] = amount / 100;
        }
      }
      return game;
    }
    case 'START_TICK': {
      if (game != null && game.tickInterval != null) {
        return game;
      }
      game.prevTickTime = new Date().getTime();
      return {
        ...game,
        tickInterval: setInterval(
          // HACK: store is only available via window
          () => store.dispatch({type: 'TICK'}),
          config.msPerTick,
        ),
      };
    }
    case 'STOP_TICK': {
      clearInterval(game.tickInterval);
      game.tickInterval = null;

      return game;
    }
    case 'TICK': {
      game.time += 1;
      game.ticksToNextPolicy--;
      if (game.ticksToNextPolicy == -1) {
        game.ticksToNextPolicy = 0; // randomIn(1, 4);
      }

      let months = game.time > 1 ? 'months' : 'month';
      appendTicker(game,
        '----- ' + MONTHS[(game.time-1 )% 12] + ': ' + game.time + ' ' + months + ' in power -----'
      );

      // clear faction deltas
      for (const factionName in game.factions) {
        game.factions[factionName] = initFactionDeltas(game.factions[factionName]);
      }
      game.capitalDelta = {};


      // subsidies (for every faction)
      let prevWealth = {}; // starting wealth for every faction
      for (const factionName in game.factions) {
        const faction = game.factions[factionName];
        prevWealth[factionName] = faction.wealth;
        const {
          result: nextCapital,
          deficit: capitalDeficit,
          amount: subsidyPaid,
        } = subtractWithDeficit(game.capital, faction.subsidy);
        game.capital = nextCapital;
        game.capitalDelta[`${factionName} subsidy`] = -1 * subsidyPaid;
        faction.wealth += subsidyPaid;
        faction.wealthDelta['Government subsidy'] = subsidyPaid;
        // compute unfavorability if can't afford subsidy
        if (capitalDeficit != 0) {
          const favorabilityPenalty = Math.ceil(
            (capitalDeficit / faction.subsidy)
            * config.subsidyDeficitMult);
          appendTicker(game,
            `Government is ${displayMoney(capitalDeficit)} short of subsidy for ${factionName}`,
          );
          appendTicker(game,
            `This is reducing their favorability for the government by ${displayPercent(favorabilityPenalty / 100)}`,
          );
          faction.favorability = clamp(faction.favorability - favorabilityPenalty, 0, 100);
          faction.favorabilityDelta['Unpaid subsidy'] = -1 * favorabilityPenalty / 100;
        }
      }


      // faction aliases
      const corps = game.factions['Corporations'];
      const mids = game.factions['Middle Class'];
      const poors = game.factions['Working Class'];
      const nerds = game.factions['Intelligentsia'];
      const farmers = game.factions['Farmers'];
      const lords = game.factions['Landowners'];


      // Compute Intelligentsia bonuses
      if ((game.time + 1) % 12 == 0) {
        const skillInc = nerds.props.universities;
        appendTicker(game,
          `Intelligentsia perfect research into making workers more productive, ` +
          `Middle Class and Farmer skill increased by ${skillInc}`,
        );
        mids.props.skill += skillInc;
        mids.props.skillDelta["University Education"] = skillInc;
        farmers.props.skill += skillInc;
        farmers.props.skillDelta["University Education"] = skillInc;
      }
      if ((game.time + 3) % 12 == 0) {
        const favInc = nerds.props.movieStudios;
        appendTicker(game,
          `Intelligentsia produce a movie that the people love. ` +
          `Middle, Working Class and Farmer favorabilities increased by ${favInc}`,
        );
        mids.favorability += favInc;
        mids.favorabilityDelta["Liked movie production"] = favInc / 100;
        poors.favorability += favInc;
        poors.favorabilityDelta["Liked movie production"] = favInc / 100;
        farmers.favorability += favInc;
        farmers.favorabilityDelta["Liked movie production"] = favInc / 100;
      }


      // compute people hired by corporations
      const nextMidsUnemployment = mids.props.unemployment * (1 -  corps.props.hiringRate);
      mids.props.unemploymentDelta['Hired by Corporations'] =
        nextMidsUnemployment - mids.props.unemployment;
      mids.props.unemployment = nextMidsUnemployment;

      const nextPoorsUnemployment = poors.props.unemployment * (1 -  corps.props.hiringRate);
      poors.props.unemploymentDelta['Hired by Corporations'] =
        nextPoorsUnemployment - poors.props.unemployment;
      poors.props.unemployment = nextPoorsUnemployment;

      // compute people hired by landowners
      const nextFarmersUnemployment = farmers.props.unemployment * (1 -  lords.props.hiringRate);
      farmers.props.unemploymentDelta['Hired by Landowners'] =
        nextFarmersUnemployment - farmers.props.unemployment;
      farmers.props.unemployment = nextFarmersUnemployment;


      // compute payment to middle class (with tax)
      const employedMids = mids.population * (1 - mids.props.unemployment);
      const midPay = employedMids * mids.props.wage;
      let {
        result: nextCorpWealth,
        deficit: corpWealthDeficit,
        amount: midsWagesPaid,
      } = subtractWithDeficit(corps.wealth, midPay, mids.props.wage);
      const midsActuallyPaid = corpWealthDeficit == 0
        ? employedMids
        : midsWagesPaid / mids.props.wage;

      const midsTaxesCollected = midsWagesPaid * mids.taxRate;
      game.capital += midsTaxesCollected;
      game.capitalDelta['Middle Class taxes'] = midsTaxesCollected;
      mids.wealth += midsWagesPaid - midsTaxesCollected;
      mids.wealthDelta['Wages paid'] = midsWagesPaid;
      mids.wealthDelta['Taxes paid'] = -1 * midsTaxesCollected;
      corps.wealth = nextCorpWealth;
      corps.wealthDelta['Middle Class wages paid'] = -1 * midsWagesPaid;
      // compute unemployement if corp can't pay
      if (corpWealthDeficit != 0) {
        appendTicker(game,
          `Corporations are ${displayMoney(corpWealthDeficit)} short of wages for Middle Class.`+
          ` They'll have to fire the rest.`
        );
        const unemploymentDelta =
          (corpWealthDeficit / mids.props.wage) / mids.population;
        mids.props.unemployment += unemploymentDelta;
        mids.props.unemploymentDelta['Unpaid workers'] = unemploymentDelta;
      }


      // compute payment to working class (with tax)
      const employedPoors = poors.population * (1 - poors.props.unemployment);
      const poorPay = employedPoors * poors.props.wage;
      let {
        result: nextCorpWealth2,
        deficit: corpWealthDeficit2,
        amount: poorsWagesPaid,
      } = subtractWithDeficit(corps.wealth, poorPay, poors.props.wage);
      const poorsActuallyPaid = corpWealthDeficit2 == 0
        ? employedPoors
        : poorsWagesPaid / poors.props.wage;

      const poorsTaxesCollected = poorsWagesPaid * poors.taxRate;
      game.capital += poorsTaxesCollected;
      game.capitalDelta['Working Class taxes'] = poorsTaxesCollected;
      poors.wealth += poorsWagesPaid - poorsTaxesCollected;
      poors.wealthDelta['Wages paid'] = poorsWagesPaid;
      poors.wealthDelta['Taxes paid'] = -1 * poorsTaxesCollected;
      corps.wealth = nextCorpWealth2;
      corps.wealthDelta['Working Class wages paid'] = -1 * poorsWagesPaid;
      // compute unfavorability/unemployement if corp can't pay
      if (corpWealthDeficit2 != 0) {
        appendTicker(game,
          `Corporations are ${displayMoney(corpWealthDeficit2)} short of wages for Working Class.`+
          ` They'll have to fire the rest.`
        );
        const unemploymentDelta =
          (corpWealthDeficit2 / poors.props.wage) / poors.population;
        poors.props.unemployment += unemploymentDelta;
        poors.props.unemploymentDelta['Unpaid workers'] = unemploymentDelta;
      }

      // compute payment to farmers (with tax)
      const employedFarmers = farmers.population * (1 - farmers.props.unemployment);
      const farmerPay = employedFarmers * farmers.props.wage;
      let {
        result: nextLordWealth,
        deficit: lordWealthDeficit,
        amount: farmersWagesPaid,
      } = subtractWithDeficit(lords.wealth, farmerPay, farmers.props.wage);
      const farmersActuallyPaid = lordWealthDeficit == 0
        ? employedFarmers
        : farmersWagesPaid / farmers.props.wage;
      const farmersTaxesCollected = farmersWagesPaid * farmers.taxRate;
      game.capital += farmersTaxesCollected;
      game.capitalDelta['Farmers\' taxes'] = farmersTaxesCollected;
      farmers.wealth += farmersWagesPaid - farmersTaxesCollected;
      farmers.wealthDelta['Wages paid'] = farmersWagesPaid;
      farmers.wealthDelta['Taxes paid'] = -1 * farmersTaxesCollected;
      lords.wealth = nextLordWealth;
      lords.wealthDelta['Farmers\' wages paid'] = -1 * farmersWagesPaid;
      // compute unfavorability/unemployement if lord can't pay
      if (lordWealthDeficit != 0) {
        appendTicker(game,
          `Landowners are ${displayMoney(lordWealthDeficit)} short of wages for Farmers.`+
          ` They'll have to fire the rest.`
        );
        const unemploymentDelta =
          (lordWealthDeficit / farmers.props.wage) / farmers.population;
        farmers.props.unemployment += unemploymentDelta;
        farmers.props.unemploymentDelta['Unpaid workers'] = unemploymentDelta;
      }


      // compute rent by Middle Class
      const midsRentCost = mids.population * lords.props.middleClassRent;
      let {
        // result: nextMidsWealth,
        deficit: midsRentDeficit,
        amount: midsRentSpent,
      } = subtractWithDeficit(mids.wealth, midsRentCost, lords.props.middleClassRent);
      let midsWhoCantRent = 0;
      if (midsRentDeficit != 0) {
        midsWhoCantRent = Math.round(
          midsRentDeficit / lords.props.middleClassRent
        );
        appendTicker(game,
          `The Middle Class is ${displayMoney(midsRentDeficit)} short to afford rent. ` +
          `${midsWhoCantRent} have been pushed to the Working Class`
        );
        mids.population -= midsWhoCantRent;
        mids.populationDelta['Evicted from Middle Class'] = -1 * midsWhoCantRent;
      }
      mids.wealth -= midsRentSpent;
      mids.wealthDelta["Rent"] = -1 * midsRentSpent;


      // compute rent by Working Class
      const poorsRentCost = poors.population * lords.props.workingClassRent;
      let {
        // result: nextMidsWealth,
        deficit: poorsRentDeficit,
        amount: poorsRentSpent,
      } = subtractWithDeficit(poors.wealth, poorsRentCost, lords.props.workingClassRent);
      if (poorsRentDeficit != 0) {
        let poorsWhoCantRent = 0;
        poorsWhoCantRent = Math.round(
          poorsRentDeficit / lords.props.workingClassRent
        );
        appendTicker(game,
          `The Working Class is ${displayMoney(poorsRentDeficit)} short to afford rent. ` +
          `${poorsWhoCantRent} have been evicted`,
        );
        const unhousedDelta = poorsWhoCantRent / poors.population - poors.props.unhoused;
        poors.props.unhoused = poorsWhoCantRent / poors.population;
        if (unhousedDelta > 0) {
          poors.props.unhousedDelta["Evicted"] = unhousedDelta;
        } else if (unhousedDelta < 0) {
          poors.props.unhousedDelta["Housed"] = unhousedDelta;
        }

      }
      if (midsWhoCantAfford > 0) { // this happens here so that poors population
                                   // doesn't increase before they start renting
        poors.population += midsWhoCantRent;
        poors.populationDelta['Evicted from  Middle Class'] = midsWhoCantRent;
      }
      poors.wealth -= poorsRentSpent;
      poors.wealthDelta["Rent"] = -1 * poorsRentSpent;

      // compute rent by Farmers
      const farmersRentCost = farmers.population * lords.props.workingClassRent;
      let {
        // result: nextMidsWealth,
        deficit: farmersRentDeficit,
        amount: farmersRentSpent,
      } = subtractWithDeficit(farmers.wealth, farmersRentCost, lords.props.workingClassRent);
      if (farmersRentDeficit != 0) {
        let farmersWhoCantRent = 0;
        farmersWhoCantRent = Math.round(
          farmersRentDeficit / lords.props.workingClassRent
        );
        appendTicker(game,
          `The Farmers are ${displayMoney(farmersRentDeficit)} short to afford rent. ` +
          `${farmersWhoCantRent} have been evicted`,
        );
        const unhousedDelta = farmersWhoCantRent / farmers.population - farmers.props.unhoused;
        farmers.props.unhoused = farmersWhoCantRent / farmers.population;
        if (unhousedDelta > 0) {
          farmers.props.unhousedDelta["Evicted"] = unhousedDelta;
        } else if (unhousedDelta < 0) {
          farmers.props.unhousedDelta["Housed"] = unhousedDelta;
        }

      }
      farmers.wealth -= farmersRentSpent;
      farmers.wealthDelta["Rent"] = -1 * farmersRentSpent;


      // compute income to Landowners (+ taxes)
      const lordsProfit = midsRentSpent + poorsRentSpent;
      const lordsTaxesCollected = lordsProfit * lords.taxRate;
      game.capital += lordsTaxesCollected;
      game.capitalDelta['Landowner taxes'] = lordsTaxesCollected;
      lords.wealth += lordsProfit - lordsTaxesCollected;
      lords.wealthDelta['Rental profits'] = lordsProfit;
      lords.wealthDelta['Taxes paid'] = -1 * lordsTaxesCollected;

      // compute production of food
      let totalFoods = 0;
      totalFoods += Math.round(farmersActuallyPaid * farmers.props.skill);
      lords.props.foodInventory += totalFoods;
      lords.props.foodInventoryDelta['Produced by Farmers'] = totalFoods;

      // compute production of goods (and gdp?)
      let totalGoods = Math.round(midsActuallyPaid * mids.props.skill);
      corps.props.inventory += totalGoods;
      corps.props.inventoryDelta['Produced by Middle Class'] = totalGoods;
      totalGoods = 0;
      totalGoods += Math.round(poorsActuallyPaid);
      corps.props.inventory += totalGoods;
      corps.props.inventoryDelta['Produced by Working Class'] = totalGoods;


      // compute purchase of goods by Middle Class
      const desiredMidSpend = mids.props.demand * mids.population * corps.props.price;
      let {
        // result: nextMidsWealth,
        deficit: midsWealthDeficit,
        amount: midPurchasingPower,
      } = subtractWithDeficit(mids.wealth, desiredMidSpend, corps.props.price);
      let {
        result: nextInventory,
        deficit: inventoryDeficit,
        amount: inventoryBought,
      } = subtractWithDeficit(corps.props.inventory, midPurchasingPower / corps.props.price);
      if (inventoryDeficit != 0) { // not enough inventory
        appendTicker(game,
          `Corporations are ${inventoryDeficit} short of inventory for Middle Class demand`,
        );
        const favorabilityDelta = Math.ceil(inventoryDeficit / mids.population * 5);
        // const favorabilityDelta = 2;
        mids.favorability -= favorabilityDelta;
        mids.favorabilityDelta['Not enough goods'] = -1 * favorabilityDelta / 100;
      }
      let midsWhoCantAfford = 0;
      if (midsWealthDeficit != 0 && inventoryDeficit == 0) { // can't afford
        midsWhoCantAfford = Math.round(
          midsWealthDeficit / corps.props.price / mids.props.demand
        );
        appendTicker(game,
          `The Middle Class is ${displayMoney(midsWealthDeficit)} short to afford goods. ` +
          `${midsWhoCantAfford} have been pushed to the Working Class`
        );
        mids.population -= midsWhoCantAfford;
        mids.populationDelta['Priced out of Middle Class'] = -1 * midsWhoCantAfford;
      }
      corps.props.inventory = nextInventory;
      corps.props.inventoryDelta['Purchased by Middle Class'] = -1 * inventoryBought;
      const midSpend = inventoryBought * corps.props.price;
      mids.wealth -= midSpend;
      mids.wealthDelta['Goods purchased'] = -1 * midSpend;


      // compute purchase of goods by Working Class
      const desiredPoorSpend = poors.props.demand * poors.population * corps.props.price;
      let {
        // result: nextPoorsWealth,
        deficit: poorsWealthDeficit,
        amount: poorPurchasingPower,
      } = subtractWithDeficit(poors.wealth, desiredPoorSpend, corps.props.price);
      let {
        result: nextInventory2,
        deficit: inventoryDeficit2,
        amount: inventoryBought2,
      } = subtractWithDeficit(corps.props.inventory, poorPurchasingPower / corps.props.price);
      if (inventoryDeficit2 != 0) { // not enough inventory
        appendTicker(game,
          `Corporations are ${inventoryDeficit2} short of inventory for Working Class demand`,
        );
        const favorabilityDelta = Math.ceil(inventoryDeficit2 / poors.population * 5);
        // const favorabilityDelta = 2;
        poors.favorability -= favorabilityDelta;
        poors.favorabilityDelta['Not enough goods'] = -1 * favorabilityDelta / 100;
      }
      if (poorsWealthDeficit != 0 && inventoryDeficit2 == 0) { // can't afford
        const poorsWhoCantAfford = Math.round(poorsWealthDeficit / corps.props.price);
        appendTicker(game,
          `The Working Class is ${displayMoney(poorsWealthDeficit)} short to afford goods. `
          // + `${poorsWhoCantAfford} starved to death!`
        );
        const favorabilityDelta = 2;
        poors.favorability -= favorabilityDelta;
        poors.favorabilityDelta['Can\'t afford goods'] = -1 * favorabilityDelta / 100;
      }
      if (midsWhoCantAfford > 0) { // this happens here so that poors population
                                   // doesn't increase before they start buying
        poors.population += midsWhoCantAfford;
        poors.populationDelta['Priced out of Middle Class'] = midsWhoCantAfford;
      }
      corps.props.inventory = nextInventory2;
      corps.props.inventoryDelta['Purchased by Working Class'] = -1 * inventoryBought2;
      const poorSpend = inventoryBought2 * corps.props.price;
      poors.wealth -= poorSpend;
      poors.wealthDelta['Goods purchased'] = -1 * poorSpend;


      // compute purchase of goods by Farmers
      const desiredFarmerSpend = farmers.population * corps.props.price;
      let {
        // result: nextFarmersWealth,
        deficit: farmersWealthDeficit,
        amount: farmerPurchasingPower,
      } = subtractWithDeficit(farmers.wealth, desiredFarmerSpend, corps.props.price);
      let {
        result: nextInventory3,
        deficit: inventoryDeficit3,
        amount: inventoryBought3,
      } = subtractWithDeficit(corps.props.inventory, farmerPurchasingPower / corps.props.price);
      if (inventoryDeficit3 != 0) { // not enough inventory
        appendTicker(game,
          `Corporations are ${inventoryDeficit3} short of inventory for Farmer demand`,
        );
        const favorabilityDelta = Math.ceil(inventoryDeficit3 / farmers.population * 5);
        // const favorabilityDelta = 3;
        farmers.favorability -= favorabilityDelta;
        farmers.favorabilityDelta['Not enough goods'] = -1 * favorabilityDelta / 100;
      }
      if (farmersWealthDeficit != 0 && inventoryDeficit3 == 0) { // can't afford
        const farmersWhoCantAfford = Math.round(farmersWealthDeficit / corps.props.price);
        appendTicker(game,
          `Farmers are ${displayMoney(farmersWealthDeficit)} short to afford goods. `
          // + `${farmersWhoCantAfford} starved to death!`
        );
        const favorabilityDelta = 2;
        farmers.favorability -= favorabilityDelta;
        farmers.favorabilityDelta['Can\'t afford goods'] = -1 * favorabilityDelta / 100;
      }
      corps.props.inventory = nextInventory3;
      corps.props.inventoryDelta['Purchased by Farmers'] = -1 * inventoryBought3;
      const farmerSpend = inventoryBought3 * corps.props.price;
      farmers.wealth -= farmerSpend;
      farmers.wealthDelta['Goods purchased'] = -1 * farmerSpend;


      // compute purchase/consumption of food
      for (const factionName in game.factions) {
        const faction = game.factions[factionName];
        let {
          result: nextFood,
          deficit: foodDeficit,
          amount: foodBought,
        } = subtractWithDeficit(
          lords.props.foodInventory, Math.min(faction.population, faction.wealth),
        );
        if (foodDeficit > 0) {
          appendTicker(game,
            `Landowners ran out of food to sell to ${factionName}!`
          );
          let favPenalty = Math.round(foodDeficit / faction.population * 10);
          faction.favorability -= favPenalty;
          faction.favorabilityDelta['Not enough food'] = -1 * favPenalty / 100;
        }
        if (faction.wealth < faction.population) {
          appendTicker(game,
            `${factionName} can't afford food!`
          );
          let favPenalty = Math.round(
            (faction.population - faction.wealth) / faction.population * 10);
          faction.favorability -= favPenalty;
          faction.favorabilityDelta['Can\'t afford food'] = -1 * favPenalty / 100;
        }
        if (factionName != 'Landowners') {
          faction.wealth -= foodBought;
          faction.wealthDelta['Food purchased'] = -1 * foodBought;
          lords.wealth += foodBought;
          lords.wealthDelta['Food purchased by ' + factionName] = foodBought;
        }
        lords.props.foodInventory = nextFood;
        lords.props.foodInventoryDelta[`Consumed by ${factionName}`] = -1 * foodBought;
      }


      // corporate taxes
      const corpProfit = midSpend + poorSpend + farmerSpend;
      const corpTaxesCollected = corpProfit * corps.taxRate;
      game.capital += corpTaxesCollected;
      game.capitalDelta['Corporate taxes'] = corpTaxesCollected;
      corps.wealth += corpProfit - corpTaxesCollected;
      corps.wealthDelta['Business profits'] = corpProfit;
      corps.wealthDelta['Taxes paid'] = -1 * corpTaxesCollected;


      // upkeep costs
      for (const factionName in game.factions) {
        const faction = game.factions[factionName];
        if (faction.props.upkeepCosts > 0) {
          let {
            // result: nextWealth,
            deficit: upkeepDeficit,
            amount: wealthSpent,
          } = subtractWithDeficit(faction.wealth, faction.props.upkeepCosts);
          if (upkeepDeficit != 0) {
            const favPenalty = Math.round(upkeepDeficit / faction.props.upkeepCosts * 10);
            appendTicker(game,
              `${factionName} can't afford upkeep, reducing favorability by ` +
              `${displayPercent(favPenalty / 100)}`,
            );
            faction.favorability -= favPenalty;
            faction.favorabilityDelta['Can\'t afford upkeep'] = -1 * favPenalty / 100;
          }
          faction.wealth -= wealthSpent;
          faction.wealthDelta['Upkeep Costs'] = -1 * wealthSpent;
        }
      }


      // compute favorability (taxRate, wealth change, unemployment)
      for (const factionName in game.factions) {
        const faction = game.factions[factionName];
        if (
          (faction.wealth < prevWealth[factionName] || faction.wealth < 10) &&
          (
            (factionName == 'Farmers' && faction.wealth < 100000)
            || factionName != 'Farmers'
          ) &&
          (
            (factionName == 'Working Class' && faction.wealth < 100000)
            || factionName != 'Working Class'
          ) &&
          (
            (factionName == 'Middle Class' && faction.wealth < 250000)
            || factionName != 'Middle Class'
          )
        ) {
          faction.favorability -= 1;
          faction.favorabilityDelta['Wealth decreasing'] = -1/100;
        } else if (
          faction.wealth - prevWealth[factionName] > 0 &&
          faction.wealth > 100
        ) {
          faction.favorability += 1;
          faction.favorabilityDelta['Wealth increasing'] = 1/100;
        }

        if (faction.props.unemployment > 0.1) {
          const favorabilityDelta = Math.floor(faction.props.unemployment * 5) + 1;
          // const favorabilityDelta = 1;
          faction.favorability -= favorabilityDelta;
          faction.favorabilityDelta['High unemployment'] = -1 * favorabilityDelta / 100;
        }
        if (faction.props.unhoused > 0) {
          const favorabilityDelta = Math.floor(faction.props.unhoused * 10);
          faction.favorability -= favorabilityDelta;
          faction.favorabilityDelta['Homelessness'] = -1 * favorabilityDelta / 100;
        }
        faction.favorability = clamp(faction.favorability, 0, 100);
        faction.favTotal += faction.favorability;
      }


      // middle/lower class
      // compute favorability (unemployment, wealth, taxRate)

      // compute social mobility

      // landowners
      // produce food, charge rent


      // round all props that need to be
      for (const factionName in game.factions) {
        const faction = game.factions[factionName];
        faction.population = Math.floor(faction.population);
      }
      corps.props.inventory = Math.floor(corps.props.inventory);


      return game;
    }
    case 'APPEND_TICKER': {
      const {message} = action;
      appendTicker(game, message);
      return game;
    }
    case 'SET_GAME_OVER': {
      game.gameOver = true;
      return game;
    }
  }
  return game;
}

function appendTicker(game, message) {
  game.ticker.push(message);
  if (game.ticker.length > config.maxTickerLength) {
    // HACK: put in a timeout since the ticker hasn't rendered yet
    setTimeout(() => {
      const tickerElem = document.getElementById('ticker');
      tickerElem.scrollTop = tickerElem.scrollHeight + 1000;
    }, 100);
    // game.ticker.shift();
  }
}


module.exports = {gameReducer}
