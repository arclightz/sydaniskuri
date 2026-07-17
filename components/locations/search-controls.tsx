import { Search, SlidersHorizontal, X } from "lucide-react";

export type SearchFilterState = {
  query: string;
  openNow: boolean;
  alwaysOpen: boolean;
  locationType: string;
};

export function SearchControls({
  filters,
  locationTypes,
  onChange,
  onClear,
}: {
  filters: SearchFilterState;
  locationTypes: string[];
  onChange: (filters: SearchFilterState) => void;
  onClear: () => void;
}) {
  return (
    <section className="search-controls" aria-label="Haku ja suodattimet">
      <label className="search-field">
        <Search aria-hidden="true" size={20} />
        <span className="sr-only">Hae osoitteella, kaupungilla tai nimellä</span>
        <input
          type="search"
          role="searchbox"
          value={filters.query}
          placeholder="Osoite, kaupunki tai kohteen nimi"
          onChange={(event) => onChange({ ...filters, query: event.target.value })}
        />
      </label>
      <div className="filter-heading"><SlidersHorizontal aria-hidden="true" size={18} /><span>Rajaa tuloksia</span></div>
      <div className="filter-row">
        <label className="check-control">
          <input type="checkbox" checked={filters.openNow} onChange={(event) => onChange({ ...filters, openNow: event.target.checked })} />
          <span>Avoinna nyt</span>
        </label>
        <label className="check-control">
          <input type="checkbox" checked={filters.alwaysOpen} onChange={(event) => onChange({ ...filters, alwaysOpen: event.target.checked })} />
          <span>Avoinna 24/7</span>
        </label>
      </div>
      <label className="select-control">
        <span>Paikkatyyppi</span>
        <select aria-label="Paikkatyyppi" value={filters.locationType} onChange={(event) => onChange({ ...filters, locationType: event.target.value })}>
          <option value="">Kaikki paikkatyypit</option>
          {locationTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </label>
      <button className="text-button" type="button" onClick={onClear}>
        <X aria-hidden="true" size={17} /> Tyhjennä suodattimet
      </button>
    </section>
  );
}
