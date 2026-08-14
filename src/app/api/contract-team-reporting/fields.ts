// Fields that are array-type (checkboxes) in GHL — need special parsing.
// Copied from src/app/api/contract-team/fields.ts
export const ARRAY_FIELDS = new Set([
  'lI4xRPFaeTDbXhiGIUFN', // B&P Requested?
  'Bnw4HsJmQKftLhEuo5VS', // Registration
  'KaDnA48WSWgbYKtl3oPx', // Finance Formal Approval Received
  'V0dIHoJT8xQDYtMVbZi5', // Land Deposit Paid
  'Qtu3Zhuno1RUQziNmfNw', // Build Deposit Issued
  'z46PLoTif5bLLyVNeL13', // Build Deposit Paid
  'V88m80BD2yiweCdXwOs2', // PM Intro Sent
]);

// Custom field ID → friendly name mapping for GHL Opportunities.
// Copied from src/app/api/contract-team/fields.ts
export const FIELD_MAP: Record<string, string> = {
  'lI4xRPFaeTDbXhiGIUFN': 'bpRequested',
  'es2ElmYbC2UHlSWT5iCo': 'bpDueDate',
  'FUTVzEIAPaNQ5GFvFNAA': 'bpExtensionStatus',
  'nMF1pg9HhWgclONNpXgB': 'bpScheduledDate',
  'ltb5pdvpiOp47H5Q8g7C': 'bpConditionStatus',
  'ninmdUiyIt5wmkeHpYMQ': 'bpNegotiationDetail',
  'ipSQQfga7SErZTfwVAaw': 'bpRequestedExtensionDate',
  'KaDnA48WSWgbYKtl3oPx': 'financeApprovalReceived',
  'WYmP8plPbH1E8NvUaGcP': 'confirmedSettlementDate',
  'pYAX5pGdutTTNbBFlCSp': 'insuranceStatus',
  'ip0s6Ku4c7Qjt9rGh6rk': 'preSettlementInspectionDate',
  'ZxvlKtEUn9a0kjNr2kLe': 'preSettlementInspectionStatus',
  'PlNx1851lV5PSAotT4FT': 'registeredAddress',
  'lWfSyDNYwWalhkMcHyAQ': 'settlementDate',
  'lX2e29gQ1iFuQ0DksM5W': 'brokerName',
  'bV6k9SaZ1UJpOuALO1xY': 'brokerCompany',
  'puGMV3MWyU13n4sBLHDj': 'brokerEmail',
  'hSW5hSoB1mZyHsnk2o6n': 'brokerPhone',
  'QOoYpW6A8G1Jk8xWs7h1': 'solicitorName',
  'bQ7bndudaNLmlLkYeDpG': 'solicitorCompany',
  'fr5S8FvqtZi3Pixo7fSY': 'solicitorEmail',
  'ff8fVDpZc9gwDH9nJdTR': 'solicitorPhone',
  'wsnXOFf7F4z3TDQEFsCw': 'personalName',
  'bneDrNtsG4Qv05nFNJDC': 'latestStatusUpdate',
  'Bnw4HsJmQKftLhEuo5VS': 'registration',
  'OiENeFt45VvOcAPHXTJ2': 'registrationDateETA',
  '5rgUZN6RJ0jC90eiH7ie': 'agentBuilderDetails',
  'p1IK7Zi8w1q2tLBwTrIE': 'typeOfProperty',
  'iRgTmkWKtmj0QmNhzaAf': 'briefNotes',
  'NXqFwEzo28k6lOkbyT5N': 'assignedBA',
  'Qtu3Zhuno1RUQziNmfNw': 'buildDepositIssued',
  'z8e1MppSXgl7qkhC1W0i': 'buildDepositIssuedDate',
  'z46PLoTif5bLLyVNeL13': 'buildDepositPaid',
  'V88m80BD2yiweCdXwOs2': 'pmIntroSent',
  '9tP2kSKAqgMvEPrwn0UC': 'unconditionalDate',
  'V0dIHoJT8xQDYtMVbZi5': 'landDepositPaid',
  '8YLvbapGXx02VocwLe8b': 'exchangeDate',
  '6CvlWiL0YIQy9ddBxdkR': 'financeDueDate',
  'P8eOaJZVABnVYqYs1PVh': 'financeExtensionStatus',
  'QEQb7GxaFWDK4U94aTz2': 'financeRequestedExtensionDate',
  'AIaDWgYjLvpH2DGUwIzo': 'lastConstructionUpdateDate',
  'L40013IVS6t1bTGVw3Lk': 'lastFinanceUpdateDate',
  'PSqmNxR4Etg8twxxg6c6': 'valuationExpectedAccessDate',
  'xFKbtz7Lt1X2nNTeFSSH': 'partnerName',
  'd0iUirsqy4kdUVMpHLfD': 'partnerEmail',
  'gpStrUSjZVHE4xyolRvH': 'partnerPhone',
  'wWJMsF5GadaOEEVuPsGP': 'smsfName',
  'EbDMmXJTBxkkWFBDChy5': 'trustName',
};

// Reverse map: friendly name → field ID
export const FRIENDLY_TO_FIELD_ID: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_MAP).map(([id, name]) => [name, id])
);

// GHL Property Reviews custom object identifiers
export const PROPERTY_OBJECT_ID = '692d04e3662599ed0c29edfa';
export const PROPERTY_LINK_FIELD_ID = 'yWOxBxsaE80b0Spni4CE';

// ---------------------------------------------------------------------------
// Property Review custom object field map (auto-generated from GHL schema)
// ---------------------------------------------------------------------------

