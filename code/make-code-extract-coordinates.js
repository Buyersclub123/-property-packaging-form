// Extract lat/lon from Geoscape response
// Input is automatically provided by Make.com as input.geoscapeData

// Handle different input structures
let geoscapeData = input.geoscapeData || input || {};

// Make.com might wrap arrays in {v: [...]}
if (geoscapeData.v && Array.isArray(geoscapeData.v)) {
  geoscapeData = geoscapeData.v[0];
} else if (Array.isArray(geoscapeData)) {
  geoscapeData = geoscapeData[0];
}

// Get coordinates array - try multiple paths
let coordinates = [];
if (geoscapeData?.data?.features?.[0]?.geometry?.coordinates) {
  coordinates = geoscapeData.data.features[0].geometry.coordinates;
} else if (geoscapeData?.features?.[0]?.geometry?.coordinates) {
  coordinates = geoscapeData.features[0].geometry.coordinates;
}

// Return lat and lon
return {
  longitude: coordinates[0] || null,
  latitude: coordinates[1] || null,
  coordinates: coordinates,
  debug: {
    hasGeoscapeData: !!geoscapeData,
    hasData: !!geoscapeData?.data,
    hasFeatures: !!geoscapeData?.data?.features,
    geoscapeDataKeys: Object.keys(geoscapeData || {}),
    vIsArray: Array.isArray(geoscapeData?.v),
    vLength: geoscapeData?.v?.length,
    vFirstItemKeys: geoscapeData?.v?.[0] ? Object.keys(geoscapeData.v[0]) : [],
    rawInput: input
  }
};

