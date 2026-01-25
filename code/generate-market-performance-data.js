// Generate realistic market performance test data for Australian suburbs
// Based on state, suburb type, and realistic Australian property market ranges

const suburbs = [
  "Elizabeth Downs, SA", "Bundaberg East, QLD", "Maribyrnong, VIC", "Wallan, VIC",
  "Geraldton, WA", "Armadale, WA", "Truganina, VIC", "Northam, WA", "Wellard, WA",
  "Bluff Point, WA", "Yanchep, WA", "Thornhill Park, VIC", "Mundingburra, QLD",
  "Avoca, QLD", "Newnham, TAS", "Ashmont, NSW", "Ridgewood, WA", "Mount Austin, NSW",
  "Smithfield Plains, SA", "Kirwan, QLD", "Alkimos, WA", "Karloo, WA", "Murray Bridge, SA",
  "Mount Gambier, SA", "Baldivis, WA", "Rangeway, WA", "Port Augusta West, SA", "Seymour, VIC",
  "Hamilton Valley, NSW", "Dayton, WA", "Utakarra, WA", "Tarneit, VIC", "Kalkie, QLD",
  "Mount Louisa, QLD", "Hillbert, WA", "Maryborough, VIC", "Booval, QLD", "North Shore, VIC",
  "Midvale, WA", "Davoren Park, SA", "Greenfields, WA", "Waterford West, QLD", "South Bunbury, WA",
  "Lara, VIC", "Cranbrook, QLD", "Diggers Rest, VIC", "Spalding, WA", "Australind, WA",
  "Dalyellup, WA", "Withers, WA", "Redbank Plains, QLD", "Thabeban, QLD", "Lavington, NSW",
  "Wangaratta, VIC", "Brookdale, WA", "Elizabeth Park, SA", "Tailem Bend, SA", "Aveley, WA",
  "Bertram, WA", "Laverton, VIC", "Caversham, WA", "Salisbury, SA", "Kyabram, VIC",
  "Burrum Heads, QLD", "Morayfield, QLD", "Mannum, SA", "Urraween, QLD", "Narangba, QLD",
  "Golden Bay, WA", "Bonshaw, VIC", "Chisholm, NSW", "Muswellbrook, NSW", "Leopold, VIC",
  "Wyndham Vale, VIC", "Eglinton, WA", "Mt Duneed, VIC", "Angle Vale, SA", "Jimboomba, QLD",
  "Armstrong, WA", "Clyde North, VIC", "Branyan, QLD", "Tinana, QLD", "Diggers Reach, VIC",
  "Gympie, QLD", "Lochinvar, NSW", "Nikenbah, QLD", "Mickleham, VIC", "Wollert, VIC",
  "Gracemere, QLD", "Kelso, QLD", "Dora Creek, NSW", "Drayton, QLD", "Furnissdale, WA",
  "Two Rocks, WA", "Virginia, SA", "Park Ridge, QLD", "Evanston, SA"
];

// State-based market characteristics (realistic Australian property market data)
const stateProfiles = {
  'VIC': {
    priceChange3m: { min: -2, max: 3 },
    priceChange1y: { min: -5, max: 8 },
    priceChange3y: { min: 5, max: 25 },
    priceChange5y: { min: 15, max: 45 },
    yield: { min: 3.2, max: 5.5 },
    rentChange1y: { min: 2, max: 12 },
    vacancyRate: { min: 1.2, max: 3.5 }
  },
  'NSW': {
    priceChange3m: { min: -1, max: 4 },
    priceChange1y: { min: -3, max: 10 },
    priceChange3y: { min: 8, max: 30 },
    priceChange5y: { min: 20, max: 50 },
    yield: { min: 2.8, max: 5.0 },
    rentChange1y: { min: 3, max: 15 },
    vacancyRate: { min: 1.0, max: 3.0 }
  },
  'QLD': {
    priceChange3m: { min: 0, max: 5 },
    priceChange1y: { min: 2, max: 12 },
    priceChange3y: { min: 10, max: 35 },
    priceChange5y: { min: 25, max: 60 },
    yield: { min: 4.0, max: 6.5 },
    rentChange1y: { min: 4, max: 18 },
    vacancyRate: { min: 0.8, max: 2.8 }
  },
  'WA': {
    priceChange3m: { min: -1, max: 4 },
    priceChange1y: { min: 0, max: 10 },
    priceChange3y: { min: 5, max: 28 },
    priceChange5y: { min: 12, max: 45 },
    yield: { min: 4.2, max: 6.8 },
    rentChange1y: { min: 3, max: 16 },
    vacancyRate: { min: 0.9, max: 3.2 }
  },
  'SA': {
    priceChange3m: { min: -1, max: 3 },
    priceChange1y: { min: -2, max: 8 },
    priceChange3y: { min: 8, max: 30 },
    priceChange5y: { min: 18, max: 50 },
    yield: { min: 3.8, max: 6.0 },
    rentChange1y: { min: 2, max: 12 },
    vacancyRate: { min: 1.1, max: 3.4 }
  },
  'TAS': {
    priceChange3m: { min: -2, max: 2 },
    priceChange1y: { min: -4, max: 6 },
    priceChange3y: { min: 12, max: 35 },
    priceChange5y: { min: 25, max: 55 },
    yield: { min: 4.5, max: 6.5 },
    rentChange1y: { min: 3, max: 14 },
    vacancyRate: { min: 0.7, max: 2.5 }
  }
};