// Property field id (GHL custom object field id) -> last-segment key
export const PROPERTY_FIELD_MAP: Record<string, string> = {
  "rzTSiCgwTIJIKcWYmhto": "property_address",
  "ipv1prJYM2yV78eDs6YW": "deal_type",
  "YXIziVeFgMUIU6Y3wPUL": "review_date",
  "urxzXOaUmuYlfbVExdmY": "unit__lot",
  "7q5uLKdk0OFUihmjMAOq": "street_number",
  "XPLCDiSk00rBp3ycU1p6": "street_name",
  "dexs18n2I3mIF5hCYAO5": "suburb_name",
  "yVH2dEtlQMskqW4dtX5l": "state",
  "pxxBTtm1A1j4m8Fv9A8O": "why_this_property",
  "QZ9P1F9SYzOwVHJpA29j": "google_map",
  "xaEI5k1h1OmezCaWGSuh": "beds_primary",
  "MinVwFjujc0VEbF4a6cD": "beds_additional__secondary__dual_key",
  "fXSoDWfEiO2zwIin6u0i": "bath_primary",
  "E7FYZJEMTuEIwGHqjVYo": "baths_additional__secondary__dual_key",
  "1RdngLBVyiIbewWz1IIG": "land_size",
  "LsW5FvBlfzNrqdfNRdVD": "title",
  "iE6EKIj0Mg3xM76vAJgx": "body_corp__per_quarter",
  "wqj23I19cS6dgVcTgg34": "garage_primary",
  "kIZebgqAhhUpKFMfOOP2": "garage_additional__secondary__dual_key",
  "WqV6pwPBXze7DGUOpzqk": "carport_primary",
  "bBcwdcn2DSdwFqViQFA1": "carport_additional__secondary__dual_key",
  "IlaGmR15vtAEhXomJPcP": "carspace_additional__secondary__dual_key",
  "hhRu7mIpsWjoqcn6dfKM": "carspace_primary",
  "4SUtPxqZyZDi49HQ3g8n": "zoning",
  "p4Oewpv7bKtERNRwJtTy": "flood",
  "Dd3x1MAej5wUvGwqwmDp": "bushfire",
  "6n6kTbvmIf7QdQknhZsq": "mining",
  "Di5OQa0LoJg4JcZAhoEj": "other_overlay",
  "7yMQ3oxgtxIHI9c1lNxr": "special_infrastructure",
  "3glAcslBwDaAC3n96C9r": "due_diligence_acceptance",
  "qLrixwI1MdgEVXqoV4aj": "asking",
  "bKNBtsUb4NHZi1UT8LUz": "asking_text",
  "ceOxCVX46iLLX1zcaEAd": "accepted_acquisition_target",
  "xC8IzJAytqbsS1NQGpZL": "current_rent_primary__per_week",
  "hxyGRczSDeLtjxWwLYdZ": "current_rent_secondary__per_week",
  "jtYawOnIwfobphHiORr1": "expiry_secondary",
  "CaMpd1Eiz6qFTvUjdkmz": "expiry_primary",
  "9BUrBuppPDnSggoyXjpT": "yield",
  "t2TTjzJLxebvuS1QMcQc": "appraised_yield",
  "2h9jl5U7lPSD0QnaF84z": "proximity",
  "ZgkEkVdRKSyfn5GhPfd3": "median_price_change__3_months",
  "NF9Eoh8lumzVEnYvgGUg": "median_price_change__1_year",
  "SQ0QUpy1Pf6k80e0ZmCs": "median_price_change__3_year",
  "VMK6sQ1brsArjnptclCl": "median_price_change__5_year",
  "fyhb3n5VsqMOOKyf4HLH": "median_yield",
  "Jwnylm4vGwfdiEDq7Bfi": "median_rent_change__1_year",
  "bw0o6QwTQkoNnHFbiN2Y": "rental_population",
  "vo3f2jguOwqFbVL48eKa": "vacancy_rate",
  "mXR4G484rwFnsrap45XN": "investment_highlights",
  "Qv1hsTRll7a8NfSt51a7": "status",
  "fbMzdI22ozrxU3RViBlF": "price_group",
  "KDRnZGSuS3iucWPEQKEr": "acceptable_acquisition__from",
  "uD39sJEXiRhM6TjyJxgc": "acceptable_acquisition__to",
  "scbfqmSEE307QtkqDpjL": "year_built",
  "YPqzfO7x9CWie4vi8QuF": "body_corp_description",
  "ce5B8d3aepUXpo3hmdHb": "flood_dialogue",
  "O7V7fwr1tr4FBbCi8ilp": "bushfire_dialogue",
  "lGvyeM0IdtIR0zCOD5pc": "mining_dialogie",
  "buzQksbl6xzhnEY4dEhG": "other_overlay_dialogue",
  "iBVzduQWVOUoOmATiuYH": "special_infrastructure_dialogue",
  "OzAihNAsYbiWptoJKCbv": "comparable_sales",
  "NSJvl0CrTn7zZ9IPFXAh": "post_code",
  "IWJrFnngqNxQkvAJSRSA": "agent_name",
  "kMs1xGfoU3rGJdmlbGuA": "agent_mobile",
  "6kVyUTJsFGznEqTmt6ZO": "agent_email",
  "6XEliscEtqu3w5jqFNjo": "push_record_to_deal_sheet",
  "Tc2p05Cu3ePtXLNOR6vO": "property_description_additional_dialogue",
  "regS3uANAQkXKolvKQCB": "purchase_price_additional_dialogue",
  "OQZmXEWZqDMzgY0haAzA": "rental_assessment_additional_dialogue",
  "uSKrlUHULML0l57Vg6uv": "attachments_additional_dialogue",
  "U1hYzLm8To9qDXJLLiNm": "message_for_ba",
  "nDTt39BcP17Z2aWz3HiZ": "resubmit_for_testing",
  "5OEdUFDiulm1qa9Imdsk": "packager_approved",
  "A1scK4aUnvu7qgEoyANe": "ba_approved",
  "rOTd9AqVJzi7rce9ZL1D": "lot_number",
  "zsuFnSmPfuyII5WxXidj": "project_parent_id",
  "aUzwaOf4htHAtRqjWczC": "is_parent_record",
  "XDJ71evhO1aoOD7XHevt": "project_identifier",
  "wErTHEQzzHeauaHJfL4w": "email_template_html",
  "gx2LofGDKM1IASPCRfwc": "email_template_text",
  "5KsHcuIjn5I5sXtCNgxU": "build_size",
  "Ir9jg74V8F8ojxoGJ5DR": "land_registration",
  "7HQqGCRITwlkJUdlcdZi": "lga",
  "f3e7arofQwqsCgfzpYgy": "folder_link",
  "SqlCp6jp29xls7cDHlmg": "land_price",
  "R5Rkn1ncV35iRV4jmj5y": "build_price",
  "Upx6cyBeeBbGowUrFFPH": "total_price",
  "5ME8cd5fRUZiiytdQ6b0": "cashback_rebate_value",
  "c34AGkX5b4EEOZJeOpgg": "rent_appraisal_primary_from",
  "rYoyp4RjlPNdcjAqv5NA": "rent_appraisal_primary_to",
  "WqpNNfRJKMMWVQKqkSSd": "rent_appraisal_secondary_from",
  "JFLHT4Biqgr5pODUiFDD": "rent_appraisal_secondary_to",
  "ooYvSMGyvGhgPnRBj4jc": "project_brief",
  "6MhaQOg1WDLFzwP25Gk5": "sourcer",
  "A9zz1tz9p54UeUD8SJVh": "packager",
  "F2PLT7o24F5ti22j0Eri": "occupancy_primary",
  "TDWhiyqKK4waq5yfoIpc": "occupancy_secondary",
  "zXp57BZmmjTUBQmbloEe": "single_or_dual_occupancy",
  "o7hm5a7nAP5H1FNJMMEt": "project_address",
  "LG3FtqPddxSl6tXb2w4h": "property_type",
  "msbIKiLbHSAGvvf172HI": "project_name",
  "t2bACPv9HXXhINT5cZ9i": "market_performance_additional_dialogue",
  "0Hh4vQeoGlspVCZOTh3l": "net_price",
  "xoxBIHAArnz2G20ZMD4r": "contract_type",
  "27PA0eJVTOE6l4oyhiuK": "cashback_rebate_type",
  "Wn98qbwkVcj5sWBrewJ8": "closing_ba",
  "UWJmowSOFW2i2n2Hv7Ha": "closing_price",
  "5OIQzaoZv2U9ySCYYt0l": "client_closed",
  "z6OD5An3zsH4nDxvv2C8": "closing_date",
  "AryOOTd5gUhSh33op5o7": "packager_email",
  "b6lDqOACLeI2xsb19xRz": "qa_approved",
  "4kKVLbYhk5S3Zi51pjq8": "cf_insurance_value_",
  "1LU0L1TciGNDhWKeyjLt": "cf_councilwater_rates_",
  "tomDL7gqDDfyXgJ89YHH": "cf_depreciation_",
  "mSLJ4cL7Xa5dXeqVRkkI": "dwelling_type",
  "xR4fREFaccHECFk9HhpK": "subject_line",
  "epdjGsqbJuWW5C2FgjyP": "dwelling_details",
  "sQ2FTUkKLrc7711UMYuj": "completion_date",
  "yWOxBxsaE80b0Spni4CE": "linked_opportunity_id"
};

