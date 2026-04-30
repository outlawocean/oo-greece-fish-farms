'use client';

import type { LayerToggles } from '@/lib/types';

interface Props {
  toggles: LayerToggles;
  onToggle: (key: keyof LayerToggles) => void;
}

export function Legend({ toggles, onToggle }: Props) {
  return (
    <div id="legend">
      <div
        className={`legend-item legend-toggle${toggles.finfish ? '' : ' off'}`}
        id="toggle-finfish"
        onClick={() => onToggle('finfish')}
      >
        <span className="legend-icon finfish-icon"></span> Fed
        <span
          className="legend-info legend-info-left"
          data-tip="Carnivorous or omnivorous species (e.g. sea bass, sea bream) that, when farmed, are often fed fishmeal reduced from wild-caught fish"
          onClick={(e) => e.stopPropagation()}
        >
          &#9432;
        </span>
      </div>
      <div
        className={`legend-item legend-toggle${toggles.shellfish ? '' : ' off'}`}
        id="toggle-shellfish"
        onClick={() => onToggle('shellfish')}
      >
        <span className="legend-icon shellfish-icon"></span> Non-fed
        <span
          className="legend-info"
          data-tip="Filter feeders (e.g. mussels) that consume naturally occurring algae and plankton"
          onClick={(e) => e.stopPropagation()}
        >
          &#9432;
        </span>
      </div>
      <div
        className={`legend-item legend-toggle${toggles.abandoned ? '' : ' off'}`}
        id="toggle-abandoned"
        onClick={() => onToggle('abandoned')}
      >
        <span className="legend-icon abandoned-icon"></span> Abandoned Farms
        <span
          className="legend-info"
          data-tip="Abandoned cages, nets, and moorings degrade into microplastics, entangle marine life, and leach chemical additives into the water."
          onClick={(e) => e.stopPropagation()}
        >
          &#9432;
        </span>
      </div>
      <div
        className={`legend-item legend-toggle${toggles.poay ? '' : ' off'}`}
        id="toggle-poay"
        onClick={() => onToggle('poay')}
      >
        <span className="legend-icon poay-icon"></span> Expansion Targets
        <span
          className="legend-info"
          data-tip="Areas targeted by the Greek government for increased fish farming"
          onClick={(e) => e.stopPropagation()}
        >
          &#9432;
        </span>
      </div>
      <div
        className={`legend-item legend-toggle${toggles.natura2000 ? '' : ' off'}`}
        id="toggle-natura2000"
        onClick={() => onToggle('natura2000')}
      >
        <span className="legend-icon natura2000-icon"></span> Protected Areas
        <span
          className="legend-info"
          data-tip="Marine areas protected under EU law to conserve wildlife and natural habitats"
          onClick={(e) => e.stopPropagation()}
        >
          &#9432;
        </span>
      </div>
    </div>
  );
}
