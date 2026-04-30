'use client';

import type { Farm, Filters as FiltersType, GeoData } from '@/lib/types';
import { Filters } from './Filters';
import { FarmList } from './FarmList';

interface Props {
  open: boolean;
  activeTab: 'map' | 'table';
  data: GeoData | null;
  allFarms: Farm[];
  filteredFarms: Farm[];
  categories: string[];
  filters: FiltersType;
  activeFarmId: string | null;
  onTabChange: (tab: 'map' | 'table') => void;
  onFiltersChange: (patch: Partial<FiltersType>) => void;
  onClearFilters: () => void;
  onSelectFarm: (farm: Farm) => void;
  onOpenMethodology: () => void;
}

export function Sidebar({
  open,
  activeTab,
  data,
  allFarms,
  filteredFarms,
  categories,
  filters,
  activeFarmId,
  onTabChange,
  onFiltersChange,
  onClearFilters,
  onSelectFarm,
  onOpenMethodology,
}: Props) {
  const finfishCount = data?.finfish.features.length ?? 0;
  const shellfishCount = data?.shellfish.features.length ?? 0;
  const abandonedCount = data?.abandoned.features.length ?? 0;

  return (
    <div id="sidebar" className={open ? 'open' : ''}>
      <div className="sidebar-header">
        <h1>GREECE</h1>
        <p className="subtitle">Aquaculture Database</p>
        <button
          type="button"
          className="methodology-btn"
          aria-label="Methodology"
          onClick={onOpenMethodology}
        >
          Data &amp; Methodology
        </button>
        <div className="stats">
          <div className="stat">
            <span className="stat-number">{allFarms.length}</span>
            <span className="stat-label">Total Farms</span>
          </div>
          <div className="stat">
            <span className="stat-number">{finfishCount}</span>
            <span className="stat-label">
              Fed{' '}
              <span className="stat-label-nowrap">
                Farms
                <span
                  className="legend-info legend-info-left"
                  data-tip="Carnivorous or omnivorous species (e.g. sea bass, sea bream) that, when farmed, are often fed fishmeal reduced from wild-caught fish"
                >
                  &#9432;
                </span>
              </span>
            </span>
          </div>
          <div className="stat">
            <span className="stat-number">{shellfishCount}</span>
            <span className="stat-label">
              Non-fed{' '}
              <span className="stat-label-nowrap">
                Farms
                <span
                  className="legend-info"
                  data-tip="Filter feeders (e.g. mussels) that consume naturally occurring algae and plankton"
                >
                  &#9432;
                </span>
              </span>
            </span>
          </div>
          <div className="stat">
            <span className="stat-number">{abandonedCount}</span>
            <span className="stat-label">
              Abandoned{' '}
              <span className="stat-label-nowrap">
                Farms
                <span
                  className="legend-info legend-info-right"
                  data-tip="Abandoned cages, nets, and moorings degrade into microplastics, entangle marine life, and leach chemical additives long after operations cease, hampering coastal ecosystem recovery."
                >
                  &#9432;
                </span>
              </span>
            </span>
          </div>
        </div>
      </div>
      <div className="tab-bar">
        <button
          type="button"
          className={`tab-btn${activeTab === 'map' ? ' active' : ''}`}
          onClick={() => onTabChange('map')}
        >
          Map
        </button>
        <button
          type="button"
          className={`tab-btn${activeTab === 'table' ? ' active' : ''}`}
          onClick={() => onTabChange('table')}
        >
          Table
        </button>
      </div>
      <div id="sidebar-filters" style={{ display: activeTab === 'map' ? undefined : 'none' }}>
        <Filters
          filters={filters}
          onFiltersChange={onFiltersChange}
          onClear={onClearFilters}
          resultsCount={filteredFarms.length}
          categories={categories}
        />
        <FarmList farms={filteredFarms} activeId={activeFarmId} onSelect={onSelectFarm} />
      </div>
    </div>
  );
}