// Property last-segment key -> human-readable label
export const PROPERTY_FIELD_LABELS: Record<string, string> = {
  "property_address": "Property Address",
  "deal_type": "Deal Type",
  "review_date": "Review Date",
  "unit__lot": "Unit Number(s)",
  "street_number": "Street Number",
  "street_name": "Street Name",
  "suburb_name": "Suburb Name",
  "state": "State",
  "why_this_property": "Why this property?",
  "google_map": "Google Map",
  "beds_primary": "Bed (Primary)",
  "beds_additional__secondary__dual_key": "Bed (Secondary)",
  "bath_primary": "Bath (Primary)",
  "baths_additional__secondary__dual_key": "Bath (Secondary)",
  "land_size": "Land Size",
  "title": "Title",
  "body_corp__per_quarter": "Body corp $ (per quarter)",
  "garage_primary": "Garage (Primary)",
  "garage_additional__secondary__dual_key": "Garage (Secondary)",
  "carport_primary": "Car-port (Primary)",
  "carport_additional__secondary__dual_key": "Car-port (Secondary)",
  "carspace_additional__secondary__dual_key": "Car-space (Secondary)",
  "carspace_primary": "Car-space (Primary)",
  "zoning": "Zoning",
  "flood": "Flood",
  "bushfire": "Bushfire",
  "mining": "Mining",
  "other_overlay": "Other (Overlay)",
  "special_infrastructure": "Special Infrastructure",
  "due_diligence_acceptance": "Due Diligence Acceptance",
  "asking": "Asking",
  "asking_text": "Asking Text",
  "accepted_acquisition_target": "Accepted Acquisition Target",
  "current_rent_primary__per_week": "Current Rent (Primary) $ per week",
  "current_rent_secondary__per_week": "Current Rent (Secondary) $ per week",
  "expiry_secondary": "Expiry (Secondary)",
  "expiry_primary": "Expiry (Primary)",
  "yield": "Yield",
  "appraised_yield": "Appraised Yield",
  "proximity": "Proximity",
  "median_price_change__3_months": "Median price change - 3 months",
  "median_price_change__1_year": "Median price change - 1 year:",
  "median_price_change__3_year": "Median price change - 3 year",
  "median_price_change__5_year": "Median price change - 5 year",
  "median_yield": "Median yield",
  "median_rent_change__1_year": "Median rent change - 1 year",
  "rental_population": "Rental Population",
  "vacancy_rate": "Vacancy Rate",
  "investment_highlights": "Investment Highlights",
  "status": "Status",
  "price_group": "Price_group",
  "acceptable_acquisition__from": "Acceptable Acquisition $ From",
  "acceptable_acquisition__to": "Acceptable Acquisition $ To",
  "year_built": "Year Built",
  "body_corp_description": "Body Corp Description",
  "flood_dialogue": "Flood Dialogue",
  "bushfire_dialogue": "Bushfire Dialogue",
  "mining_dialogie": "Mining Dialogue",
  "other_overlay_dialogue": "Other (Overlay) Dialogue",
  "special_infrastructure_dialogue": "Special Infrastructure Dialogue",
  "comparable_sales": "Comparable Sales",
  "post_code": "Post Code",
  "agent_name": "Agent Name",
  "agent_mobile": "Agent Mobile",
  "agent_email": "Agent Email",
  "push_record_to_deal_sheet": "Push Record to Deal Sheet?",
  "property_description_additional_dialogue": "Property Description Additional Dialogue",
  "purchase_price_additional_dialogue": "Purchase Price Additional Dialogue",
  "rental_assessment_additional_dialogue": "Rental Assessment Additional Dialogue",
  "attachments_additional_dialogue": "Attachments Additional Dialogue",
  "message_for_ba": "Message for BA",
  "resubmit_for_testing": "Resubmit for testing?",
  "packager_approved": "Packager Approved",
  "ba_approved": "BA Approved",
  "lot_number": "lot_number ",
  "project_parent_id": "project_parent_id",
  "is_parent_record": "is_parent_record",
  "project_identifier": "project_identifier",
  "email_template_html": "email_template_html",
  "email_template_text": "email_template_text",
  "build_size": "build_size",
  "land_registration": "land_registration",
  "lga": "lga",
  "folder_link": "folder_link",
  "land_price": "land_price",
  "build_price": "build_price",
  "total_price": "total_price",
  "cashback_rebate_value": "cashback_rebate_value",
  "rent_appraisal_primary_from": "rent_appraisal_primary_from",
  "rent_appraisal_primary_to": "rent_appraisal_primary_to",
  "rent_appraisal_secondary_from": "rent_appraisal_secondary_from",
  "rent_appraisal_secondary_to": "rent_appraisal_secondary_to",
  "project_brief": "project_brief",
  "sourcer": "Sourcer",
  "packager": "Packager",
  "occupancy_primary": "occupancy_primary",
  "occupancy_secondary": "occupancy_secondary",
  "single_or_dual_occupancy": "Single or Dual Occupancy?",
  "project_address": "Project Address",
  "property_type": "Property Type",
  "project_name": "Project Name",
  "market_performance_additional_dialogue": "Market Performance Additional Dialogue",
  "net_price": "Net Price",
  "contract_type": "Contract Type",
  "cashback_rebate_type": "cashback_rebate_type",
  "closing_ba": "Closing BA",
  "closing_price": "Closing Price",
  "client_closed": "Client Closed",
  "closing_date": "Closing Date",
  "packager_email": "Packager Email",
  "qa_approved": "QA Approved",
  "cf_insurance_value_": "CF Insurance Value $",
  "cf_councilwater_rates_": "CF Council/Water Rates $",
  "cf_depreciation_": "CF Depreciation $",
  "dwelling_type": "Dwelling Type",
  "subject_line": "Subject Line",
  "dwelling_details": "Dwelling Details",
  "completion_date": "Completion Date",
  "linked_opportunity_id": "Linked Opportunity ID"
};

// Property last-segment key -> dropdown options (when dataType is SINGLE_OPTIONS/CHECKBOX)
export const PROPERTY_FIELD_OPTIONS: Record<string, string[]> = {
  "deal_type": [
    "01 H&L Comms",
    "02 Single Comms",
    "03 Internal with Comms",
    "04 Internal No-Comms",
    "05 Established"
  ],
  "state": [
    "QLD",
    "NSW",
    "VIC",
    "SA",
    "WA",
    "TAS",
    "ACT",
    "NT"
  ],
  "beds_primary": [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "21",
    "22",
    "23",
    "24",
    "25",
    "26",
    "27",
    "28",
    "29",
    "30",
    "31",
    "32",
    "33",
    "34",
    "35",
    "36",
    "37",
    "38",
    "39",
    "40",
    "41",
    "42",
    "43",
    "44",
    "45",
    "46",
    "47",
    "48",
    "49",
    "50",
    "tbc"
  ],
  "beds_additional__secondary__dual_key": [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "TBC"
  ],
  "bath_primary": [
    "0",
    "1",
    "1.5",
    "2",
    "2.5",
    "3",
    "3.5",
    "4",
    "4.5",
    "5",
    "5.5",
    "6",
    "6.5",
    "7",
    "7.5",
    "8",
    "8.5",
    "9",
    "9.5",
    "10",
    "10.5",
    "11",
    "11.5",
    "12",
    "12.5",
    "13",
    "13.5",
    "14",
    "14.5",
    "15",
    "15.5",
    "16",
    "16.5",
    "17",
    "17.5",
    "18",
    "18.5",
    "19",
    "19.5",
    "20",
    "20.5",
    "21",
    "21.5",
    "22",
    "22.5",
    "23",
    "23.5",
    "24",
    "24.5",
    "25",
    "25.5",
    "26",
    "26.5",
    "27",
    "27.5",
    "28",
    "28.5",
    "29",
    "29.5",
    "30",
    "30.5",
    "31",
    "31.5",
    "32",
    "32.5",
    "33",
    "33.5",
    "34",
    "34.5",
    "35",
    "35.5",
    "36",
    "36.5",
    "37",
    "37.5",
    "38",
    "38.5",
    "39",
    "39.5",
    "40",
    "40.5",
    "41",
    "41.5",
    "42",
    "42.5",
    "43",
    "43.5",
    "44",
    "44.5",
    "45",
    "45.5",
    "46",
    "46.5",
    "47",
    "47.5",
    "48",
    "48.5",
    "49",
    "49.5",
    "50",
    "TBC"
  ],
  "baths_additional__secondary__dual_key": [
    "0",
    "1",
    "1.5",
    "2",
    "2.5",
    "3",
    "3.5",
    "4",
    "4.5",
    "5",
    "5.5",
    "6",
    "6.5",
    "7",
    "7.5",
    "8",
    "8.5",
    "9",
    "9.5",
    "10",
    "TBC"
  ],
  "title": [
    "Individual",
    "Torrens",
    "Green",
    "Strata",
    "Owners Corp (Community)",
    "Community",
    "Built Strata",
    "Survey Strata",
    "TBC"
  ],
  "garage_primary": [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "21",
    "22",
    "23",
    "24",
    "25",
    "26",
    "27",
    "28",
    "29",
    "30",
    "31",
    "32",
    "33",
    "34",
    "35",
    "36",
    "37",
    "38",
    "39",
    "40",
    "41",
    "42",
    "43",
    "44",
    "45",
    "46",
    "47",
    "48",
    "49",
    "50",
    "TBC"
  ],
  "garage_additional__secondary__dual_key": [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "TBC"
  ],
  "carport_primary": [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "21",
    "22",
    "23",
    "24",
    "25",
    "26",
    "27",
    "28",
    "29",
    "30",
    "31",
    "32",
    "33",
    "34",
    "35",
    "36",
    "37",
    "38",
    "39",
    "40",
    "41",
    "42",
    "43",
    "44",
    "45",
    "46",
    "47",
    "48",
    "49",
    "50",
    "TBC"
  ],
  "carport_additional__secondary__dual_key": [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "TBC"
  ],
  "carspace_additional__secondary__dual_key": [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "TBC"
  ],
  "carspace_primary": [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "21",
    "22",
    "23",
    "24",
    "25",
    "26",
    "27",
    "28",
    "29",
    "30",
    "31",
    "32",
    "33",
    "34",
    "35",
    "36",
    "37",
    "38",
    "39",
    "40",
    "41",
    "42",
    "43",
    "44",
    "45",
    "46",
    "47",
    "48",
    "49",
    "50",
    "51",
    "52",
    "53",
    "54",
    "55",
    "56",
    "57",
    "58",
    "59",
    "60",
    "TBC"
  ],
  "flood": [
    "No",
    "Yes"
  ],
  "bushfire": [
    "No",
    "Yes"
  ],
  "mining": [
    "No",
    "Yes"
  ],
  "other_overlay": [
    "No",
    "Yes"
  ],
  "special_infrastructure": [
    "No",
    "Yes"
  ],
  "due_diligence_acceptance": [
    "No",
    "Yes"
  ],
  "asking": [
    "On-market",
    "Off-market",
    "Pre-launch opportunity",
    "Coming soon",
    "TBC"
  ],
  "status": [
    "01 Available",
    "02 EOI",
    "03 Contr' Exchanged",
    "05 Remove no interest",
    "06 Remove lost",
    "07 Test Record"
  ],
  "price_group": [
    "$300 - 500k",
    "$500 - 700k",
    "$700 +"
  ],
  "push_record_to_deal_sheet": [
    "Yes",
    "No"
  ],
  "resubmit_for_testing": [
    "Yes",
    "No"
  ],
  "is_parent_record": [
    "Yes",
    "No"
  ],
  "occupancy_primary": [
    "Owner Occupied",
    "Tenanted",
    "Vacant",
    "TBC",
    "Partially Tenanted"
  ],
  "occupancy_secondary": [
    "Owner Occupied",
    "Tenanted",
    "Vacant",
    "TBC"
  ],
  "single_or_dual_occupancy": [
    "Single Occupancy",
    "Dual Occupancy"
  ],
  "property_type": [
    "Established",
    "New"
  ],
  "contract_type": [
    "Split Contract",
    "Single Contract"
  ],
  "cashback_rebate_type": [
    "Cashback",
    "Rebate"
  ],
  "dwelling_type": [
    "Unit",
    "Townhouse",
    "Villa",
    "House",
    "Dual-key",
    "Duplex",
    "Multi-dwelling",
    "Block of Units"
  ]
};

