# Geoapify Category Mapping Reference

**Date:** 2025-01-15  
**Purpose:** Reference document mapping required amenities to Geoapify Places API category keys  
**Source:** `C:\Users\User\.cursor\JT FOLDER\Places API.txt`  
**Reference:** `.cursor/Rules` - Working rules for AI assistants

---

## Required Amenities and Category Mappings

### 1. Airport
- **Required Count:** 1
- **Geoapify Category:** `airport`
- **Subcategories Available:**
  - `airport` (general - use this)
  - `airport.airfield`
  - `airport.gliding`
  - `airport.international`
  - `airport.military`
  - `airport.private`
- **Search Radius:** 200km (if not found in 50km)
- **Notes:** Use general `airport` category to catch all types

### 2. Bus Stop
- **Required Count:** 1
- **Geoapify Category:** `public_transport.bus`
- **Naming Requirement:** Must include "Bus Stop" suffix (not just road name)
- **Search Radius:** 50km
- **Notes:** Bus stops may be named after roads - ensure name includes "Bus Stop"

### 3. Train Station
- **Required Count:** 1
- **Geoapify Categories:** `public_transport.train`, `railway.train`
- **Search Radius:** 100km (if not found in 50km)
- **Notes:** Use both categories to ensure coverage

### 4. Beach
- **Required Count:** 1
- **Geoapify Category:** `beach`
- **Subcategories Available:**
  - `beach` (general)
  - `beach.beach_resort`
- **Search Radius:** 50km
- **Notes:** Use general `beach` category

### 5. Kindergarten
- **Required Count:** 1
- **Geoapify Category:** `childcare.kindergarten`
- **Search Radius:** 50km
- **Notes:** Specific category for kindergartens

### 6. Schools
- **Required Count:** 3
- **Geoapify Category:** `education.school`
- **Subcategories Available:**
  - `education.school` (general)
  - `education.college`
  - `education.university`
- **Search Radius:** 50km
- **Notes:** Use `education.school` for primary/secondary schools

### 7. Supermarkets (Individual Chains)
- **Required Count:** 4 (one of each chain)
  - 1x closest Woolworths
  - 1x closest Coles
  - 1x closest IGA
  - 1x closest Aldi
- **Geoapify Category:** `commercial.supermarket`
- **Search Radius:** 50km
- **Notes:** Search for each chain separately, return closest of each. If a chain is not found, skip it (don't return other chains as substitutes)

### 8. Hospitals
- **Required Count:** 2
- **Geoapify Category:** `healthcare.hospital`
- **Search Radius:** 50km
- **Notes:** Use general hospital category

### 9. Childcare/Daycare
- **Required Count:** 3
- **Geoapify Category:** `childcare`
- **Subcategories Available:**
  - `childcare` (general - use this)
  - `childcare.kindergarten` (already counted separately)
- **Search Radius:** 50km
- **Notes:** Use general `childcare` to catch all daycare facilities

### 10. Capital Cities
- **Required Count:** 1 (closest overall + closest in same state if available)
- **Geoapify Category:** `populated_place.city`
- **Search Radius:** 50km (may need wider for distant capitals)
- **Australian Capitals:** Sydney, Melbourne, Brisbane, Perth, Adelaide, Hobart, Darwin, Canberra
- **Notes:** Filter to capital cities only, return closest overall and closest in same state

---

## Implementation Strategy

**Approach:** Work on one category at a time, test thoroughly before moving to next.

**Google Maps Integration Note:**
- When implementing road network distance calculation via Google Maps API:
  - Set driving time calculation for **Wednesday 9AM**
  - This ensures consistent travel time estimates based on typical weekday morning traffic

**Order:**
1. ✅ Airports (starting point)
2. Bus Stops (with naming requirement)
3. Train Stations
4. Beach
5. Kindergarten
6. Schools
7. Supermarkets (Woolworths, Coles, IGA, Aldi - one of each)
8. Hospitals
9. Childcare/Daycare
10. Capital Cities

---

## Category Reference from Geoapify API Documentation

Full category list available in: `C:\Users\User\.cursor\JT FOLDER\Places API.txt`

Key categories used:
- `airport` - Line 114
- `public_transport.bus` - Line 864
- `public_transport.train` - Line 870
- `railway.train` - Line 653
- `beach` - Line 793
- `childcare.kindergarten` - Line 408
- `education.school` - Line 403
- `commercial.supermarket` - Line 225
- `healthcare.hospital` - Line 456
- `childcare` - Line 407
- `populated_place.city` - Line 898

---

**Last Updated:** 2025-01-15  
**Status:** In Progress - Starting with airports
