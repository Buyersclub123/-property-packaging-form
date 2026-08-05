// ============================================================
// INTEREST RATE UPDATER - Google Apps Script
// ============================================================
// Updates cell D11 in cashflow spreadsheets:
//   - Personal 90% tab → 6.5%
//   - SMSF 80% tab → 7%
//   - SMSF 70% tab → 7%
//   - SMSF Custom tab → 7%
// Personal 80% is formula-fed from Personal 90%.
// ============================================================

// ---- CONFIGURATION ----
var DRY_RUN = true;         // true = log only, no changes. Set false to apply.
var BATCH_SIZE = 1;          // How many folders to process per run.
var INTEREST_CELL = 'D11';

var PERSONAL_RATE = 0.065;   // 6.5%
var SMSF_RATE = 0.07;        // 7%

// Tabs to update and their rates
var TAB_RATES = {
  'Personal 90%':     PERSONAL_RATE,
  'Personal Custom':  PERSONAL_RATE,
  'SMSF 80%':         SMSF_RATE,
  'SMSF 70%':         SMSF_RATE,
  'SMSF Custom':      SMSF_RATE
};

// Minimum required tab to confirm it's a cashflow spreadsheet
var REQUIRED_TAB = 'Personal 90%';

// ---- TARGET LIST ----
// Each entry: { folderId, contractType, address }
// contractType: "Single" = Personal 90% + SMSF tabs | "Split" = Personal 90% only
var TARGET_LIST = [
  // --- Single contract (44 properties, deduplicated to unique folders) ---
  {folderId: '1nZ7TMqjILicU5Twp9CxjBUxPOxPxUAG2', contractType: 'Single', address: 'Birmingham Rd Cranbourne East VIC (multiple lots)'},
  {folderId: '1HO_oPX1dKpVWOJazd-lz2AQi4hjH45GA', contractType: 'Single', address: '1 Hardman Rd Rangeway WA 6530'},
  {folderId: '1SMBLRoJElYEHFkUVYYNY_TUXySZKT7Cy', contractType: 'Single', address: '101 Tarleton St East Devonport TAS 7310'},
  {folderId: '1fOZM87KBm99FdC4MCgY4mEqPXrYPGz_N', contractType: 'Single', address: '11 Kurrajong St Red Cliffs VIC 3496'},
  {folderId: '1XP_Vd03JVrVIMtvdTGVjxKGE9G79byOO', contractType: 'Single', address: '115 Maple St Golden Square VIC 3555'},
  {folderId: '17m7-2okpp4TbYViqpG0Wa5iRuJN3y8c8', contractType: 'Single', address: '12 Decatur St Alkimos WA 6038'},
  {folderId: '1QbYAoafGlln-2io_6G_-J9yaLmOQsW3N', contractType: 'Single', address: '12 Mitchell Ct Gracemere QLD 4702'},
  {folderId: '1G17MKA-H3JNyEZPcL1EDSh5eUEteO0eL', contractType: 'Single', address: '178 Rush St Koongal QLD 4701'},
  {folderId: '1ED-F6b4Oh19MypIbUDL7qSKW_ljqgnEZ', contractType: 'Single', address: '18 Senna Av Andrews Farm SA 5114'},
  {folderId: '1rrc6dFsQm9JSEvfgo5YUB8flfkmmeVja', contractType: 'Single', address: '2 Ridge Ct Mildura VIC 3500'},
  {folderId: '1hhcEBNwk38oKZoEZAjKXMpP7cbOZtL39', contractType: 'Single', address: '2 Valiant Ct Clinton QLD 4680'},
  {folderId: '1wV7isK-jYBx66fR-1oqmwbewDmTbzWlj', contractType: 'Single', address: '23 Macquarie Ct Mildura VIC 3500'},
  {folderId: '1ZesS1oOYIzX3kHo6dCazIzxj8q8iPL5U', contractType: 'Single', address: '27 Silverline Bend Bertram WA 6167'},
  {folderId: '143YvYlNY8oEt9qWFYAMnpKfjGfeiaJyk', contractType: 'Single', address: '28 Brandeis Gr Karnup WA 6176'},
  {folderId: '1OzhbMLFpbsieC3Wn0hxiDbZzB79DUAzK', contractType: 'Single', address: '32 Lake St Lake Albert NSW 2650'},
  {folderId: '16KMLpdDsB8hsIiC3KG_f6-snx-_b0TL8', contractType: 'Single', address: '34 Hampton St Northam WA 6401'},
  {folderId: '1oxp1XMTy4ARs47pP1AlG1xjzVyISqmzv', contractType: 'Single', address: '35 Currajong St Mornington TAS 7018'},
  {folderId: '1Y3UnCAJVi5FieYnuTvxqGIeThvqYfHuM', contractType: 'Single', address: '4 Holmes Pl Park Grove TAS 7320'},
  {folderId: '1ysio2UJwVRDg-heweK22WQD4YAKKcJno', contractType: 'Single', address: '40B Pix Rd Davoren Park SA 5113 (Internal)'},
  {folderId: '1UnAcLUqxsmVu8bl6RBeD8ZIgm6qXb08q', contractType: 'Single', address: '40B Pix Rd Davoren Park SA 5113 (Established)'},
  {folderId: '1nywooGhtW8vtl53Ktoh5ZRSUSoTcq_Jw', contractType: 'Single', address: '48 Chellaston Rd Munno Para West SA 5115'},
  {folderId: '1Q6ZmHcaZemESpXFhSrwH0AR-cVNOlApA', contractType: 'Single', address: '6 Adye Ct Shorewell Park TAS 7320'},
  {folderId: '1NhWmBG1uChA1r8WxbMTYff_xYSvr_N9y', contractType: 'Single', address: '6 Saxonvale Ct New Auckland QLD 4680'},
  {folderId: '1AHpHKT0c-oBmuTmY8jrOYUSFx_uD5fek', contractType: 'Single', address: '9 Charnley Gdns Waikiki WA 6169'},
  {folderId: '1pd0TDz5i5XpLsGE_4nZ4KE2Iz0AVOvC3', contractType: 'Single', address: 'Lot 1&2, 4 Hurst Rd Gawler East SA 5118'},
  {folderId: '1zg1kM2kHTWaeAvtpu2xKL_CumJ5-dk0_', contractType: 'Single', address: 'Lot 110 Mahogany Drive Logan Reserve QLD 4133'},
  {folderId: '1QkdWVD4NF6erRj0diC63ZqML8ZI9C0ho', contractType: 'Single', address: 'Lot 111 Macintyre St Holmview QLD 4207'},
  {folderId: '1vCaMlpEy2cBw9WlD_gBi6TB4ARb77G6k', contractType: 'Single', address: 'Lot 171 Pilly Dr Burrum Heads QLD 4659'},
  {folderId: '1QuetcC6Zd0Oo3yvKMP0wt5CKsGYftsTb', contractType: 'Single', address: 'Unit 1, 22 Carara Dr Kawana QLD 4701'},
  {folderId: '15I28JXdZJuzBOqLaKkQF0jEjrwjQGWHg', contractType: 'Single', address: 'Unit 2, 22 Carara Dr Kawana QLD 4701'},
  {folderId: '1dQM105DFQ8ni2chgZnFfTb8pOZPNihQ_', contractType: 'Single', address: 'Unit 2, 4 Fairfield St Cranbourne VIC 3977'},
  {folderId: '1W49HHFLnMlKAmRuY9O9Xo8DG8MUQnorZ', contractType: 'Single', address: 'Unit 3, 42 Powell St South Yarra VIC 3141'},
  {folderId: '1x2lD9NzSprRwLcV0s7znqQhEv5WK8Lax', contractType: 'Single', address: 'Unit 4, 30-32 Magnolia Ct Brighton TAS 7030'},
  {folderId: '180z0_PZ5gam1SX2BR_qNNQwFjd8KdFVK', contractType: 'Single', address: 'Unit 5, 33 Wyong Cr Andrews Farm SA 5114'},
  {folderId: '1CBsJFGYCU46XVIL8n5FeG3f9SQ0ovowp', contractType: 'Single', address: 'Unit 5, 28 Ashmont Av Ashmont NSW 2650'},
  {folderId: '1B6T04rCOq-AgzyLjUz1vLLMh1EjQxUIv', contractType: 'Single', address: 'Units 1,2, 25 Carmody St Hermit Park QLD 4812'},
  {folderId: '1xaEJQ6G50zX4xemTdunkdGPQnX5Ac8hL', contractType: 'Single', address: 'Units 1,2, 461 Boat Harbour Dr Torquay QLD 4655'},
  {folderId: '1eb3aBqMWO7vRRFhevDFgxJFRPWqo3vvj', contractType: 'Single', address: 'Units A-C, 146 Dee St Koongal QLD 4701'},
  {folderId: '17THzfG0OEE42Sz3un8v-y2o80TSMZYYV', contractType: 'Single', address: 'Units A,B, 3 Toy Pl Tolland NSW 2650'},
  {folderId: '1e_AfCZ1KMy8tjEXho6_8WTqKGqkFjdC3', contractType: 'Single', address: 'Units A,B, 8 Dora St Morayfield QLD 4506'},

  // --- Split contract (32 properties, deduplicated to unique folders) ---
  {folderId: '1BfTqBHRPBN2KJ_Q0mYkYiGIWvrnUIeWP', contractType: 'Split', address: '1442 Harlowe Estate Huntly VIC 3551'},
  {folderId: '16xSMlK6lu-FXYdGJsd73uZEvYgldau_r', contractType: 'Split', address: 'Lot 1804, Units 1,2, AFFINITY Bvd Morayfield QLD 4506'},
  {folderId: '1l9YNDhCvxidLqtyB6OyCPZcR5yFgQgEz', contractType: 'Split', address: '28 Daniel St Elizabeth Park SA 5113 (multiple lots)'},
  {folderId: '18IoKWVhH9NCN63UFg8bVWnnDYA3pv_sD', contractType: 'Split', address: 'Lot 1114, Jessup St Huntly VIC 3551'},
  {folderId: '125UjwMFbPRe_DiPJWv1xiz4NGLhQt_OS', contractType: 'Split', address: 'Lot 12, Howards Crossing Howard QLD 4659'},
  {folderId: '1AbLwDBpX1WT8r4XnwogQD3YlYk7OYB6E', contractType: 'Split', address: 'Lot 14, Howards Crossing Howard QLD 4659'},
  {folderId: '1JR9A5Khj_uKv7rgRda_8njmnqoiaw5OA', contractType: 'Split', address: 'Harlowe Estate Huntly VIC (Lots 1420, 1426)'},
  {folderId: '1AsLL-W9nZJxlGzSDQMn2J1bQCH2AyndJ', contractType: 'Split', address: 'Harlowe Estate Huntly VIC (Lots 1422, 1423)'},
  {folderId: '1_jx-IcrGBxGQ7hl7PrU0IY0vwIxNgvrg', contractType: 'Split', address: 'Lot 1425, Harlowe Estate Huntly VIC 3551'},
  {folderId: '1MyWBUfK7TedIrvegDNdFaL-YPMu6MXel', contractType: 'Split', address: 'Lot 1430, Harlowe Estate Huntly VIC 3551'},
  {folderId: '192d0aNlU77nk3ftCzQb-HTTFmi44WGao', contractType: 'Split', address: 'Lot 1440, Harlowe Estate Huntly VIC 3551'},
  {folderId: '1mtS9DTpH28HyJYsQ20i1bfj3TNTFdNk9', contractType: 'Split', address: 'Lot 150, Singleton WA 6175'},
  {folderId: '1expoZ_4cssEHkwg7QAgGC5v_gYK40twZ', contractType: 'Split', address: 'Lot 275, Wattleup Rd Hammond Park WA 6164'},
  {folderId: '1G_SL9RkwPuPURrAiZc-cW0wvKHMwlCz_', contractType: 'Split', address: 'Lot 279, Ironwood Rd Hammond Park WA 6164'},
  {folderId: '1k4Srk1CtZ3iW54ap0ZKqzhC0eXgQJ_Vy', contractType: 'Split', address: 'Lot 46, Howards Crossing Howard QLD 4659'},
  {folderId: '1GQEnM5uCsnMBkL_raoLSEaux4-Vd9wd0', contractType: 'Split', address: 'Lot 537, Kirramingly Ave Donnybrook VIC 3064'},
  {folderId: '1n0tK657Oupm31iP_9BBhutRnphNbJgzU', contractType: 'Split', address: 'Lot 692, Buchanan Ave Eglinton WA 6034'},
  {folderId: '13xP-oFKsYPuZAJeThb4MMn7OnH-C2g9x', contractType: 'Split', address: 'Lot 734, Apron View Yanchep WA 6035'},
  {folderId: '1Am3rw2bf6Rupk2SMUaVQJ8tu5-L3nC1s', contractType: 'Split', address: 'Lot 80, 94 Innes Park Rd Innes Park QLD 4670'},
  {folderId: '1bnLBLNQhwBDB3L90ozjC15dvxO89IL85', contractType: 'Split', address: 'Lot 902, Amadeus St Lakelands WA 6180'},
  {folderId: '1DAc9t-ljb0ocGFut2bWBUEQcKzims0tB', contractType: 'Split', address: 'Unit 1, 26 Beckington St Elizabeth Downs SA 5113'},
  {folderId: '1ua5hjx2ncg_-eeTFFAnjDDvJjwndVZMh', contractType: 'Split', address: 'Units 1,2, 1491 Riverway Dr Kelso QLD 4815'}
];