// Combined label lookup. Use explicit labels first, then fall back to
// title-casing the field key.
export function getPropertyFieldLabel(key: string): string {
  return PROPERTY_FIELD_LABELS[key] ?? titleCaseKey(key);
}

function titleCaseKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Option key -> label pairs for Property Review dropdown fields.
// GHL STORES the option key (e.g. "split_contract") but users should SEE the
// label (e.g. "Split Contract").
export const PROPERTY_FIELD_OPTION_PAIRS: Record<string, { key: string; label: string }[]> = {
  "deal_type": [
    {
      "key": "01_hl_comms",
      "label": "01 H&L Comms"
    },
    {
      "key": "02_single_comms",
      "label": "02 Single Comms"
    },
    {
      "key": "03_internal_with_comms",
      "label": "03 Internal with Comms"
    },
    {
      "key": "04_internal_nocomms",
      "label": "04 Internal No-Comms"
    },
    {
      "key": "05_established",
      "label": "05 Established"
    }
  ],
  "state": [
    {
      "key": "qld",
      "label": "QLD"
    },
    {
      "key": "nsw",
      "label": "NSW"
    },
    {
      "key": "vic",
      "label": "VIC"
    },
    {
      "key": "sa",
      "label": "SA"
    },
    {
      "key": "wa",
      "label": "WA"
    },
    {
      "key": "tas",
      "label": "TAS"
    },
    {
      "key": "act",
      "label": "ACT"
    },
    {
      "key": "nt",
      "label": "NT"
    }
  ],
  "beds_primary": [
    {
      "key": "0",
      "label": "0"
    },
    {
      "key": "1",
      "label": "1"
    },
    {
      "key": "2",
      "label": "2"
    },
    {
      "key": "3",
      "label": "3"
    },
    {
      "key": "4",
      "label": "4"
    },
    {
      "key": "5",
      "label": "5"
    },
    {
      "key": "6",
      "label": "6"
    },
    {
      "key": "7",
      "label": "7"
    },
    {
      "key": "8",
      "label": "8"
    },
    {
      "key": "9",
      "label": "9"
    },
    {
      "key": "10",
      "label": "10"
    },
    {
      "key": "11",
      "label": "11"
    },
    {
      "key": "12",
      "label": "12"
    },
    {
      "key": "13",
      "label": "13"
    },
    {
      "key": "14",
      "label": "14"
    },
    {
      "key": "15",
      "label": "15"
    },
    {
      "key": "16",
      "label": "16"
    },
    {
      "key": "17",
      "label": "17"
    },
    {
      "key": "18",
      "label": "18"
    },
    {
      "key": "19",
      "label": "19"
    },
    {
      "key": "20",
      "label": "20"
    },
    {
      "key": "21",
      "label": "21"
    },
    {
      "key": "22",
      "label": "22"
    },
    {
      "key": "23",
      "label": "23"
    },
    {
      "key": "24",
      "label": "24"
    },
    {
      "key": "25",
      "label": "25"
    },
    {
      "key": "26",
      "label": "26"
    },
    {
      "key": "27",
      "label": "27"
    },
    {
      "key": "28",
      "label": "28"
    },
    {
      "key": "29",
      "label": "29"
    },
    {
      "key": "30",
      "label": "30"
    },
    {
      "key": "31",
      "label": "31"
    },
    {
      "key": "32",
      "label": "32"
    },
    {
      "key": "33",
      "label": "33"
    },
    {
      "key": "34",
      "label": "34"
    },
    {
      "key": "35",
      "label": "35"
    },
    {
      "key": "36",
      "label": "36"
    },
    {
      "key": "37",
      "label": "37"
    },
    {
      "key": "38",
      "label": "38"
    },
    {
      "key": "39",
      "label": "39"
    },
    {
      "key": "40",
      "label": "40"
    },
    {
      "key": "41",
      "label": "41"
    },
    {
      "key": "42",
      "label": "42"
    },
    {
      "key": "43",
      "label": "43"
    },
    {
      "key": "44",
      "label": "44"
    },
    {
      "key": "45",
      "label": "45"
    },
    {
      "key": "46",
      "label": "46"
    },
    {
      "key": "47",
      "label": "47"
    },
    {
      "key": "48",
      "label": "48"
    },
    {
      "key": "49",
      "label": "49"
    },
    {
      "key": "50",
      "label": "50"
    },
    {
      "key": "tbc",
      "label": "tbc"
    }
  ],
  "beds_additional__secondary__dual_key": [
    {
      "key": "0",
      "label": "0"
    },
    {
      "key": "1",
      "label": "1"
    },
    {
      "key": "2",
      "label": "2"
    },
    {
      "key": "3",
      "label": "3"
    },
    {
      "key": "4",
      "label": "4"
    },
    {
      "key": "5",
      "label": "5"
    },
    {
      "key": "6",
      "label": "6"
    },
    {
      "key": "7",
      "label": "7"
    },
    {
      "key": "8",
      "label": "8"
    },
    {
      "key": "9",
      "label": "9"
    },
    {
      "key": "10",
      "label": "10"
    },
    {
      "key": "tbc",
      "label": "TBC"
    }
  ],
  "bath_primary": [
    {
      "key": "0",
      "label": "0"
    },
    {
      "key": "1",
      "label": "1"
    },
    {
      "key": "1point5",
      "label": "1.5"
    },
    {
      "key": "2",
      "label": "2"
    },
    {
      "key": "2point5",
      "label": "2.5"
    },
    {
      "key": "3",
      "label": "3"
    },
    {
      "key": "3point5",
      "label": "3.5"
    },
    {
      "key": "4",
      "label": "4"
    },
    {
      "key": "4point5",
      "label": "4.5"
    },
    {
      "key": "5",
      "label": "5"
    },
    {
      "key": "5point5",
      "label": "5.5"
    },
    {
      "key": "6",
      "label": "6"
    },
    {
      "key": "6point5",
      "label": "6.5"
    },
    {
      "key": "7",
      "label": "7"
    },
    {
      "key": "7point5",
      "label": "7.5"
    },
    {
      "key": "8",
      "label": "8"
    },
    {
      "key": "8point5",
      "label": "8.5"
    },
    {
      "key": "9",
      "label": "9"
    },
    {
      "key": "9point5",
      "label": "9.5"
    },
    {
      "key": "10",
      "label": "10"
    },
    {
      "key": "10point5",
      "label": "10.5"
    },
    {
      "key": "11",
      "label": "11"
    },
    {
      "key": "11point5",
      "label": "11.5"
    },
    {
      "key": "12",
      "label": "12"
    },
    {
      "key": "12point5",
      "label": "12.5"
    },
    {
      "key": "13",
      "label": "13"
    },
    {
      "key": "13point5",
      "label": "13.5"
    },
    {
      "key": "14",
      "label": "14"
    },
    {
      "key": "14point5",
      "label": "14.5"
    },
    {
      "key": "15",
      "label": "15"
    },
    {
      "key": "15point5",
      "label": "15.5"
    },
    {
      "key": "16",
      "label": "16"
    },
    {
      "key": "16point5",
      "label": "16.5"
    },
    {
      "key": "17",
      "label": "17"
    },
    {
      "key": "17point5",
      "label": "17.5"
    },
    {
      "key": "18",
      "label": "18"
    },
    {
      "key": "18point5",
      "label": "18.5"
    },
    {
      "key": "19",
      "label": "19"
    },
    {
      "key": "19point5",
      "label": "19.5"
    },
    {
      "key": "20",
      "label": "20"
    },
    {
      "key": "20point5",
      "label": "20.5"
    },
    {
      "key": "21",
      "label": "21"
    },
    {
      "key": "21point5",
      "label": "21.5"
    },
    {
      "key": "22",
      "label": "22"
    },
    {
      "key": "22point5",
      "label": "22.5"
    },
    {
      "key": "23",
      "label": "23"
    },
    {
      "key": "23point5",
      "label": "23.5"
    },
    {
      "key": "24",
      "label": "24"
    },
    {
      "key": "24point5",
      "label": "24.5"
    },
    {
      "key": "25",
      "label": "25"
    },
    {
      "key": "25point5",
      "label": "25.5"
    },
    {
      "key": "26",
      "label": "26"
    },
    {
      "key": "26point5",
      "label": "26.5"
    },
    {
      "key": "27",
      "label": "27"
    },
    {
      "key": "27point5",
      "label": "27.5"
    },
    {
      "key": "28",
      "label": "28"
    },
    {
      "key": "28point5",
      "label": "28.5"
    },
    {
      "key": "29",
      "label": "29"
    },
    {
      "key": "29point5",
      "label": "29.5"
    },
    {
      "key": "30",
      "label": "30"
    },
    {
      "key": "30point5",
      "label": "30.5"
    },
    {
      "key": "31",
      "label": "31"
    },
    {
      "key": "31point5",
      "label": "31.5"
    },
    {
      "key": "32",
      "label": "32"
    },
    {
      "key": "32point5",
      "label": "32.5"
    },
    {
      "key": "33",
      "label": "33"
    },
    {
      "key": "33point5",
      "label": "33.5"
    },
    {
      "key": "34",
      "label": "34"
    },
    {
      "key": "34point5",
      "label": "34.5"
    },
    {
      "key": "35",
      "label": "35"
    },
    {
      "key": "35point5",
      "label": "35.5"
    },
    {
      "key": "36",
      "label": "36"
    },
    {
      "key": "36point5",
      "label": "36.5"
    },
    {
      "key": "37",
      "label": "37"
    },
    {
      "key": "37point5",
      "label": "37.5"
    },
    {
      "key": "38",
      "label": "38"
    },
    {
      "key": "38point5",
      "label": "38.5"
    },
    {
      "key": "39",
      "label": "39"
    },
    {
      "key": "39point5",
      "label": "39.5"
    },
    {
      "key": "40",
      "label": "40"
    },
    {
      "key": "40point5",
      "label": "40.5"
    },
    {
      "key": "41",
      "label": "41"
    },
    {
      "key": "41point5",
      "label": "41.5"
    },
    {
      "key": "42",
      "label": "42"
    },
    {
      "key": "42point5",
      "label": "42.5"
    },
    {
      "key": "43",
      "label": "43"
    },
    {
      "key": "43point5",
      "label": "43.5"
    },
    {
      "key": "44",
      "label": "44"
    },
    {
      "key": "44point5",
      "label": "44.5"
    },
    {
      "key": "45",
      "label": "45"
    },
    {
      "key": "45point5",
      "label": "45.5"
    },
    {
      "key": "46",
      "label": "46"
    },
    {
      "key": "46point5",
      "label": "46.5"
    },
    {
      "key": "47",
      "label": "47"
    },
    {
      "key": "47point5",
      "label": "47.5"
    },
    {
      "key": "48",
      "label": "48"
    },
    {
      "key": "48point5",
      "label": "48.5"
    },
    {
      "key": "49",
      "label": "49"
    },
    {
      "key": "49point5",
      "label": "49.5"
    },
    {
      "key": "50",
      "label": "50"
    },
    {
      "key": "tbc",
      "label": "TBC"
    }
  ],
  "baths_additional__secondary__dual_key": [
    {
      "key": "0",
      "label": "0"
    },
    {
      "key": "1",
      "label": "1"
    },
    {
      "key": "1point5",
      "label": "1.5"
    },
    {
      "key": "2",
      "label": "2"
    },
    {
      "key": "2point5",
      "label": "2.5"
    },
    {
      "key": "3",
      "label": "3"
    },
    {
      "key": "3point5",
      "label": "3.5"
    },
    {
      "key": "4",
      "label": "4"
    },
    {
      "key": "4point5",
      "label": "4.5"
    },
    {
      "key": "5",
      "label": "5"
    },
    {
      "key": "5point5",
      "label": "5.5"
    },
    {
      "key": "6",
      "label": "6"
    },
    {
      "key": "6point5",
      "label": "6.5"
    },
    {
      "key": "7",
      "label": "7"
    },
    {
      "key": "7point5",
      "label": "7.5"
    },
    {
      "key": "8",
      "label": "8"
    },
    {
      "key": "8point5",
      "label": "8.5"
    },
    {
      "key": "9",
      "label": "9"
    },
    {
      "key": "95",
      "label": "9.5"
    },
    {
      "key": "10",
      "label": "10"
    },
    {
      "key": "tbc",
      "label": "TBC"
    }
  ],
  "title": [
    {
      "key": "individual",
      "label": "Individual"
    },
    {
      "key": "torrens",
      "label": "Torrens"
    },
    {
      "key": "green",
      "label": "Green"
    },
    {
      "key": "strata",
      "label": "Strata"
    },
    {
      "key": "owners_corp_community",
      "label": "Owners Corp (Community)"
    },
    {
      "key": "community",
      "label": "Community"
    },
    {
      "key": "built_strata",
      "label": "Built Strata"
    },
    {
      "key": "survey_strata",
      "label": "Survey Strata"
    },
    {
      "key": "tbc",
      "label": "TBC"
    }
  ],
  "garage_primary": [
    {
      "key": "0",
      "label": "0"
    },
    {
      "key": "1",
      "label": "1"
    },
    {
      "key": "2",
      "label": "2"
    },
    {
      "key": "3",
      "label": "3"
    },
    {
      "key": "4",
      "label": "4"
    },
    {
      "key": "5",
      "label": "5"
    },
    {
      "key": "6",
      "label": "6"
    },
    {
      "key": "7",
      "label": "7"
    },
    {
      "key": "8",
      "label": "8"
    },
    {
      "key": "9",
      "label": "9"
    },
    {
      "key": "10",
      "label": "10"
    },
    {
      "key": "11",
      "label": "11"
    },
    {
      "key": "12",
      "label": "12"
    },
    {
      "key": "13",
      "label": "13"
    },
    {
      "key": "14",
      "label": "14"
    },
    {
      "key": "15",
      "label": "15"
    },
    {
      "key": "16",
      "label": "16"
    },
    {
      "key": "17",
      "label": "17"
    },
    {
      "key": "18",
      "label": "18"
    },
    {
      "key": "19",
      "label": "19"
    },
    {
      "key": "20",
      "label": "20"
    },
    {
      "key": "21",
      "label": "21"
    },
    {
      "key": "22",
      "label": "22"
    },
    {
      "key": "23",
      "label": "23"
    },
    {
      "key": "24",
      "label": "24"
    },
    {
      "key": "25",
      "label": "25"
    },
    {
      "key": "26",
      "label": "26"
    },
    {
      "key": "27",
      "label": "27"
    },
    {
      "key": "28",
      "label": "28"
    },
    {
      "key": "29",
      "label": "29"
    },
    {
      "key": "30",
      "label": "30"
    },
    {
      "key": "31",
      "label": "31"
    },
    {
      "key": "32",
      "label": "32"
    },
    {
      "key": "33",
      "label": "33"
    },
    {
      "key": "34",
      "label": "34"
    },
    {
      "key": "35",
      "label": "35"
    },
    {
      "key": "36",
      "label": "36"
    },
    {
      "key": "37",
      "label": "37"
    },
    {
      "key": "38",
      "label": "38"
    },
    {
      "key": "39",
      "label": "39"
    },
    {
      "key": "40",
      "label": "40"
    },
    {
      "key": "41",
      "label": "41"
    },
    {
      "key": "42",
      "label": "42"
    },
    {
      "key": "43",
      "label": "43"
    },
    {
      "key": "44",
      "label": "44"
    },
    {
      "key": "45",
      "label": "45"
    },
    {
      "key": "46",
      "label": "46"
    },
    {
      "key": "47",
      "label": "47"
    },
    {
      "key": "48",
      "label": "48"
    },
    {
      "key": "49",
      "label": "49"
    },
    {
      "key": "50",
      "label": "50"
    },
    {
      "key": "tbc",
      "label": "TBC"
    }
  ],
  "garage_additional__secondary__dual_key": [
    {
      "key": "0",
      "label": "0"
    },
    {
      "key": "1",
      "label": "1"
    },
    {
      "key": "2",
      "label": "2"
    },
    {
      "key": "3",
      "label": "3"
    },
    {
      "key": "4",
      "label": "4"
    },
    {
      "key": "5",
      "label": "5"
    },
    {
      "key": "6",
      "label": "6"
    },
    {
      "key": "7",
      "label": "7"
    },
    {
      "key": "8",
      "label": "8"
    },
    {
      "key": "9",
      "label": "9"
    },
    {
      "key": "10",
      "label": "10"
    },
    {
      "key": "tbc",
      "label": "TBC"
    }
  ],
  "carport_primary": [
    {
      "key": "0",
      "label": "0"
    },
    {
      "key": "1",
      "label": "1"
    },
    {
      "key": "2",
      "label": "2"
    },
    {
      "key": "3",
      "label": "3"
    },
    {
      "key": "4",
      "label": "4"
    },
    {
      "key": "5",
      "label": "5"
    },
    {
      "key": "6",
      "label": "6"
    },
    {
      "key": "7",
      "label": "7"
    },
    {
      "key": "8",
      "label": "8"
    },
    {
      "key": "9",
      "label": "9"
    },
    {
      "key": "10",
      "label": "10"
    },
    {
      "key": "11",
      "label": "11"
    },
    {
      "key": "12",
      "label": "12"
    },
    {
      "key": "13",
      "label": "13"
    },
    {
      "key": "14",
      "label": "14"
    },
    {
      "key": "15",
      "label": "15"
    },
    {
      "key": "16",
      "label": "16"
    },
    {
      "key": "17",
      "label": "17"
    },
    {
      "key": "18",
      "label": "18"
    },
    {
      "key": "19",
      "label": "19"
    },
    {
      "key": "20",
      "label": "20"
    },
    {
      "key": "21",
      "label": "21"
    },
    {
      "key": "22",
      "label": "22"
    },
    {
      "key": "23",
      "label": "23"
    },
    {
      "key": "24",
      "label": "24"
    },
    {
      "key": "25",
      "label": "25"
    },
    {
      "key": "26",
      "label": "26"
    },
    {
      "key": "27",
      "label": "27"
    },
    {
      "key": "28",
      "label": "28"
    },
    {
      "key": "29",
      "label": "29"
    },
    {
      "key": "30",
      "label": "30"
    },
    {
      "key": "31",
      "label": "31"
    },
    {
      "key": "32",
      "label": "32"
    },
    {
      "key": "33",
      "label": "33"
    },
    {
      "key": "34",
      "label": "34"
    },
    {
      "key": "35",
      "label": "35"
    },
    {
      "key": "36",
      "label": "36"
    },
    {
      "key": "37",
      "label": "37"
    },
    {
      "key": "38",
      "label": "38"
    },
    {
      "key": "39",
      "label": "39"
    },
    {
      "key": "40",
      "label": "40"
    },
    {
      "key": "41",
      "label": "41"
    },
    {
      "key": "42",
      "label": "42"
    },
    {
      "key": "43",
      "label": "43"
    },
    {
      "key": "44",
      "label": "44"
    },
    {
      "key": "45",
      "label": "45"
    },
    {
      "key": "46",
      "label": "46"
    },
    {
      "key": "47",
      "label": "47"
    },
    {
      "key": "48",
      "label": "48"
    },
    {
      "key": "49",
      "label": "49"
    },
    {
      "key": "50",
      "label": "50"
    },
    {
      "key": "tbc",
      "label": "TBC"
    }
  ],
  "carport_additional__secondary__dual_key": [
    {
      "key": "0",
      "label": "0"
    },
    {
      "key": "1",
      "label": "1"
    },
    {
      "key": "2",
      "label": "2"
    },
    {
      "key": "3",
      "label": "3"
    },
    {
      "key": "4",
      "label": "4"
    },
    {
      "key": "5",
      "label": "5"
    },
    {
      "key": "6",
      "label": "6"
    },
    {
      "key": "7",
      "label": "7"
    },
    {
      "key": "8",
      "label": "8"
    },
    {
      "key": "9",
      "label": "9"
    },
    {
      "key": "10",
      "label": "10"
    },
    {
      "key": "tbc",
      "label": "TBC"
    }
  ],
  "carspace_additional__secondary__dual_key": [
    {
      "key": "0",
      "label": "0"
    },
    {
      "key": "1",
      "label": "1"
    },
    {
      "key": "2",
      "label": "2"
    },
    {
      "key": "3",
      "label": "3"
    },
    {
      "key": "4",
      "label": "4"
    },
    {
      "key": "5",
      "label": "5"
    },
    {
      "key": "6",
      "label": "6"
    },
    {
      "key": "7",
      "label": "7"
    },
    {
      "key": "8",
      "label": "8"
    },
    {
      "key": "9",
      "label": "9"
    },
    {
      "key": "10",
      "label": "10"
    },
    {
      "key": "tbc",
      "label": "TBC"
    }
  ],
  "carspace_primary": [
    {
      "key": "0",
      "label": "0"
    },
    {
      "key": "1",
      "label": "1"
    },
    {
      "key": "2",
      "label": "2"
    },
    {
      "key": "3",
      "label": "3"
    },
    {
      "key": "4",
      "label": "4"
    },
    {
      "key": "5",
      "label": "5"
    },
    {
      "key": "6",
      "label": "6"
    },
    {
      "key": "7",
      "label": "7"
    },
    {
      "key": "8",
      "label": "8"
    },
    {
      "key": "9",
      "label": "9"
    },
    {
      "key": "10",
      "label": "10"
    },
    {
      "key": "11",
      "label": "11"
    },
    {
      "key": "12",
      "label": "12"
    },
    {
      "key": "13",
      "label": "13"
    },
    {
      "key": "14",
      "label": "14"
    },
    {
      "key": "15",
      "label": "15"
    },
    {
      "key": "16",
      "label": "16"
    },
    {
      "key": "17",
      "label": "17"
    },
    {
      "key": "18",
      "label": "18"
    },
    {
      "key": "19",
      "label": "19"
    },
    {
      "key": "20",
      "label": "20"
    },
    {
      "key": "21",
      "label": "21"
    },
    {
      "key": "22",
      "label": "22"
    },
    {
      "key": "23",
      "label": "23"
    },
    {
      "key": "24",
      "label": "24"
    },
    {
      "key": "25",
      "label": "25"
    },
    {
      "key": "26",
      "label": "26"
    },
    {
      "key": "27",
      "label": "27"
    },
    {
      "key": "28",
      "label": "28"
    },
    {
      "key": "29",
      "label": "29"
    },
    {
      "key": "30",
      "label": "30"
    },
    {
      "key": "31",
      "label": "31"
    },
    {
      "key": "32",
      "label": "32"
    },
    {
      "key": "33",
      "label": "33"
    },
    {
      "key": "34",
      "label": "34"
    },
    {
      "key": "35",
      "label": "35"
    },
    {
      "key": "36",
      "label": "36"
    },
    {
      "key": "37",
      "label": "37"
    },
    {
      "key": "38",
      "label": "38"
    },
    {
      "key": "39",
      "label": "39"
    },
    {
      "key": "40",
      "label": "40"
    },
    {
      "key": "41",
      "label": "41"
    },
    {
      "key": "42",
      "label": "42"
    },
    {
      "key": "43",
      "label": "43"
    },
    {
      "key": "44",
      "label": "44"
    },
    {
      "key": "45",
      "label": "45"
    },
    {
      "key": "46",
      "label": "46"
    },
    {
      "key": "47",
      "label": "47"
    },
    {
      "key": "48",
      "label": "48"
    },
    {
      "key": "49",
      "label": "49"
    },
    {
      "key": "50",
      "label": "50"
    },
    {
      "key": "51",
      "label": "51"
    },
    {
      "key": "52",
      "label": "52"
    },
    {
      "key": "53",
      "label": "53"
    },
    {
      "key": "54",
      "label": "54"
    },
    {
      "key": "55",
      "label": "55"
    },
    {
      "key": "56",
      "label": "56"
    },
    {
      "key": "57",
      "label": "57"
    },
    {
      "key": "58",
      "label": "58"
    },
    {
      "key": "59",
      "label": "59"
    },
    {
      "key": "60",
      "label": "60"
    },
    {
      "key": "tbc",
      "label": "TBC"
    }
  ],
  "flood": [
    {
      "key": "no",
      "label": "No"
    },
    {
      "key": "yes",
      "label": "Yes"
    }
  ],
  "bushfire": [
    {
      "key": "no",
      "label": "No"
    },
    {
      "key": "yes",
      "label": "Yes"
    }
  ],
  "mining": [
    {
      "key": "no",
      "label": "No"
    },
    {
      "key": "yes",
      "label": "Yes"
    }
  ],
  "other_overlay": [
    {
      "key": "no",
      "label": "No"
    },
    {
      "key": "yes",
      "label": "Yes"
    }
  ],
  "special_infrastructure": [
    {
      "key": "no",
      "label": "No"
    },
    {
      "key": "yes",
      "label": "Yes"
    }
  ],
  "due_diligence_acceptance": [
    {
      "key": "no",
      "label": "No"
    },
    {
      "key": "yes",
      "label": "Yes"
    }
  ],
  "asking": [
    {
      "key": "onmarket",
      "label": "On-market"
    },
    {
      "key": "offmarket",
      "label": "Off-market"
    },
    {
      "key": "prelaunch_opportunity",
      "label": "Pre-launch opportunity"
    },
    {
      "key": "coming_soon",
      "label": "Coming soon"
    },
    {
      "key": "tbc",
      "label": "TBC"
    }
  ],
  "status": [
    {
      "key": "01_available",
      "label": "01 Available"
    },
    {
      "key": "02_eoi",
      "label": "02 EOI"
    },
    {
      "key": "03_contr_exchanged",
      "label": "03 Contr' Exchanged"
    },
    {
      "key": "05_remove_no_interest",
      "label": "05 Remove no interest"
    },
    {
      "key": "06_remove_lost",
      "label": "06 Remove lost"
    },
    {
      "key": "07_test_record",
      "label": "07 Test Record"
    }
  ],
  "price_group": [
    {
      "key": "300__500k",
      "label": "$300 - 500k"
    },
    {
      "key": "500__700k",
      "label": "$500 - 700k"
    },
    {
      "key": "700_",
      "label": "$700 +"
    }
  ],
  "push_record_to_deal_sheet": [
    {
      "key": "yes",
      "label": "Yes"
    },
    {
      "key": "no",
      "label": "No"
    }
  ],
  "resubmit_for_testing": [
    {
      "key": "yes",
      "label": "Yes"
    },
    {
      "key": "no",
      "label": "No"
    }
  ],
  "is_parent_record": [
    {
      "key": "yes",
      "label": "Yes"
    },
    {
      "key": "no",
      "label": "No"
    }
  ],
  "occupancy_primary": [
    {
      "key": "owner_occupied",
      "label": "Owner Occupied"
    },
    {
      "key": "tenanted",
      "label": "Tenanted"
    },
    {
      "key": "vacant",
      "label": "Vacant"
    },
    {
      "key": "tbc",
      "label": "TBC"
    },
    {
      "key": "partially_tenanted",
      "label": "Partially Tenanted"
    }
  ],
  "occupancy_secondary": [
    {
      "key": "owner_occupied",
      "label": "Owner Occupied"
    },
    {
      "key": "tenanted",
      "label": "Tenanted"
    },
    {
      "key": "vacant",
      "label": "Vacant"
    },
    {
      "key": "tbc",
      "label": "TBC"
    }
  ],
  "single_or_dual_occupancy": [
    {
      "key": "single_occupancy",
      "label": "Single Occupancy"
    },
    {
      "key": "dual_occupancy",
      "label": "Dual Occupancy"
    }
  ],
  "property_type": [
    {
      "key": "established",
      "label": "Established"
    },
    {
      "key": "new",
      "label": "New"
    }
  ],
  "contract_type": [
    {
      "key": "split_contract",
      "label": "Split Contract"
    },
    {
      "key": "single_contract",
      "label": "Single Contract"
    }
  ],
  "cashback_rebate_type": [
    {
      "key": "cashback",
      "label": "Cashback"
    },
    {
      "key": "rebate",
      "label": "Rebate"
    }
  ],
  "dwelling_type": [
    {
      "key": "unit",
      "label": "Unit"
    },
    {
      "key": "townhouse",
      "label": "Townhouse"
    },
    {
      "key": "villa",
      "label": "Villa"
    },
    {
      "key": "house",
      "label": "House"
    },
    {
      "key": "dualkey",
      "label": "Dual-key"
    },
    {
      "key": "duplex",
      "label": "Duplex"
    },
    {
      "key": "multidwelling",
      "label": "Multi-dwelling"
    },
    {
      "key": "block_of_units",
      "label": "Block of Units"
    }
  ]
};

