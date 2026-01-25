// Make.com Code Module - Extract Tokens from Login Response
// This module extracts accessToken and refreshToken from Set-Cookie headers

// Get HTTP response (from login HTTP module)
// Module 5 returns an array: [{data: {...}, headers: {...}}]
// But Make.com Code module wraps it: [{name: "headers", value: {data: {...}, headers: {...}}}]
let httpResponse = {};
if (Array.isArray(input) && input.length > 0) {
  // Check if it's wrapped format: [{name: "...", value: {...}}]
  if (input[0].value) {
    httpResponse = input[0].value;
  } else {
    httpResponse = input[0];
  }
} else if (input && typeof input === 'object') {
  httpResponse = input.value || input;
}

// Extract Set-Cookie headers - handle nested structure
// httpResponse structure might be: {headers: {data: {...}, headers: {...}}}
// OR: {data: {...}, headers: {...}}
// Try both structures
let headersObj = {};
if (httpResponse.headers && httpResponse.headers.headers) {
  // Nested structure: {headers: {headers: {...}}}
  headersObj = httpResponse.headers.headers || httpResponse.headers.Headers || {};
} else {
  // Direct structure: {headers: {...}}
  headersObj = httpResponse.headers || httpResponse.Headers || {};
}

// Get set-cookie array (search all keys case-insensitively)
let setCookieHeaders = [];
if (headersObj && typeof headersObj === 'object') {
  const headerKeys = Object.keys(headersObj);
  for (let key of headerKeys) {
    if (key.toLowerCase() === 'set-cookie') {
      const value = headersObj[key];
      if (Array.isArray(value)) {
        setCookieHeaders = value;
      } else if (value) {
        setCookieHeaders = [value];
      }
      break;
    }
  }
}

// Handle both array and string formats
let cookieArray = [];
if (Array.isArray(setCookieHeaders)) {
  cookieArray = setCookieHeaders;
} else if (typeof setCookieHeaders === 'string') {
  cookieArray = [setCookieHeaders];
} else if (setCookieHeaders) {
  cookieArray = [String(setCookieHeaders)];
}

// Extract tokens from cookies
let accessToken = null;
let refreshToken = null;
let lastActiveUser = null;

cookieArray.forEach(cookieString => {
  if (!cookieString) return;
  
  // Parse cookie string: "accessToken=value; Domain=...; Path=..."
  const parts = cookieString.split(';');
  if (parts.length > 0) {
    const [name, value] = parts[0].split('=').map(s => s.trim());
    
    if (name === 'accessToken' && value) {
      accessToken = value;
    } else if (name === 'refreshToken' && value) {
      refreshToken = value;
    } else if (name === 'last-active-user' && value) {
      lastActiveUser = value;
    }
  }
});

// Build Cookie header for Stashproperty API
let cookieHeader = '';
if (lastActiveUser) {
  cookieHeader += `last-active-user=${lastActiveUser}; `;
}
if (refreshToken) {
  cookieHeader += `refreshToken=${refreshToken}; `;
}
if (accessToken) {
  cookieHeader += `accessToken=${accessToken};`;
}

// Return tokens
return {
  accessToken: accessToken,
  refreshToken: refreshToken,
  lastActiveUser: lastActiveUser,
  cookieHeader: cookieHeader.trim(),
  // Also return individual cookies for easy access
  cookies: {
    'last-active-user': lastActiveUser,
    'refreshToken': refreshToken,
    'accessToken': accessToken
  },
  // Raw response for debugging
  rawHeaders: headersObj,
  rawSetCookie: setCookieHeaders,
  debugHttpResponse: httpResponse
};

