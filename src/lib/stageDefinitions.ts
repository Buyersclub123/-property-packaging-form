// Plain-language meaning of each stage from Deal Closed to Settled (04. PROPERTY TEAM Pipeline), as agreed with JT 16/11/2026.
// Shown behind an (i) wherever a stage name appears (Pipeline Journey tiles, CTRT Stage header). One source for the text.
// Text is wrapped in **bold** for the key words (stage and field names) - rendered by renderStageText / the Journey card.

export interface StageDefinition {
  stage: string;
  definition: string;
  /** Each entry: optional bold lead-in (e.g. "Established:") then the text. */
  change: { lead?: string; text: string }[];
}

export const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    stage: 'EOI submitted',
    definition: 'An Expression of Interest has been sent on a property for this client. The Opportunity stays in its Proposals price band; the EOI is tracked on the Property Record in the Deal Sheet (status "**02 EOI**"). Sent = awaiting the vendor; Accepted = vendor has agreed the price.',
    change: [{ text: 'Once the vendor accepts, the Opportunity is moved to "**Deal Closed**". An accepted EOI still sitting here is shown in red.' }],
  },
  {
    stage: 'Deal Closed',
    definition: 'The vendor has accepted the offer on the property, and the contract has not been received yet.',
    change: [{ text: 'Once the contract is received, the Opportunity moves to "**Contract Review**".' }],
  },
  {
    stage: 'Contract Review',
    definition: "Contract received. Review is underway and the client's questions are being answered.",
    change: [{ text: 'Opportunity moves to "**Exchange WIP**" once the review is complete, all questions are answered and the contract has been sent for signing.' }],
  },
  {
    stage: 'Exchange WIP',
    definition: 'Contract sent for signing. Waiting on all parties to sign.',
    change: [{ text: 'Once all signatures are received, the Opportunity moves to "**Conditional**" if any clauses are outstanding, or to "**Unconditional**" if there are none.' }],
  },
  {
    stage: 'Conditional',
    definition: 'Contract fully signed, with one or more clauses not yet satisfied (e.g. finance approval, building & pest).',
    change: [{ text: 'Once all clauses are satisfied, the Opportunity moves to "**Unconditional**".' }],
  },
  {
    stage: 'Unconditional',
    definition: 'Contract fully signed, with all clauses satisfied.',
    change: [
      { lead: 'Established:', text: 'Moves to "**Settled**" once settlement is confirmed (the "**Settlement Confirmed**" box is ticked).' },
      { lead: 'New, single contract:', text: 'Moves to "**Settled**" once settlement is confirmed (the "**Settlement Confirmed**" box is ticked).' },
      {
        lead: 'New, split contract:',
        text: 'Stays in "**Unconditional**" after the land settles (the "**Settlement Confirmed**" box is ticked). The system then sets the "**Construction Status**" dropdown to "**Pre-BA**", and the dropdown is updated as construction moves through each stage.\nOnce "**Construction Status**" is set to "**Handover**", the Opportunity moves to "**Settled**".',
      },
    ],
  },
  {
    stage: 'Settled',
    definition: 'Final stage. For Established and New single contracts, the property has settled. For New split contracts, the build has been handed over.',
    change: [],
  },
];

export const stageDefinition = (stage: string): StageDefinition | undefined =>
  STAGE_DEFINITIONS.find((d) => d.stage.toLowerCase() === stage.trim().toLowerCase());

/** Split "**bold**" markup into segments for rendering. */
export const boldSegments = (text: string): { bold: boolean; text: string }[] =>
  text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((s) => (s.startsWith('**') ? { bold: true, text: s.slice(2, -2) } : { bold: false, text: s }));
