// ===== AMAP FOLDER SYNC TOOL =====
// Paste this entire script into Extensions → Apps Script in the AMAP Folder Tracker sheet
// Then run setup() once to create the trigger and Legacy folder

// ===== CONFIGURATION =====
var CONFIG = {
  SOURCE_FOLDER_ID: '100nwBNcdGTZN-9S1ttFayXHOX5HPi57c',
  DEST_FOLDER_ID: '1gDD2K9GgYcQivny46LUJ80vzTP2rtvbT',
  CURRENT_STATUS_TAB: 'Current Status',
  ACTIVITY_LOG_TAB: 'Activity Log',
  NOTIFY_EMAILS: ['john.t@buyersclub.com.au', 'nathan.f@buyersclub.com.au'],
  TRIGGER_MINUTES: 10,
  DUPLICATE_EMAIL_COOLDOWN_HOURS: 24
};

// ===== SETUP — RUN ONCE =====
function setup() {
  // Create Legacy subfolder in destination if it doesn't exist
  var destFolder = DriveApp.getFolderById(CONFIG.DEST_FOLDER_ID);
  var legacyFolders = destFolder.getFoldersByName('Legacy');
  if (!legacyFolders.hasNext()) {
    destFolder.createFolder('Legacy');
    logActivity('Setup', 'Legacy folder', '', '', 'Created Legacy subfolder in AMAP Reports folder');
  }

  // Remove existing sync triggers
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'syncFolders') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Create 10-minute trigger
  ScriptApp.newTrigger('syncFolders')
    .timeBased()
    .everyMinutes(CONFIG.TRIGGER_MINUTES)
    .create();

  logActivity('Setup', '', '', '', 'Trigger created — sync runs every ' + CONFIG.TRIGGER_MINUTES + ' minutes');

  SpreadsheetApp.getUi().alert('Setup complete. Sync will run every ' + CONFIG.TRIGGER_MINUTES + ' minutes.');
}

// ===== MAIN SYNC FUNCTION =====
function syncFolders() {
  try {
    _syncFoldersInner();
  } catch (e) {
    // Send error alert to john.t only
    MailApp.sendEmail({
      to: 'john.t@buyersclub.com.au',
      subject: 'AMAP Folder Sync — ERROR',
      body: 'The AMAP folder sync encountered an error and did not complete.\n\nError: ' + e.message + '\n\nTime: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd MMM yyyy HH:mm:ss')
    });
    logActivity('Error', '', '', '', 'Sync failed: ' + e.message);
  }
}