// GHL data type for each Property Review field (from the custom object schema)
export const PROPERTY_FIELD_TYPES: Record<string, string> = {
  "property_address": "TEXT",
  "deal_type": "SINGLE_OPTIONS",
  "review_date": "DATE",
  "unit__lot": "TEXT",
  "street_number": "TEXT",
  "street_name": "TEXT",
  "suburb_name": "TEXT",
  "state": "SINGLE_OPTIONS",
  "why_this_property": "LARGE_TEXT",
  "google_map": "TEXT",
  "beds_primary": "SINGLE_OPTIONS",
  "beds_additional__secondary__dual_key": "SINGLE_OPTIONS",
  "bath_primary": "SINGLE_OPTIONS",
  "baths_additional__secondary__dual_key": "SINGLE_OPTIONS",
  "land_size": "TEXT",
  "title": "SINGLE_OPTIONS",
  "body_corp__per_quarter": "TEXT",
  "garage_primary": "SINGLE_OPTIONS",
  "garage_additional__secondary__dual_key": "SINGLE_OPTIONS",
  "carport_primary": "SINGLE_OPTIONS",
  "carport_additional__secondary__dual_key": "SINGLE_OPTIONS",
  "carspace_additional__secondary__dual_key": "SINGLE_OPTIONS",
  "carspace_primary": "SINGLE_OPTIONS",
  "zoning": "TEXT",
  "flood": "SINGLE_OPTIONS",
  "bushfire": "SINGLE_OPTIONS",
  "mining": "SINGLE_OPTIONS",
  "other_overlay": "SINGLE_OPTIONS",
  "special_infrastructure": "SINGLE_OPTIONS",
  "due_diligence_acceptance": "SINGLE_OPTIONS",
  "asking": "SINGLE_OPTIONS",
  "asking_text": "TEXT",
  "accepted_acquisition_target": "TEXT",
  "current_rent_primary__per_week": "TEXT",
  "current_rent_secondary__per_week": "TEXT",
  "expiry_secondary": "TEXT",
  "expiry_primary": "TEXT",
  "yield": "TEXT",
  "appraised_yield": "TEXT",
  "proximity": "LARGE_TEXT",
  "median_price_change__3_months": "NUMERICAL",
  "median_price_change__1_year": "NUMERICAL",
  "median_price_change__3_year": "NUMERICAL",
  "median_price_change__5_year": "NUMERICAL",
  "median_yield": "NUMERICAL",
  "median_rent_change__1_year": "NUMERICAL",
  "rental_population": "NUMERICAL",
  "vacancy_rate": "NUMERICAL",
  "investment_highlights": "LARGE_TEXT",
  "status": "SINGLE_OPTIONS",
  "price_group": "SINGLE_OPTIONS",
  "acceptable_acquisition__from": "TEXT",
  "acceptable_acquisition__to": "TEXT",
  "year_built": "TEXT",
  "body_corp_description": "LARGE_TEXT",
  "flood_dialogue": "LARGE_TEXT",
  "bushfire_dialogue": "LARGE_TEXT",
  "mining_dialogie": "LARGE_TEXT",
  "other_overlay_dialogue": "LARGE_TEXT",
  "special_infrastructure_dialogue": "LARGE_TEXT",
  "comparable_sales": "LARGE_TEXT",
  "post_code": "TEXT",
  "agent_name": "TEXT",
  "agent_mobile": "TEXT",
  "agent_email": "TEXT",
  "push_record_to_deal_sheet": "CHECKBOX",
  "property_description_additional_dialogue": "LARGE_TEXT",
  "purchase_price_additional_dialogue": "LARGE_TEXT",
  "rental_assessment_additional_dialogue": "LARGE_TEXT",
  "attachments_additional_dialogue": "LARGE_TEXT",
  "message_for_ba": "LARGE_TEXT",
  "resubmit_for_testing": "SINGLE_OPTIONS",
  "packager_approved": "TEXT",
  "ba_approved": "TEXT",
  "lot_number": "TEXT",
  "project_parent_id": "TEXT",
  "is_parent_record": "SINGLE_OPTIONS",
  "project_identifier": "TEXT",
  "email_template_html": "LARGE_TEXT",
  "email_template_text": "LARGE_TEXT",
  "build_size": "TEXT",
  "land_registration": "TEXT",
  "lga": "TEXT",
  "folder_link": "TEXT",
  "land_price": "TEXT",
  "build_price": "TEXT",
  "total_price": "TEXT",
  "cashback_rebate_value": "TEXT",
  "rent_appraisal_primary_from": "TEXT",
  "rent_appraisal_primary_to": "TEXT",
  "rent_appraisal_secondary_from": "TEXT",
  "rent_appraisal_secondary_to": "TEXT",
  "project_brief": "LARGE_TEXT",
  "sourcer": "TEXT",
  "packager": "TEXT",
  "occupancy_primary": "SINGLE_OPTIONS",
  "occupancy_secondary": "SINGLE_OPTIONS",
  "single_or_dual_occupancy": "SINGLE_OPTIONS",
  "project_address": "TEXT",
  "property_type": "SINGLE_OPTIONS",
  "project_name": "TEXT",
  "market_performance_additional_dialogue": "LARGE_TEXT",
  "net_price": "NUMERICAL",
  "contract_type": "SINGLE_OPTIONS",
  "cashback_rebate_type": "SINGLE_OPTIONS",
  "closing_ba": "TEXT",
  "closing_price": "TEXT",
  "client_closed": "TEXT",
  "closing_date": "TEXT",
  "packager_email": "TEXT",
  "qa_approved": "TEXT",
  "cf_insurance_value_": "TEXT",
  "cf_councilwater_rates_": "TEXT",
  "cf_depreciation_": "TEXT",
  "dwelling_type": "SINGLE_OPTIONS",
  "subject_line": "TEXT",
  "dwelling_details": "LARGE_TEXT",
  "completion_date": "TEXT",
  "linked_opportunity_id": "TEXT"
};

