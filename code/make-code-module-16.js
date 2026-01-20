// Make.com Code Module 16 - Extract packager_approved
// Extracts packager_approved from Module 13's nested output structure
// This makes it accessible at the top level for Router conditions

const module13Data = input.Module13_Data || (Array.isArray(input) ? input[0] : input);
console.log("Module 16 - module13Data:", JSON.stringify(module13Data, null, 2));
console.log("Module 16 - packager_approved path:", module13Data?.record?.properties?.packager_approved);

// If Module13_Data is already the value string, use it directly
if (typeof module13Data === 'string') {
  return { packager_approved: module13Data };
}

// Otherwise, extract from the object structure
return {
  packager_approved: module13Data?.record?.properties?.packager_approved || ""
};