function _syncFoldersInner() {
  var sourceFolder = DriveApp.getFolderById(CONFIG.SOURCE_FOLDER_ID);
  var destFolder = DriveApp.getFolderById(CONFIG.DEST_FOLDER_ID);

  // Get source PDFs
  var sourceFiles = getFilesMap(sourceFolder);
  // Get destination PDFs
  var destFiles = getFilesMap(destFolder);

  var emailMessages = [];
  var now = new Date();

  // --- CHECK FOR DUPLICATE LGAs IN SOURCE ---
  var sourceLgaMap = {};
  var duplicateLgas = {};
  for (var srcName in sourceFiles) {
    var parsed = parseLgaFromFileName(srcName);
    var lgaKey = (parsed.lga + ' ' + parsed.state).toLowerCase().trim();
    if (lgaKey === '') continue;
    if (!sourceLgaMap[lgaKey]) {
      sourceLgaMap[lgaKey] = [];
    }
    sourceLgaMap[lgaKey].push(srcName);
    if (sourceLgaMap[lgaKey].length > 1) {
      duplicateLgas[lgaKey] = sourceLgaMap[lgaKey];
    }
  }

  // Handle duplicate LGAs — flag and email (once per 24 hours)
  for (var dupKey in duplicateLgas) {
    var dupFiles = duplicateLgas[dupKey];
    if (!isDuplicateEmailCoolingDown(dupKey)) {
      var dupMsg = 'There are ' + dupFiles.length + ' reports with the same LGA (' + dupKey.toUpperCase() + '), please can one be deleted so the system is sure it is picking up the correct file.\n\nFiles:\n- ' + dupFiles.join('\n- ');
      emailMessages.push(dupMsg);
      logActivity('Duplicate Flagged', dupFiles.join(', '), dupKey.split(' ')[0], dupKey.split(' ')[1] || '', 'Duplicate LGA detected — email sent');
      setDuplicateEmailTimestamp(dupKey);
    }
  }

  // --- PROCESS SOURCE FILES ---
  for (var sourceName in sourceFiles) {
    var sourceFile = sourceFiles[sourceName];
    var parsed = parseLgaFromFileName(sourceName);
    var lgaKey = (parsed.lga + ' ' + parsed.state).toLowerCase().trim();

    // Skip if this LGA has duplicates in source
    if (duplicateLgas[lgaKey]) continue;

    // Check if file exists in destination (match by LGA, not exact name)
    var destMatch = findDestFileByLga(destFiles, parsed.lga, parsed.state);

    if (!destMatch) {
      // --- NEW FILE — copy to destination ---
      var copiedFile = sourceFile.makeCopy(sourceName, destFolder);
      emailMessages.push('A new AMAP report has been put in the Packaging/AMAP Reports folder.\n\nLGA: ' + parsed.lga + ' ' + parsed.state + '\nFile: ' + sourceName);
      logActivity('New Copy', sourceName, parsed.lga, parsed.state, 'New report copied from source');

    } else {
      // --- EXISTING FILE — check if updated ---
      var sourceModified = sourceFile.getLastUpdated();
      var destModified = destMatch.file.getLastUpdated();

      if (sourceModified > destModified) {
        // Source is newer — move old to Legacy, copy new
        moveToLegacy(destMatch.file, destFolder);
        var updatedCopy = sourceFile.makeCopy(sourceName, destFolder);
        emailMessages.push('Existing report has been updated in the Packaging/AMAP folder.\n\nFile: ' + sourceName + '\nUpdated: ' + formatDate(sourceModified));
        logActivity('Updated', sourceName, parsed.lga, parsed.state, 'Source file updated — old version moved to Legacy, new version copied');
      }
    }
  }

  // --- CHECK FOR DELETIONS (dest files not in source) ---
  for (var destName in destFiles) {
    var destFile = destFiles[destName];
    var destParsed = parseLgaFromFileName(destName);
    var destLgaKey = (destParsed.lga + ' ' + destParsed.state).toLowerCase().trim();

    // Check if this LGA still exists in source
    var stillInSource = false;
    for (var sName in sourceFiles) {
      var sParsed = parseLgaFromFileName(sName);
      if (sParsed.lga.toLowerCase() === destParsed.lga.toLowerCase() && sParsed.state.toLowerCase() === destParsed.state.toLowerCase()) {
        stillInSource = true;
        break;
      }
    }

    if (!stillInSource) {
      moveToLegacy(destFile, destFolder);
      emailMessages.push('A report has been deleted from the Packaging/AMAP folder.\n\nFile: ' + destName + '\nLGA: ' + destParsed.lga + ' ' + destParsed.state + '\n\n(Not to be confused where a new report has been created for that LGA, which could have a slightly different name format)');
      logActivity('Removed', destName, destParsed.lga, destParsed.state, 'File no longer in source — moved to Legacy');
    }
  }

  // --- UPDATE CURRENT STATUS TAB ---
  updateCurrentStatusTab(sourceFolder, destFolder);

  // --- SEND EMAILS ---
  if (emailMessages.length > 0) {
    sendNotificationEmail(emailMessages);
  }
}

// ===== HELPER FUNCTIONS =====

// Get all PDFs in a folder as a map of {name: file}
function getFilesMap(folder) {
  var map = {};
  var files = folder.getFilesByType(MimeType.PDF);
  while (files.hasNext()) {
    var file = files.next();
    map[file.getName()] = file;
  }
  return map;
}

// Parse LGA and State from file name
// Expected format: "Buyers Club_ {LGA} {STATE} AMAP Report.pdf" or "Buyers Club_{LGA} {STATE} AMAP Report.pdf"
function parseLgaFromFileName(fileName) {
  var result = { lga: '', state: '' };

  // Remove file extension
  var name = fileName.replace(/\.pdf$/i, '');

  // Remove prefix variations
  name = name.replace(/^(Copy of )?Buyers Club[_ ]+/i, '');

  // Remove suffix "AMAP Report" or just "AMAP"
  name = name.replace(/\s*AMAP\s*(Report)?$/i, '').trim();

  // The state is the last word (2-3 letter abbreviation)
  var parts = name.split(/\s+/);
  var states = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

  if (parts.length >= 2) {
    var lastWord = parts[parts.length - 1].toUpperCase();
    if (states.indexOf(lastWord) !== -1) {
      result.state = lastWord;
      result.lga = parts.slice(0, parts.length - 1).join(' ');
    } else {
      // No state found — treat whole thing as LGA
      result.lga = name;
    }
  } else {
    result.lga = name;
  }

  return result;
}

// Find a destination file matching the same LGA and State
function findDestFileByLga(destFiles, lga, state) {
  if (!lga) return null;
  for (var name in destFiles) {
    var parsed = parseLgaFromFileName(name);
    if (parsed.lga.toLowerCase() === lga.toLowerCase() && parsed.state.toLowerCase() === state.toLowerCase()) {
      return { name: name, file: destFiles[name] };
    }
  }
  return null;
}

// Move a file to the Legacy subfolder
function moveToLegacy(file, destFolder) {
  var legacyFolders = destFolder.getFoldersByName('Legacy');
  if (legacyFolders.hasNext()) {
    var legacyFolder = legacyFolders.next();
    file.moveTo(legacyFolder);
  }
}

