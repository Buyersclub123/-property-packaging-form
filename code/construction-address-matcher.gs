/**
 * Construction Address Matcher — POC
 * 
 * Pulls Construction pipeline opportunities (Registered Address field)
 * and Property Records (address fields), then attempts to match them.
 * 
 * Setup:
 * 1. Create a new Apps Script project at script.google.com
 * 2. Paste this code
 * 3. Go to Project Settings > Script Properties
 * 4. Add property: GHL_PIT_TOKEN = pit-1fc3120c-80a7-42d5-b8f1-b391dbf2a793
 * 5. Run main() — it will create a spreadsheet and log the URL
 */

// === CONFIG ===
var LOCATION_ID = 'UJWYn4mrgGodB7KZUcHt';
var CONSTRUCTION_PIPELINE_ID = 'XMKCHlqekS7IU87PNLKB';
var CUSTOM_OBJECT_ID = '692d04e3662599ed0c29edfa';

// Fixed spreadsheet ID — set after first run, or leave blank to create new
var SPREADSHEET_ID = '1Zy9BX93z2EQYID-_of5KJjcKyiO1W6HB8Q1tRJMmA74';

// Opportunity field ID for "Registered address"
var REGISTERED_ADDRESS_FIELD_ID = 'PlNx1851lV5PSAotT4FT';

// Property record field keys (used in record properties)
var PR_FIELDS = {
  propertyAddress: 'property_address',
  unitNumber: 'unit__lot',
  streetNumber: 'street_number',
  streetName: 'street_name',
  suburb: 'suburb_name',
  state: 'state',
  postCode: 'post_code',
  projectAddress: 'project_address',
  projectName: 'project_name',
  lotNumber: 'lot_number'
};

// === DEBUG — run this first to check API connectivity ===
function debugApiCalls() {
  var token = PropertiesService.getScriptProperties().getProperty('GHL_PIT_TOKEN');
  if (!token) {
    throw new Error('GHL_PIT_TOKEN not set in Script Properties');
  }
  Logger.log('Token starts with: ' + token.substring(0, 20) + '...');

  // Test 1: Fetch opportunities (GET with query params)
  Logger.log('--- Testing Opportunities API ---');
  var oppUrl = 'https://services.leadconnectorhq.com/opportunities/search'
    + '?location_id=' + LOCATION_ID
    + '&pipeline_id=' + CONSTRUCTION_PIPELINE_ID
    + '&limit=5';
  var oppResponse = UrlFetchApp.fetch(oppUrl, {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Version': '2021-07-28',
      'Accept': 'application/json'
    },
    muteHttpExceptions: true
  });
  Logger.log('Opportunities HTTP status: ' + oppResponse.getResponseCode());
  Logger.log('Opportunities response (first 2000 chars): ' + oppResponse.getContentText().substring(0, 2000));

  // Test 2: Fetch property records (POST to /records/search)
  Logger.log('--- Testing Property Records API ---');
  var prUrl = 'https://services.leadconnectorhq.com/objects/' + CUSTOM_OBJECT_ID + '/records/search';
  var prResponse = UrlFetchApp.fetch(prUrl, {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Version': '2021-07-28',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    payload: JSON.stringify({
      locationId: LOCATION_ID,
      page: 1,
      pageLimit: 5
    }),
    muteHttpExceptions: true
  });
  Logger.log('Property Records HTTP status: ' + prResponse.getResponseCode());
  Logger.log('Property Records response (first 2000 chars): ' + prResponse.getContentText().substring(0, 2000));
}

