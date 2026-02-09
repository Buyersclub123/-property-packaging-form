const fs = require('fs');
let content = fs.readFileSync('public/portal/index.html', 'utf8');

// Replace the messy email lookup with clean helper function call
const oldCode = `    // Look up BA email from baEmailMap if baEmail is not provided or is a name (not an email)
    // First check if selectedSendFromEmail already has an email (it's already validated)
    let baEmailAddress = selectedSendFromEmail && selectedSendFromEmail.includes('@') 
      ? selectedSendFromEmail 
      : baEmail;
    
    // If still not an email, look it up from baEmailMap
    if (!baEmailAddress || !baEmailAddress.includes('@')) {
      // If baEmail is empty or doesn't look like an email, try to look it up from baEmailMap
      if (currentBAFilter && baEmailMap[currentBAFilter]) {
        baEmailAddress = baEmailMap[currentBAFilter];
      } else if (baEmailMap[baIdentifier]) {
        baEmailAddress = baEmailMap[baIdentifier];
      } else {
        // Fallback: use baIdentifier (might be a name, but we'll send it)
        baEmailAddress = baIdentifier;
      }
    }
    
    // Determine "Send From" email - use manual input, dropdown, or fallback to BA email
    const sendOnBehalfCheckbox = document.getElementById('send-on-behalf-checkbox');
    const sendFromManualInput = document.getElementById('send-from-manual');
    let sendFromEmail = baEmailAddress;
    
    if (sendOnBehalfCheckbox && sendOnBehalfCheckbox.checked) {
      // Check manual input first, then dropdown, then fallback
      if (sendFromManualInput && sendFromManualInput.value.trim()) {
        sendFromEmail = sendFromManualInput.value.trim();
      } else if (selectedSendFromEmail) {
        sendFromEmail = selectedSendFromEmail;
      }
    }`;

const newCode = `    // Convert BA identifier to email address
    const baEmailAddress = convertBAIdentifierToEmail(baIdentifier);
    if (!baEmailAddress) {
      showMessage("Your BA identifier could not be matched to an email address. Please contact support.", 'error');
      return;
    }
    
    // Determine "Send From" email - use manual input, dropdown, or fallback to BA email
    const sendOnBehalfCheckbox = document.getElementById('send-on-behalf-checkbox');
    const sendFromManualInput = document.getElementById('send-from-manual');
    let sendFromEmail = baEmailAddress;
    
    if (sendOnBehalfCheckbox && sendOnBehalfCheckbox.checked) {
      if (sendFromManualInput && sendFromManualInput.value.trim()) {
        sendFromEmail = sendFromManualInput.value.trim();
      } else if (selectedSendFromEmail) {
        sendFromEmail = selectedSendFromEmail;
      }
    }
    
    // Validate sendFromEmail if it's not the default baEmailAddress
    if (sendFromEmail !== baEmailAddress && !sendFromEmail.includes('@')) {
      showMessage("The 'Send From' email address is invalid. Please enter a valid email or select from the dropdown.", 'error');
      return;
    }`;

content = content.replace(oldCode, newCode);
fs.writeFileSync('public/portal/index.html', content);
console.log('Fix applied successfully');