// ===== CURRENT STATUS TAB =====
function updateCurrentStatusTab(sourceFolder, destFolder) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.CURRENT_STATUS_TAB);
  if (!sheet) return;

  var sourceFiles = getFilesMap(sourceFolder);
  var destFiles = getFilesMap(destFolder);

  // Build rows — source as the driver
  var rows = [];
  var processedDestFiles = {};

  // Sort source file names
  var sourceNames = Object.keys(sourceFiles).sort();

  for (var i = 0; i < sourceNames.length; i++) {
    var srcName = sourceNames[i];
    var srcFile = sourceFiles[srcName];
    var parsed = parseLgaFromFileName(srcName);
    var srcModified = formatDate(srcFile.getLastUpdated());

    // Find matching dest file by LGA
    var destMatch = findDestFileByLga(destFiles, parsed.lga, parsed.state);

    var destName = '';
    var destStatus = '✗ Missing';
    var destModified = '';
    var lastAction = 'Pending';
    var lastDate = '';

    if (destMatch) {
      destName = destMatch.name;
      destModified = formatDate(destMatch.file.getLastUpdated());
      processedDestFiles[destMatch.name] = true;

      // Check if outdated
      if (srcFile.getLastUpdated() > destMatch.file.getLastUpdated()) {
        destStatus = '⚠ Outdated';
        lastAction = 'Needs Update';
      } else {
        destStatus = '✓ Synced';
        lastAction = 'Synced';
      }
      lastDate = formatDate(new Date());
    }

    rows.push([srcName, parsed.lga, parsed.state, srcModified, destName, destStatus, destModified, lastAction, lastDate]);
  }

  // Clear existing data (keep header row)
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 9).clearContent();
  }

  // Write rows
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 9).setValues(rows);
  }
}

// ===== ACTIVITY LOG =====
function logActivity(action, fileName, lga, state, details) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.ACTIVITY_LOG_TAB);
  if (!sheet) return;

  var now = new Date();
  var date = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var time = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss');

  sheet.appendRow([date, time, action, fileName, lga, state, details]);
}

// ===== EMAIL =====
function sendNotificationEmail(messages) {
  var subject = 'AMAP Folder Sync — ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd MMM yyyy HH:mm');
  var body = 'AMAP Folder Sync Update\n' +
    '========================\n\n' +
    messages.join('\n\n---\n\n') +
    '\n\n---\n\nThis is an automated notification from the AMAP Folder Tracker.';

  MailApp.sendEmail({
    to: CONFIG.NOTIFY_EMAILS.join(','),
    subject: subject,
    body: body
  });

  logActivity('Email Sent', '', '', '', 'Notification sent to ' + CONFIG.NOTIFY_EMAILS.join(', '));
}

// ===== DUPLICATE EMAIL COOLDOWN =====
function isDuplicateEmailCoolingDown(lgaKey) {
  var props = PropertiesService.getScriptProperties();
  var lastSent = props.getProperty('dup_email_' + lgaKey);
  if (!lastSent) return false;

  var lastSentDate = new Date(lastSent);
  var now = new Date();
  var hoursSince = (now - lastSentDate) / (1000 * 60 * 60);
  return hoursSince < CONFIG.DUPLICATE_EMAIL_COOLDOWN_HOURS;
}

function setDuplicateEmailTimestamp(lgaKey) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('dup_email_' + lgaKey, new Date().toISOString());
}

// ===== FORMATTING =====
function formatDate(date) {
  if (!date) return '';
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd MMM yyyy HH:mm');
}

// ===== MANUAL RUN (from menu) =====
function manualSync() {
  syncFolders();
  SpreadsheetApp.getUi().alert('Manual sync complete. Check Current Status and Activity Log tabs.');
}

// ===== CLEAN UP "Copy of" PREFIX =====
// Run this once to rename existing files in your AMAP Reports folder
function cleanUpCopyOfPrefix() {
  var destFolder = DriveApp.getFolderById(CONFIG.DEST_FOLDER_ID);
  var files = destFolder.getFilesByType(MimeType.PDF);
  var count = 0;

  while (files.hasNext()) {
    var file = files.next();
    var name = file.getName();
    if (name.indexOf('Copy of ') === 0) {
      var newName = name.replace(/^Copy of /, '');
      file.setName(newName);
      logActivity('Renamed', name + ' → ' + newName, '', '', 'Removed "Copy of" prefix');
      count++;
    }
  }

  if (count > 0) {
    SpreadsheetApp.getUi().alert('Renamed ' + count + ' files (removed "Copy of" prefix).');
  } else {
    SpreadsheetApp.getUi().alert('No files with "Copy of" prefix found.');
  }
}

// ===== REMOVE TRIGGER =====
function removeTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'syncFolders') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  SpreadsheetApp.getUi().alert('Trigger removed. Sync will no longer run automatically.');
}

// ===== CUSTOM MENU =====
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('AMAP Sync')
    .addItem('Run Sync Now', 'manualSync')
    .addItem('Clean Up "Copy of" Prefix', 'cleanUpCopyOfPrefix')
    .addSeparator()
    .addItem('Setup / Reset Trigger', 'setup')
    .addItem('Remove Trigger', 'removeTrigger')
    .addToUi();
}
