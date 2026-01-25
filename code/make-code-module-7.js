// Make.com Code Module 7 - HTML Extractor
// Extracts clean summary HTML from email code output
// Handles both portal requests (from Iterator) and normal GHL webhook requests

console.log("Module 7 - Input keys:", Object.keys(input || {}).slice(0, 10));
console.log("Module 7 - Has 'to' field:", !!input.to);
console.log("Module 7 - Has 'htmlBody' field:", !!input.htmlBody);
console.log("Module 7 - Has 'Data' field:", !!input.Data);
console.log("Module 7 - Input.Data type:", typeof input.Data);
console.log("Module 7 - Input.Data first 100 chars:", input.Data ? String(input.Data).substring(0, 100) : "N/A");

// Check if this is from Iterator (portal request)
// Iterator outputs email objects: {to: "...", subject: "...", htmlBody: "..."} OR {Data: "<html>...", to: "...", subject: "..."}
// Detection: If we have Data as HTML string OR htmlBody field, treat as Iterator input
const hasHtmlBody = !!input.htmlBody;
const hasDataAsHtml = input.Data && typeof input.Data === 'string' && (
  input.Data.includes('<!DOCTYPE html') || 
  input.Data.includes('<html') || 
  input.Data.trim().startsWith('<')
);

if (hasHtmlBody || hasDataAsHtml) {
  // This is an email object from Iterator - pass it through unchanged
  console.log("Module 7 - Detected Iterator input (portal request), passing through");
  console.log("Module 7 - Detection reason:", hasHtmlBody ? "has htmlBody field" : "has Data as HTML string");
  
  // Extract htmlBody - could be direct or in Data field
  const htmlBodyValue = input.htmlBody || (input.Data && typeof input.Data === 'string' ? String(input.Data) : '');
  
  console.log("Module 7 - htmlBodyValue length:", htmlBodyValue ? htmlBodyValue.length : 0);
  
  // Pass through all fields from Iterator for logging purposes
  return {
    to: input.to || "",
    subject: input.subject || "",
    htmlBody: htmlBodyValue,
    textBody: input.textBody || "",
    html_body: htmlBodyValue,
    text_body: input.textBody || "",
    clean_summary_html: htmlBodyValue,
    // Pass through logging fields from Module 3 (via Iterator)
    propertyAddress: input.propertyAddress || "",
    baName: input.baName || "",
    baEmail: input.baEmail || "",
    sendFromEmail: input.sendFromEmail || "",
    clientInfo: input.clientInfo || {}
  };
}

// NORMAL REQUEST - Extract HTML body content
// Module 3 outputs: {subject, html_body, text_body, to, source}
const data = input.Data || input;
const full = data.html_body || input.html_body || "";

console.log("Module 7 - Normal request detected");
console.log("Module 7 - HTML body length:", full ? full.length : 0);

// Find <body>...</body> content safely
const match = full.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

let clean = "";
if (match && match[1]) {
  clean = match[1].trim();
  console.log("Module 7 - Extracted body content length:", clean.length);
} else {
  console.log("Module 7 - Warning: No <body> tag found, using full HTML");
  clean = full;
}

// Output clean summary for Packager + BA emails
const output = {
  clean_summary_html: clean,
  subject: data.subject || input.subject || "",
  html_body: data.html_body || input.html_body || "",
  text_body: data.text_body || input.text_body || "",
  to: data.to || input.to || "",
  source: data.source || input.source || ""
};

console.log("Module 7 - Output 'to' field:", output.to);
console.log("Module 7 - Output 'subject' field:", output.subject);

return output;