// === MAIN ===
function main() {
  var token = PropertiesService.getScriptProperties().getProperty('GHL_PIT_TOKEN');
  if (!token) {
    throw new Error('GHL_PIT_TOKEN not set in Script Properties');
  }

  Logger.log('Fetching pipeline stages...');
  var stageNames = fetchPipelineStages(token);
  Logger.log('Loaded ' + Object.keys(stageNames).length + ' stage names');

  Logger.log('Fetching Construction opportunities...');
  var allOpportunities = fetchConstructionOpportunities(token, stageNames);
  Logger.log('Found ' + allOpportunities.length + ' total opportunities');

  // Log stage breakdown before filtering
  var stageCounts = {};
  allOpportunities.forEach(function(opp) {
    var s = opp.stageName || '(unknown)';
    stageCounts[s] = (stageCounts[s] || 0) + 1;
  });
  Logger.log('Stage breakdown:');
  Object.keys(stageCounts).sort().forEach(function(s) {
    Logger.log('  ' + s + ': ' + stageCounts[s]);
  });

  // Filter out stages you want to exclude (add stage names here)
  var EXCLUDE_STAGES = [
    'HANDOVER',
  ];
  var opportunities = allOpportunities;
  if (EXCLUDE_STAGES.length > 0) {
    opportunities = allOpportunities.filter(function(opp) {
      return EXCLUDE_STAGES.indexOf(opp.stageName) === -1;
    });
    Logger.log('After excluding stages: ' + opportunities.length + ' opportunities');
  }

  Logger.log('Fetching Property Records...');
  var propertyRecords = fetchPropertyRecords(token);
  Logger.log('Found ' + propertyRecords.length + ' property records');

  Logger.log('Running matching...');
  var results = matchAddresses(opportunities, propertyRecords);

  Logger.log('Writing results to spreadsheet...');
  var ss;
  if (SPREADSHEET_ID) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  } else {
    ss = SpreadsheetApp.create('Construction Address Matching');
    Logger.log('Created new spreadsheet. Set SPREADSHEET_ID to: ' + ss.getId());
  }
  writeResults(ss, results, opportunities, propertyRecords);

  Logger.log('Done! Spreadsheet URL: ' + ss.getUrl());
}

// === GHL API: Fetch Construction Opportunities ===
// === GHL API: Fetch Pipeline Stage Names ===
function fetchPipelineStages(token) {
  var url = 'https://services.leadconnectorhq.com/opportunities/pipelines?locationId=' + LOCATION_ID;
  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Version': '2021-07-28',
      'Accept': 'application/json'
    },
    muteHttpExceptions: true
  });

  var stageNames = {};
  var data = JSON.parse(response.getContentText());
  if (data.pipelines) {
    for (var i = 0; i < data.pipelines.length; i++) {
      var pipeline = data.pipelines[i];
      if (pipeline.stages) {
        for (var j = 0; j < pipeline.stages.length; j++) {
          var stage = pipeline.stages[j];
          stageNames[stage.id] = stage.name;
        }
      }
    }
  }
  return stageNames;
}

// === GHL API: Fetch Construction Opportunities ===
function fetchConstructionOpportunities(token, stageNames) {
  var allOpps = [];
  var startAfter = '';
  var startAfterId = '';
  var hasMore = true;

  while (hasMore) {
    var url = 'https://services.leadconnectorhq.com/opportunities/search'
      + '?location_id=' + LOCATION_ID
      + '&pipeline_id=' + CONSTRUCTION_PIPELINE_ID
      + '&limit=100';
    if (startAfter && startAfterId) {
      url += '&startAfter=' + encodeURIComponent(startAfter);
      url += '&startAfterId=' + encodeURIComponent(startAfterId);
    }

    var options = {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      },
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var data = JSON.parse(response.getContentText());

    if (responseCode !== 200) {
      Logger.log('Opportunities API error: HTTP ' + responseCode + ' — ' + response.getContentText().substring(0, 500));
      break;
    }

    if (data.opportunities && data.opportunities.length > 0) {
      allOpps = allOpps.concat(data.opportunities);
      var last = data.opportunities[data.opportunities.length - 1];
      startAfter = last.lastStageChangeAt || last.createdAt || '';
      startAfterId = last.id;
    }

    // Use cursor from meta for next page
    if (data.meta && data.meta.startAfter && data.meta.startAfterId) {
      startAfter = data.meta.startAfter;
      startAfterId = data.meta.startAfterId;
    } else {
      hasMore = false;
    }
    if (data.opportunities && data.opportunities.length < 100) {
      hasMore = false;
    }

    Utilities.sleep(200); // rate limit respect
  }

  // Extract registered address from custom fields
  return allOpps.map(function(opp) {
    var registeredAddress = '';
    if (opp.customFields && opp.customFields.length > 0) {
      for (var i = 0; i < opp.customFields.length; i++) {
        if (opp.customFields[i].id === REGISTERED_ADDRESS_FIELD_ID) {
          registeredAddress = opp.customFields[i].fieldValueString || '';
          break;
        }
      }
    }
    return {
      id: opp.id,
      name: opp.name || opp.contactName || '',
      pipelineStageId: opp.pipelineStageId || '',
      stageName: stageNames[opp.pipelineStageId] || opp.pipelineStageId || '',
      registeredAddress: registeredAddress.trim()
    };
  });
}

