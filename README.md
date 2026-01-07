# Property Packaging Form

Multi-step property packaging form with intelligent workflow, Stash API integration, and Google Sheets integration.

## Features

- Multi-step workflow (Step 0-7)
- Stash Property API integration (risk overlays, zoning, LGA)
- Google Sheets integration (Market Performance, Investment Highlights)
- ChatGPT automation (Why this property?, Proximity)
- Form state persistence (save/resume)
- Error handling and validation
- Dynamic field visibility based on property type

## Tech Stack

- **Framework:** Next.js 14 with React
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Form Handling:** React Hook Form + Zod
- **State Management:** Zustand
- **HTTP Client:** Axios

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_STASH_WEBHOOK_URL=https://hook.eu1.make.com/gsova3xd6kwrckiw3j5js2twfgu1i885
```

## Project Structure

```
form-app/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   ├── lib/              # Utilities and integrations
│   ├── store/            # Zustand state management
│   ├── types/            # TypeScript types
│   └── styles/           # Global styles
├── public/               # Static assets
└── docs/                 # Documentation
```

## Workflow Steps

1. **Step 0:** Decision Tree (New/Established, Contract Type, Individual/Multiple Lots)
2. **Step 1:** Address Entry & Geocoding
3. **Step 2:** Stash Risk Overlay Check
4. **Step 2.5:** Packaging Confirmation
5. **Step 3:** Comparables Check (Manual)
6. **Step 4:** Market Performance Data Check
7. **Step 5:** Data Collection Forms (if needed)
8. **Step 6:** Property Details Form
9. **Step 7:** Review & Submit

## Integration Points

- **Stash Property API:** Risk overlays, zoning, LGA
- **Google Sheets:** Market Performance, Investment Highlights, Property Log
- **ChatGPT API:** Property summaries, proximity information
- **GHL API:** Custom object write, Deal Sheet sync