// Helper function to generate random number in range
function randomInRange(min, max) {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

// Helper function to determine if suburb is metropolitan (affects rental population)
function isMetro(suburb) {
  const metroKeywords = ['Melbourne', 'Sydney', 'Brisbane', 'Perth', 'Adelaide', 'Hobart', 
    'Maribyrnong', 'Tarneit', 'Truganina', 'Wyndham Vale', 'Clyde North', 'Mickleham',
    'Wollert', 'Lara', 'Diggers Rest', 'Wallan', 'Laverton', 'Aveley', 'Bertram',
    'Baldivis', 'Wellard', 'Alkimos', 'Ridgewood', 'Golden Bay', 'Australind',
    'Redbank Plains', 'Morayfield', 'Narangba', 'Waterford West', 'Kirwan',
    'Mundingburra', 'Booval', 'Cranbrook', 'Park Ridge', 'Smithfield Plains',
    'Elizabeth Downs', 'Elizabeth Park', 'Davoren Park', 'Virginia', 'Evanston',
    'Angle Vale', 'Salisbury', 'Murray Bridge', 'Mount Gambier', 'Port Augusta West'];
  
  return metroKeywords.some(keyword => suburb.toLowerCase().includes(keyword.toLowerCase()));
}

// Generate data for each suburb
const marketData = suburbs.map(suburb => {
  const [suburbName, state] = suburb.split(', ').map(s => s.trim());
  const profile = stateProfiles[state] || stateProfiles['VIC']; // Default to VIC if state not found
  
  // Generate realistic values
  const priceChange3m = randomInRange(profile.priceChange3m.min, profile.priceChange3m.max);
  const priceChange1y = randomInRange(profile.priceChange1y.min, profile.priceChange1y.max);
  const priceChange3y = randomInRange(profile.priceChange3y.min, profile.priceChange3y.max);
  const priceChange5y = randomInRange(profile.priceChange5y.min, profile.priceChange5y.max);
  const yieldValue = randomInRange(profile.yield.min, profile.yield.max);
  const rentChange1y = randomInRange(profile.rentChange1y.min, profile.rentChange1y.max);
  const vacancyRate = randomInRange(profile.vacancyRate.min, profile.vacancyRate.max);
  
  // Rental population as percentage (metro = typically higher %)
  const rentalPopulation = isMetro(suburb) 
    ? randomInRange(25, 45)
    : randomInRange(18, 35);
  
  return {
    suburb: suburbName,
    state: state,
    'Median price change - 3 months': `${priceChange3m > 0 ? '+' : ''}${priceChange3m}%`,
    'Median price change - 1 year': `${priceChange1y > 0 ? '+' : ''}${priceChange1y}%`,
    'Median price change - 3 year': `${priceChange3y > 0 ? '+' : ''}${priceChange3y}%`,
    'Median price change - 5 year': `${priceChange5y > 0 ? '+' : ''}${priceChange5y}%`,
    'Median yield': `${yieldValue}%`,
    'Median rent change - 1 year': `${rentChange1y > 0 ? '+' : ''}${rentChange1y}%`,
    'Rental Population': `${rentalPopulation}%`,
    'Vacancy Rate': `${vacancyRate}%`
  };
});

// Output as CSV format (easy to paste into spreadsheet)
const csvHeader = 'Suburb,State,Median price change - 3 months,Median price change - 1 year,Median price change - 3 year,Median price change - 5 year,Median yield,Median rent change - 1 year,Rental Population,Vacancy Rate';
const csvRows = marketData.map(row => 
  `${row.suburb},${row.state},"${row['Median price change - 3 months']}","${row['Median price change - 1 year']}","${row['Median price change - 3 year']}","${row['Median price change - 5 year']}","${row['Median yield']}","${row['Median rent change - 1 year']}","${row['Rental Population']}","${row['Vacancy Rate']}"`
);

console.log(csvHeader);
csvRows.forEach(row => console.log(row));