// === GHL API: Fetch Property Records ===
function fetchPropertyRecords(token) {
  var allRecords = [];
  var page = 1;
  var pageLimit = 100;
  var hasMore = true;

  while (hasMore) {
    var url = 'https://services.leadconnectorhq.com/objects/' + CUSTOM_OBJECT_ID + '/records/search';

    var options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      payload: JSON.stringify({
        locationId: LOCATION_ID,
        page: page,
        pageLimit: pageLimit
      }),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var data = JSON.parse(response.getContentText());

    if (responseCode !== 200 && responseCode !== 201) {
      Logger.log('Property Records API error: HTTP ' + responseCode + ' — ' + response.getContentText().substring(0, 500));
      break;
    }

    if (data.records && data.records.length > 0) {
      allRecords = allRecords.concat(data.records);
      page++;
      if (data.records.length < pageLimit) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }

    // Safety limit
    if (page > 20) {
      Logger.log('Safety limit reached at page 20');
      hasMore = false;
    }

    Utilities.sleep(200);
  }

  // Extract address fields from properties
  return allRecords.map(function(rec) {
    var props = rec.properties || {};
    return {
      id: rec.id,
      propertyAddress: (props[PR_FIELDS.propertyAddress] || '').trim(),
      unitNumber: (props[PR_FIELDS.unitNumber] || '').trim(),
      streetNumber: (props[PR_FIELDS.streetNumber] || '').trim(),
      streetName: (props[PR_FIELDS.streetName] || '').trim(),
      suburb: (props[PR_FIELDS.suburb] || '').trim(),
      state: (props[PR_FIELDS.state] || '').trim(),
      postCode: (props[PR_FIELDS.postCode] || '').trim(),
      projectAddress: (props[PR_FIELDS.projectAddress] || '').trim(),
      projectName: (props[PR_FIELDS.projectName] || '').trim(),
      lotNumber: (props[PR_FIELDS.lotNumber] || '').trim(),
      // Build a composite for display
      compositeAddress: buildCompositeAddress(props)
    };
  });
}

function buildCompositeAddress(props) {
  var parts = [];
  var unit = (props[PR_FIELDS.unitNumber] || '').trim();
  var street_num = (props[PR_FIELDS.streetNumber] || '').trim();
  var street = (props[PR_FIELDS.streetName] || '').trim();
  var suburb = (props[PR_FIELDS.suburb] || '').trim();
  var state = (props[PR_FIELDS.state] || '').trim();
  var postcode = (props[PR_FIELDS.postCode] || '').trim();
  var lot = (props[PR_FIELDS.lotNumber] || '').trim();

  if (unit) parts.push('Unit ' + unit);
  if (lot) parts.push('Lot ' + lot);
  if (street_num) parts.push(street_num);
  if (street) parts.push(street);
  if (suburb) parts.push(suburb);
  if (state) parts.push(state.toUpperCase());
  if (postcode) parts.push(postcode);

  return parts.join(' ');
}

