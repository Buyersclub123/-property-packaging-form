'use client';

// Mock of how a BA actually reaches the EOI composer in the real build:
//   deal sheet row -> set status to 02 EOI -> link modal (existing, built) ->
//   NEW prompt: "Send the EOI now?"
// Nothing here touches real data — it is a scripted walkthrough for the pitch.

import { useState } from 'react';

interface FlowDemoProps {
  address: string;
  client: string;
  ba: string;
  price: string;
  onSendEoi: () => void;
  onClose: () => void;
}

export default function FlowDemo({
  address,
  client,
  ba,
  price,
  onSendEoi,
  onClose,
}: FlowDemoProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const panel =
    'bg-white rounded-lg shadow-xl w-[620px] max-w-full border border-gray-300';
  const label = 'text-[10px] font-semibold text-gray-500 uppercase tracking-wide';
  const box = 'px-2 py-1 text-xs rounded border border-gray-300 bg-gray-50';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4">
      <div className={panel}>
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">How the BA gets here</div>
            <div className="text-[11px] text-gray-500">
              Step {step} of 3 — the first two already exist today
            </div>
          </div>
          <button onClick={onClose} className="text-xs text-gray-500">
            Close
          </button>
        </div>

        {step === 1 && (
          <div className="px-4 py-4 text-xs">
            <div className="mb-2 text-gray-600">
              On the deal sheet the BA changes the property status. This is unchanged from what
              they do today.
            </div>
            <div className="rounded border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-[1fr_150px] text-[11px] bg-gray-100 font-semibold">
                <div className="px-2 py-1">Property Address</div>
                <div className="px-2 py-1">Status</div>
              </div>
              <div className="grid grid-cols-[1fr_150px] text-[11px] items-center">
                <div className="px-2 py-2 truncate">{address}</div>
                <div className="px-2 py-2">
                  <span className="px-1.5 py-0.5 rounded bg-yellow-200 text-yellow-900 font-semibold">
                    02 EOI
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-gray-500">
              Setting the status to <strong>02 EOI</strong> automatically opens the client link
              window.
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-blue-600 text-white"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="px-4 py-4 text-xs">
            <div className="mb-2 text-gray-600">
              The BA links the client — or marks it speculative if there isn&apos;t one yet. This
              screen is <strong>already built and in production</strong>.
            </div>
            <div className="rounded border border-gray-300 p-3 space-y-2 bg-gray-50">
              <div className="grid grid-cols-[110px_1fr] gap-2 items-center">
                <span className={label}>Client</span>
                <span className={box}>{client || 'SPECULATIVE EOI'}</span>
                <span className={label}>Assigned BA</span>
                <span className={box}>{ba || '—'}</span>
                <span className={label}>Close $</span>
                <span className={box}>{price || '—'}</span>
                <span className={label}>Close date</span>
                <span className={box}>{new Date().toLocaleDateString('en-AU')}</span>
              </div>
            </div>
            <div className="mt-4 flex justify-between">
              <button onClick={() => setStep(1)} className="text-[11px] underline text-gray-600">
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-blue-600 text-white"
              >
                Confirm changes
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="px-4 py-4 text-xs">
            <div className="rounded border-2 border-emerald-500 bg-emerald-50 p-4 text-center">
              <div className="text-sm font-semibold mb-1">EOI details saved.</div>
              <div className="text-gray-700 mb-3">
                Send the EOI to the selling agent now?
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={onSendEoi}
                  className="px-4 py-2 rounded text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Send EOI →
                </button>
                <button onClick={onClose} className="px-4 py-2 rounded text-xs font-semibold bg-gray-200">
                  Not yet
                </button>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-gray-500">
              <strong>This prompt is the only new step.</strong> Everything the EOI needs was just
              entered, so choosing Send opens the composer already filled in. Choosing
              &quot;Not yet&quot; leaves a Send EOI button on the row for later.
            </div>
            <div className="mt-4 flex justify-start">
              <button onClick={() => setStep(2)} className="text-[11px] underline text-gray-600">
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