// ---- TRACKING ----
// Stores spreadsheet IDs already processed so shared folders don't get updated twice
var processedSpreadsheets_ = {};

// ---- MAIN FUNCTION ----
function updateInterestRates() {
  var log = [];
  log.push('=== Interest Rate Updater ===');
  log.push('Mode: ' + (DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (applying changes)'));
  log.push('Batch size: ' + BATCH_SIZE);
  log.push('Started: ' + new Date().toISOString());
  log.push('');

  // Get the tracker sheet to know where we left off
  var scriptProps = PropertiesService.getScriptProperties();
  var lastProcessedIndex = parseInt(scriptProps.getProperty('lastProcessedIndex') || '0', 10);

  log.push('Resuming from index: ' + lastProcessedIndex);
  log.push('');

  var processed = 0;
  var i = lastProcessedIndex;

  while (i < TARGET_LIST.length && processed < BATCH_SIZE) {
    var entry = TARGET_LIST[i];
    // Remove the placeholder/duplicate entry
    if (!entry || !entry.folderId || entry.folderId.length < 10) {
      i++;
      continue;
    }

    log.push('--- Folder ' + (i + 1) + '/' + TARGET_LIST.length + ' ---');
    log.push('Address: ' + entry.address);
    log.push('Folder ID: ' + entry.folderId);
    log.push('Contract type: ' + entry.contractType);

    try {
      var folder = DriveApp.getFolderById(entry.folderId);
      var files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
      var foundSheets = 0;

      while (files.hasNext()) {
        var file = files.next();
        var ssId = file.getId();
        var ssName = file.getName();

        // Skip if already processed (shared folder deduplication)
        if (processedSpreadsheets_[ssId]) {
          log.push('  SKIP (already processed): ' + ssName + ' [' + ssId + ']');
          continue;
        }

        log.push('  Found sheet: ' + ssName + ' [' + ssId + ']');

        // Verify it's a cashflow spreadsheet
        var ss = SpreadsheetApp.openById(ssId);
        var sheets = ss.getSheets();
        var sheetNames = sheets.map(function(s) { return s.getName(); });

        if (sheetNames.indexOf(REQUIRED_TAB) === -1) {
          log.push('  SKIP (no "' + REQUIRED_TAB + '" tab): ' + ssName);
          log.push('  Tabs found: ' + sheetNames.join(', '));
          continue;
        }

        log.push('  VERIFIED as cashflow spreadsheet');
        foundSheets++;

        // Determine which tabs to update
        var tabsToUpdate = {};
        if (entry.contractType === 'Split') {
          // Split: Personal 90% + Custom
          tabsToUpdate['Personal 90%'] = PERSONAL_RATE;
          tabsToUpdate['Custom'] = PERSONAL_RATE;
        } else {
          // Single: Personal 90% + all SMSF tabs
          tabsToUpdate = JSON.parse(JSON.stringify(TAB_RATES));
        }

        // Update each tab
        for (var tabName in tabsToUpdate) {
          if (sheetNames.indexOf(tabName) === -1) {
            log.push('  Tab "' + tabName + '": NOT FOUND - skipped');
            continue;
          }

          var sheet = ss.getSheetByName(tabName);
          var cell = sheet.getRange(INTEREST_CELL);
          var oldValue = cell.getValue();
          var newValue = tabsToUpdate[tabName];

          if (oldValue === newValue) {
            log.push('  Tab "' + tabName + '": D11 already = ' + formatRate(newValue) + ' - no change needed');
          } else {
            if (DRY_RUN) {
              log.push('  Tab "' + tabName + '": D11 = ' + formatRate(oldValue) + ' → ' + formatRate(newValue) + ' (DRY RUN - not changed)');
            } else {
              cell.setValue(newValue);
              log.push('  Tab "' + tabName + '": D11 = ' + formatRate(oldValue) + ' → ' + formatRate(newValue) + ' (UPDATED)');
            }
          }
        }

        // Mark as processed
        processedSpreadsheets_[ssId] = true;
      }

      if (foundSheets === 0) {
        log.push('  WARNING: No valid cashflow spreadsheet found in this folder');
      }

    } catch (e) {
      log.push('  ERROR: ' + e.message);
    }

    log.push('');
    i++;
    processed++;
  }

  // Save progress
  if (!DRY_RUN) {
    scriptProps.setProperty('lastProcessedIndex', i.toString());
  }

  log.push('=== Summary ===');
  log.push('Processed ' + processed + ' folders (index ' + lastProcessedIndex + ' to ' + (i - 1) + ')');
  log.push('Remaining: ' + (TARGET_LIST.length - i) + ' folders');
  if (DRY_RUN) {
    log.push('DRY RUN - no changes were made. Set DRY_RUN = false to apply.');
    log.push('Progress NOT saved in dry run mode.');
  } else {
    log.push('Progress saved. Run again to process next batch.');
  }

  var output = log.join('\n');
  Logger.log(output);
  return output;
}

// ---- HELPER ----
function formatRate(val) {
  if (val === '' || val === null || val === undefined) return '(empty)';
  if (typeof val === 'number') return (val * 100).toFixed(1) + '%';
  return String(val);
}

// ---- RESET PROGRESS ----
// Run this to start over from the beginning
function resetProgress() {
  PropertiesService.getScriptProperties().deleteProperty('lastProcessedIndex');
  Logger.log('Progress reset. Next run will start from index 0.');
}
