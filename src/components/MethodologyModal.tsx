'use client';

import { useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MethodologyModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div
      id="methodology-overlay"
      className={`modal-overlay${open ? '' : ' hidden'}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <button type="button" className="modal-close" onClick={onClose}>
          ×
        </button>
        <h2 className="modal-title">Data &amp; Methodology</h2>
        <div className="modal-body">
          <div className="modal-section">
            <h3>Farm Data</h3>
            <p>
              Active farm locations and attributes sourced from the European Marine Observation and
              Data Network (EMODnet) GeoViewer.
            </p>
            <a
              href="https://emodnet.ec.europa.eu/geoviewer/#"
              target="_blank"
              rel="noopener"
            >
              emodnet.ec.europa.eu/geoviewer
            </a>
          </div>
          <div className="modal-section">
            <h3>Abandoned Farms</h3>
            <p>Abandoned farm locations compiled by OZON NGO.</p>
            <a
              href="https://docs.google.com/spreadsheets/d/11WfrxS_o7UybF34p2g2L4y8-YyI-2j7y4T1UHhUDUG8/edit?gid=667932098#gid=667932098"
              target="_blank"
              rel="noopener"
            >
              View spreadsheet
            </a>
          </div>
          <div className="modal-section">
            <h3>Protected Areas</h3>
            <p>Natura 2000 marine protected area boundaries from EMODnet GeoNetwork.</p>
            <a
              href="https://emodnet.ec.europa.eu/geonetwork/srv/eng/catalog.search#/metadata/ac911c34-1692-4642-a031-87bcb5822158"
              target="_blank"
              rel="noopener"
            >
              View metadata
            </a>
          </div>
          <div className="modal-section">
            <h3>Expansion Areas / Targets</h3>
            <p>
              Areas targeted by the Greek government for increased aquaculture development,
              sourced from Aktaia.
            </p>
            <a
              href="https://docs.google.com/spreadsheets/u/1/d/1O_5Kn_WkJXDt6vVn_Z3Mp5gKe-aPlOURf9Io8IIRTHc/edit?usp=drive_link"
              target="_blank"
              rel="noopener"
            >
              View spreadsheet
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
