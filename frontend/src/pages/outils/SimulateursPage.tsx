import { useState } from 'react';
import './SimulateursPage.css';
import CreditTab from './CreditTab';
import CapitalisationTab from './CapitalisationTab';
import RendementLocatifTab from './RendementLocatifTab';
import IRPPTab from './IRPPTab';
import IFITab from './IFITab';

const TABS = [
  { id: 'credit', label: '🏠 Crédit immobilier' },
  { id: 'capi', label: '📈 Capitalisation' },
  { id: 'locatif', label: '🏢 Rendement locatif' },
  { id: 'irpp', label: '🧾 IRPP' },
  { id: 'ifi', label: '🏛 IFI' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function SimulateursPage() {
  const [activeTab, setActiveTab] = useState<TabId>('credit');

  return (
    <div className="page-content">
      <div className="card" style={{ padding: 0 }}>
        <div
          style={{
            display: 'flex',
            borderBottom: '2px solid var(--border)',
            padding: '0 20px',
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`sim-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>
          {activeTab === 'credit' && <CreditTab />}
          {activeTab === 'capi' && <CapitalisationTab />}
          {activeTab === 'locatif' && <RendementLocatifTab />}
          {activeTab === 'irpp' && <IRPPTab />}
          {activeTab === 'ifi' && <IFITab />}
        </div>
      </div>
    </div>
  );
}