// Custom object (Property Review) fields are exposed by the reporting API with
// a co_ prefix so they can never collide with opportunity fields.
export const CO_PREFIX = 'co_';

// Property Review fields the user explicitly requested for this report
// (Column A of "20260813 Property Record data and Associatred Opportunity
// Record Data info.csv"). Everything else from the custom object goes into
// the "Other Custom Object fields" section of the column chooser.
export const REQUESTED_PROPERTY_KEYS = new Set<string>([
  'property_address',
  'deal_type',
  'unit__lot',                                // Unit Number(s)
  'street_number',
  'street_name',
  'suburb_name',
  'state',
  'beds_primary',                             // Bed (Primary)
  'beds_additional__secondary__dual_key',     // Bed (Secondary)
  'bath_primary',                             // Bath (Primary)
  'baths_additional__secondary__dual_key',    // Bath (Secondary)
  'land_size',
  'title',
  'body_corp__per_quarter',                   // Body corp $ (per quarter)
  'garage_primary',
  'garage_additional__secondary__dual_key',   // Garage (Secondary)
  'carport_primary',                          // Car-port (Primary)
  'carport_additional__secondary__dual_key',  // Car-port (Secondary)
  'carspace_primary',                         // Car-space (Primary)
  'carspace_additional__secondary__dual_key', // Car-space (Secondary)
  'asking',
  'current_rent_primary__per_week',
  'current_rent_secondary__per_week',
  'expiry_primary',
  'expiry_secondary',
  'status',
  'year_built',
  'post_code',
  'agent_name',
  'agent_mobile',
  'agent_email',
  'lot_number',
  'build_size',
  'land_registration',
  'lga',
  'land_price',
  'build_price',
  'total_price',
  'cashback_rebate_value',
  'rent_appraisal_primary_from',
  'rent_appraisal_primary_to',
  'rent_appraisal_secondary_from',
  'rent_appraisal_secondary_to',
  'occupancy_primary',
  'occupancy_secondary',
  'single_or_dual_occupancy',                 // Single or Dual Occupancy?
  'project_address',
  'property_type',
  'project_name',
  'net_price',
  'contract_type',
  'cashback_rebate_type',
  'closing_ba',
  'closing_price',
  'client_closed',
  'closing_date',
  'cf_insurance_value_',                      // CF Insurance Value $
  'cf_councilwater_rates_',                   // CF Council/Water Rates $
  'dwelling_type',
  'completion_date',
]);

