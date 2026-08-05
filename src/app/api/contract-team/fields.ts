// Fields that are array-type (checkboxes) in GHL — need special parsing
export const ARRAY_FIELDS = new Set([
  'lI4xRPFaeTDbXhiGIUFN', // B&P Requested?
  'Bnw4HsJmQKftLhEuo5VS', // Registration
  'KaDnA48WSWgbYKtl3oPx', // Finance Formal Approval Received
  'V0dIHoJT8xQDYtMVbZi5', // Land Deposit Paid
  'Qtu3Zhuno1RUQziNmfNw', // Build Deposit Issued
  'z46PLoTif5bLLyVNeL13', // Build Deposit Paid
  'V88m80BD2yiweCdXwOs2', // PM Intro Sent
]);

// Custom field ID → friendly name mapping for GHL Opportunities
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
};

// Reverse map: friendly name → field ID
export const FRIENDLY_TO_FIELD_ID: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_MAP).map(([id, name]) => [name, id])
);