// === MATCHING LOGIC ===
function matchAddresses(opportunities, propertyRecords) {
  var results = [];

  for (var i = 0; i < opportunities.length; i++) {
    var opp = opportunities[i];
    if (!opp.registeredAddress) {
      results.push({
        opportunity: opp,
        match: null,
        score: 0,
        method: 'NO_ADDRESS'
      });
      continue;
    }

    var bestMatch = null;
    var bestScore = 0;
    var bestMethod = '';

    var oppAddr = normalise(opp.registeredAddress);

    for (var j = 0; j < propertyRecords.length; j++) {
      var pr = propertyRecords[j];
      var score = 0;
      var method = '';

      // Method 1: Exact match on Property Address
      if (pr.propertyAddress && normalise(pr.propertyAddress) === oppAddr) {
        score = 100;
        method = 'EXACT_PROPERTY_ADDRESS';
      }

      // Method 2: Exact match on Project Address
      if (score < 100 && pr.projectAddress && normalise(pr.projectAddress) === oppAddr) {
        score = 100;
        method = 'EXACT_PROJECT_ADDRESS';
      }

      // Method 3: Exact match on composite address
      if (score < 100 && pr.compositeAddress && normalise(pr.compositeAddress) === oppAddr) {
        score = 95;
        method = 'EXACT_COMPOSITE';
      }

      // Method 4: Token-based fuzzy matching
      if (score < 90) {
        var tokenScore = tokenMatch(oppAddr, pr);
        if (tokenScore > score) {
          score = tokenScore;
          method = 'TOKEN_MATCH';
        }
      }

      // Method 5: Substring checks — suburb + street in opp address
      if (score < 70) {
        var subScore = substringMatch(oppAddr, pr);
        if (subScore > score) {
          score = subScore;
          method = 'SUBSTRING';
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = pr;
        bestMethod = method;
      }
    }

    results.push({
      opportunity: opp,
      match: bestMatch,
      score: bestScore,
      method: bestMethod
    });
  }

  return results;
}

function tokenMatch(oppAddr, pr) {
  // Tokenise the opportunity address
  var oppTokens = oppAddr.split(/[\s,]+/).filter(function(t) { return t.length > 1; });
  if (oppTokens.length === 0) return 0;

  // Build target tokens from all property fields
  var targetParts = [
    pr.propertyAddress, pr.projectAddress, pr.projectName,
    pr.unitNumber, pr.streetNumber, pr.streetName,
    pr.suburb, pr.state, pr.postCode, pr.lotNumber
  ];
  var targetStr = normalise(targetParts.join(' '));
  var targetTokens = targetStr.split(/[\s,]+/).filter(function(t) { return t.length > 1; });

  // Count how many opp tokens appear in target
  var matchCount = 0;
  for (var i = 0; i < oppTokens.length; i++) {
    for (var j = 0; j < targetTokens.length; j++) {
      if (oppTokens[i] === targetTokens[j]) {
        matchCount++;
        break;
      }
    }
  }

  // Score: percentage of opp tokens matched, scaled to 0-89
  return Math.round((matchCount / oppTokens.length) * 89);
}

function substringMatch(oppAddr, pr) {
  var score = 0;
  var street = normalise(pr.streetName);
  var streetNum = normalise(pr.streetNumber);
  var unit = normalise(pr.unitNumber);
  var lot = normalise(pr.lotNumber);
  var projectName = normalise(pr.projectName);

  // Only score on street-level specifics, NOT suburb/state/postcode (too generic)
  if (street && street.length > 3 && oppAddr.indexOf(street) > -1) score += 30;
  if (streetNum && oppAddr.indexOf(streetNum) > -1) score += 15;
  if (unit && oppAddr.indexOf(unit) > -1) score += 10;
  if (lot && oppAddr.indexOf(lot) > -1) score += 15;
  if (projectName && projectName.length > 3 && oppAddr.indexOf(projectName) > -1) score += 20;

  return Math.min(score, 69); // Cap at 69 so token match always ranks higher
}

function normalise(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // remove punctuation
    .replace(/\s+/g, ' ')        // collapse whitespace
    .trim();
}

// === OUTPUT ===
function writeResults(ss, results, opportunities, propertyRecords) {
  // Sheet 1: Match Results — clear and rewrite (preserves Confirmed/Comments if on same row)
  var sheet = ss.getSheetByName('Match Results');
  if (!sheet) {
    sheet = ss.getActiveSheet();
    sheet.setName('Match Results');
  }

  // Read existing confirmations before clearing (keyed by Opportunity ID)
  var existingData = {};
  var MATCH_METHODS = ['EXACT_PROPERTY_ADDRESS', 'EXACT_PROJECT_ADDRESS', 'EXACT_COMPOSITE', 'TOKEN_MATCH', 'SUBSTRING', 'NO_ADDRESS'];
  if (sheet.getLastRow() > 1) {
    var oldData = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    for (var i = 0; i < oldData.length; i++) {
      var oppId = oldData[i][0]; // Column A = Opportunity ID
      var confirmed = String(oldData[i][4] || '').trim(); // Column E = Confirmed
      var comments = String(oldData[i][5] || '').trim(); // Column F = Comments
      // Only preserve if it looks like real user input (not a score or match method)
      if (!isNaN(confirmed) || MATCH_METHODS.indexOf(confirmed) > -1) confirmed = '';
      if (!isNaN(comments) || MATCH_METHODS.indexOf(comments) > -1) comments = '';
      if (oppId && (confirmed || comments)) {
        existingData[oppId] = { confirmed: confirmed, comments: comments };
      }
    }
  }

  sheet.clear();

  var headers = [
    'Opportunity ID', 'Opportunity Name', 'Stage', 'Registered Address',
    'Confirmed', 'Comments',
    'Match Score', 'Match Method',
    'Matched Record ID', 'Property Address (Record)', 'Project Address (Record)',
    'Composite Address (Record)'
  ];
  sheet.appendRow(headers);

  // Sort by score descending
  results.sort(function(a, b) { return b.score - a.score; });

  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    var prev = existingData[r.opportunity.id] || {};
    var row = [
      r.opportunity.id,
      r.opportunity.name,
      r.opportunity.stageName,
      r.opportunity.registeredAddress,
      prev.confirmed || '',
      prev.comments || '',
      r.score,
      r.method,
      r.match ? r.match.id : '',
      r.match ? r.match.propertyAddress : '',
      r.match ? r.match.projectAddress : '',
      r.match ? r.match.compositeAddress : ''
    ];
    sheet.appendRow(row);
  }

  // Auto-resize columns
  for (var c = 1; c <= headers.length; c++) {
    sheet.autoResizeColumn(c);
  }

  // Sheet 2: Summary stats
  var summarySheet = ss.getSheetByName('Summary');
  if (!summarySheet) {
    summarySheet = ss.insertSheet('Summary');
  }
  summarySheet.clear();
  summarySheet.appendRow(['Metric', 'Count']);
  summarySheet.appendRow(['Total Opportunities', opportunities.length]);
  summarySheet.appendRow(['Total Property Records', propertyRecords.length]);

  var matched100 = results.filter(function(r) { return r.score >= 90; }).length;
  var matched50 = results.filter(function(r) { return r.score >= 50 && r.score < 90; }).length;
  var matchedLow = results.filter(function(r) { return r.score > 0 && r.score < 50; }).length;
  var noMatch = results.filter(function(r) { return r.score === 0; }).length;

  summarySheet.appendRow(['High confidence matches (90+)', matched100]);
  summarySheet.appendRow(['Medium confidence (50-89)', matched50]);
  summarySheet.appendRow(['Low confidence (1-49)', matchedLow]);
  summarySheet.appendRow(['No match / no address', noMatch]);

  // Stage breakdown on summary sheet
  summarySheet.appendRow(['', '']);
  summarySheet.appendRow(['Stage', 'Count']);
  var stageCounts = {};
  for (var i = 0; i < opportunities.length; i++) {
    var s = opportunities[i].stageName || '(unknown)';
    stageCounts[s] = (stageCounts[s] || 0) + 1;
  }
  Object.keys(stageCounts).sort().forEach(function(s) {
    summarySheet.appendRow([s, stageCounts[s]]);
  });

  // Sheet 3: Raw opportunity data
  var rawSheet = ss.getSheetByName('Raw Opportunities');
  if (!rawSheet) {
    rawSheet = ss.insertSheet('Raw Opportunities');
  }
  rawSheet.clear();
  rawSheet.appendRow(['ID', 'Name', 'Stage', 'Registered Address']);
  for (var i = 0; i < opportunities.length; i++) {
    rawSheet.appendRow([opportunities[i].id, opportunities[i].name, opportunities[i].stageName, opportunities[i].registeredAddress]);
  }
}