// Combined set of all field labels (opportunity + property). Handles the co_
// prefix used by the reporting API for custom object fields.
export function getFieldLabel(key: string): string {
  if (key.startsWith(CO_PREFIX)) {
    const coKey = key.slice(CO_PREFIX.length);
    return PROPERTY_FIELD_LABELS[coKey] ?? titleCaseKey(coKey);
  }
  return OPPORTUNITY_FIELD_LABELS[key] ?? PROPERTY_FIELD_LABELS[key] ?? titleCaseKey(key);
}

// Translate a stored Property Review option KEY to its display LABEL
// (e.g. "split_contract" -> "Split Contract"). Falls back to the raw value.
export function getPropertyOptionLabel(coFieldKey: string, value: string): string {
  if (!value) return '';
  const pairs = PROPERTY_FIELD_OPTION_PAIRS[coFieldKey];
  if (!pairs) return value;
  const match = pairs.find((p) => p.key === value || p.label === value);
  return match ? match.label : value;
}

// Which section of the column chooser a field belongs to.
export type FieldSource = 'opportunity' | 'custom-object' | 'custom-object-other';
export function getFieldSource(key: string): FieldSource {
  if (key.startsWith(CO_PREFIX)) {
    const coKey = key.slice(CO_PREFIX.length);
    return REQUESTED_PROPERTY_KEYS.has(coKey) ? 'custom-object' : 'custom-object-other';
  }
  return 'opportunity';
}

const OPPORTUNITY_FIELD_LABELS: Record<string, string> = {
  opportunityName: 'Opportunity Name',
  name: 'Name',
  registeredAddress: 'Registered Address',
  stage: 'Stage',
  pipelineName: 'Pipeline',
  assignedBA: 'Assigned BA',
  assignedTo: 'Assigned To',
  bpDueDate: 'B&P Due Date',
  bpConditionStatus: 'B&P Condition Status',
  bpNegotiationDetail: 'B&P Negotiation Detail',
  exchangeDate: 'Exchange Date',
  unconditionalDate: 'Unconditional Date',
  confirmedSettlementDate: 'Confirmed Settlement Date',
  financeDueDate: 'Finance Due Date',
  financeRequestedExtensionDate: 'Finance Requested Extension Date',
  financeExtensionStatus: 'Finance Extension Status',
  bpRequestedExtensionDate: 'B&P Requested Extension Date',
  valuationExpectedAccessDate: 'Valuation Expected Access Date',
  lastFinanceUpdateDate: 'Last Finance Update Date',
  lastConstructionUpdateDate: 'Last Construction Update Date',
  settlementDate: 'Settlement Date',
  registrationDateETA: 'Registration Date ETA',
  buildDepositIssued: 'Build Deposit Issued',
  buildDepositIssuedDate: 'Build Deposit Issued Date',
  buildDepositPaid: 'Build Deposit Paid',
  pmIntroSent: 'PM Intro Sent',
  landDepositPaid: 'Land Deposit Paid',
  typeOfProperty: 'Type of Property',
  brokerName: 'Broker Name',
  brokerCompany: 'Broker Company',
  brokerEmail: 'Broker Email',
  brokerPhone: 'Broker Phone',
  solicitorName: 'Solicitor Name',
  solicitorCompany: 'Solicitor Company',
  solicitorEmail: 'Solicitor Email',
  solicitorPhone: 'Solicitor Phone',
  personalName: 'Personal Name',
  partnerName: 'Partner Name',
  partnerEmail: 'Partner Email',
  partnerPhone: 'Partner Phone',
  smsfName: 'SMSF Name',
  trustName: 'TRUST Name',
  contactEmail: 'Contact Email',
  contactPhone: 'Contact Phone',
  contactName: 'Contact Name',
  latestStatusUpdate: 'Latest Status Update',
  agentBuilderDetails: 'Agent/Builder Details',
  briefNotes: 'Brief Notes',
  ghlLink: 'GHL Link',
  daysSinceStageChange: 'Days Since Stage Change',
  monetaryValue: 'Monetary Value',
  owner: 'Owner',
  followers: 'Followers',
  status: 'Status',
  insuranceStatus: 'Insurance Status',
  preSettlementInspectionDate: 'Pre-Settlement Inspection Date',
  preSettlementInspectionStatus: 'Pre-Settlement Inspection Status',
  bpRequested: 'B&P Requested?',
  bpExtensionStatus: 'B&P Extension Status',
  bpScheduledDate: 'B&P Scheduled Date',
  financeApprovalReceived: 'Finance Formal Approval Received',
};
