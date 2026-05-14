import { useSignal } from "@preact/signals";
import type { FilterState, SCActivityType } from "../../shared/types";
import { SCActivityType as ActivityTypes } from "../../shared/types";
import { DEFAULT_FILTERS } from "../../shared/stores/filter-store";
import { formatActivityType } from "../feed/filter-bar";
import { ISSUES_URL } from "../../shared/constants";
import bugIcon from "../feed/icons/bug.svg?raw";

interface FilterBarProps {
  initialFilters: FilterState;
  storageAvailable: boolean;
  onApply: (filters: FilterState) => void;
  onApplyReload: (filters: FilterState) => void;
  onHelp: () => void;
}

export function FilterBar({
  initialFilters,
  storageAvailable,
  onApply,
  onApplyReload,
  onHelp,
}: FilterBarProps) {
  const activityTypes = useSignal<SCActivityType[]>([...initialFilters.activityTypes]);
  const searchMode = useSignal<FilterState["searchMode"]>(initialFilters.searchMode);
  const searchOperator = useSignal<FilterState["searchOperator"]>(initialFilters.searchOperator);
  const searchString = useSignal(initialFilters.searchString);
  const searchTitle = useSignal(initialFilters.searchTitle);
  const searchDescription = useSignal(initialFilters.searchDescription);
  const searchGenre = useSignal(initialFilters.searchGenre);
  const searchArtist = useSignal(initialFilters.searchArtist);
  const searchLabel = useSignal(initialFilters.searchLabel);
  const minDurationMinutes = useSignal(
    initialFilters.minDurationSeconds != null ? String(initialFilters.minDurationSeconds / 60) : "",
  );
  const maxDurationMinutes = useSignal(
    initialFilters.maxDurationSeconds != null ? String(initialFilters.maxDurationSeconds / 60) : "",
  );

  const readFilters = (): FilterState => ({
    activityTypes: activityTypes.value,
    searchMode: searchMode.value,
    searchString: searchString.value,
    searchTitle: searchTitle.value,
    searchDescription: searchDescription.value,
    searchGenre: searchGenre.value,
    searchArtist: searchArtist.value,
    searchLabel: searchLabel.value,
    searchOperator: searchOperator.value,
    minDurationSeconds: minDurationMinutes.value ? parseFloat(minDurationMinutes.value) * 60 : null,
    maxDurationSeconds: maxDurationMinutes.value ? parseFloat(maxDurationMinutes.value) * 60 : null,
  });

  const onActivityChange = (type: SCActivityType, checked: boolean) => {
    if (checked) {
      activityTypes.value = [...activityTypes.value, type];
    } else {
      activityTypes.value = activityTypes.value.filter((t) => t !== type);
    }
  };

  const resetToDefaults = () => {
    activityTypes.value = [...DEFAULT_FILTERS.activityTypes];
    searchMode.value = DEFAULT_FILTERS.searchMode;
    searchOperator.value = DEFAULT_FILTERS.searchOperator;
    searchString.value = DEFAULT_FILTERS.searchString;
    searchTitle.value = DEFAULT_FILTERS.searchTitle;
    searchDescription.value = DEFAULT_FILTERS.searchDescription;
    searchGenre.value = DEFAULT_FILTERS.searchGenre;
    searchArtist.value = DEFAULT_FILTERS.searchArtist;
    searchLabel.value = DEFAULT_FILTERS.searchLabel;
    minDurationMinutes.value =
      DEFAULT_FILTERS.minDurationSeconds != null
        ? String(DEFAULT_FILTERS.minDurationSeconds / 60)
        : "";
    maxDurationMinutes.value =
      DEFAULT_FILTERS.maxDurationSeconds != null
        ? String(DEFAULT_FILTERS.maxDurationSeconds / 60)
        : "";
  };

  const isExtended = searchMode.value === "extended";
  const allTypes = Object.values(ActivityTypes);

  return (
    <>
      <div class="scf-row">
        <label class="scf-label">Show:</label>
        {allTypes.map((t) => (
          <label class="scf-check" key={t}>
            <input
              type="checkbox"
              data-activity={t}
              checked={activityTypes.value.includes(t)}
              onChange={(e) => onActivityChange(t, (e.target as HTMLInputElement).checked)}
            />
            {" " + formatActivityType(t)}
          </label>
        ))}
      </div>

      <div class="scf-row">
        <label class="scf-label">Search:</label>
        <div class="scf-pill" id="scf-operator">
          <button
            type="button"
            class={`scf-pill-btn${searchOperator.value === "and" ? " scf-pill-active" : ""}`}
            data-op="and"
            onClick={() => (searchOperator.value = "and")}
          >
            All
          </button>
          <button
            type="button"
            class={`scf-pill-btn${searchOperator.value === "or" ? " scf-pill-active" : ""}`}
            data-op="or"
            onClick={() => (searchOperator.value = "or")}
          >
            Any
          </button>
        </div>
        <div class="scf-search-simple" style={{ display: isExtended ? "none" : "flex" }}>
          <input
            type="text"
            class="scf-input"
            id="scf-search"
            placeholder="comma-separated, -exclude, wild*card"
            value={searchString.value}
            onInput={(e) => (searchString.value = (e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="scf-search-extended" style={{ display: isExtended ? "flex" : "none" }}>
          <ExtField
            label="Title"
            id="scf-search-title"
            value={searchTitle.value}
            onInput={(v) => (searchTitle.value = v)}
            placeholder="title filter"
          />
          <ExtField
            label="Description"
            id="scf-search-desc"
            value={searchDescription.value}
            onInput={(v) => (searchDescription.value = v)}
            placeholder="description filter"
          />
          <ExtField
            label="Genre"
            id="scf-search-genre"
            value={searchGenre.value}
            onInput={(v) => (searchGenre.value = v)}
            placeholder="genre filter"
          />
          <ExtField
            label="Artist"
            id="scf-search-artist"
            value={searchArtist.value}
            onInput={(v) => (searchArtist.value = v)}
            placeholder="artist/reposter filter"
          />
          <ExtField
            label="Label"
            id="scf-search-label"
            value={searchLabel.value}
            onInput={(v) => (searchLabel.value = v)}
            placeholder="label/publisher filter"
          />
        </div>
      </div>

      <div class="scf-row">
        <label class="scf-label">Duration:</label>
        <label class="scf-duration-label">Min</label>
        <input
          type="number"
          class="scf-input scf-input-small"
          id="scf-min-duration"
          placeholder="min"
          min={0}
          step={0.5}
          value={minDurationMinutes.value}
          onInput={(e) => (minDurationMinutes.value = (e.target as HTMLInputElement).value)}
        />
        <label class="scf-duration-label">Max</label>
        <input
          type="number"
          class="scf-input scf-input-small"
          id="scf-max-duration"
          placeholder="min"
          min={0}
          step={0.5}
          value={maxDurationMinutes.value}
          onInput={(e) => (maxDurationMinutes.value = (e.target as HTMLInputElement).value)}
        />
        <span class="scf-hint">(minutes)</span>
      </div>

      <div class="scf-actions">
        <button
          type="button"
          class="scf-btn scf-btn-primary"
          id="scf-apply"
          onClick={() => onApply(readFilters())}
        >
          Apply
        </button>
        <button
          type="button"
          class="scf-btn scf-btn-primary"
          id="scf-apply-reload"
          disabled={!storageAvailable}
          title={
            !storageAvailable
              ? "localStorage is blocked — filters cannot persist across reloads"
              : undefined
          }
          onClick={() => onApplyReload(readFilters())}
        >
          Apply &amp; Reload
        </button>
        <button
          type="button"
          class="scf-btn scf-btn-secondary"
          id="scf-mode-toggle"
          onClick={() => (searchMode.value = isExtended ? "simple" : "extended")}
        >
          {isExtended ? "Simple Mode" : "Extended Mode"}
        </button>
        <button
          type="button"
          class="scf-btn scf-btn-secondary"
          id="scf-clear"
          onClick={resetToDefaults}
        >
          Clear
        </button>
        <button
          type="button"
          class="scf-btn scf-btn-help"
          id="scf-help"
          aria-label="Help"
          onClick={onHelp}
        >
          ?
        </button>
        <button
          type="button"
          class="scf-btn scf-btn-feedback"
          id="scf-feedback"
          aria-label="Report a bug or send feedback"
          title="Report a bug or send feedback"
          onClick={() => window.open(ISSUES_URL, "_blank", "noopener,noreferrer")}
          dangerouslySetInnerHTML={{ __html: bugIcon }}
        />
      </div>
    </>
  );
}

function ExtField({
  label,
  id,
  value,
  onInput,
  placeholder,
}: {
  label: string;
  id: string;
  value: string;
  onInput: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div class="scf-ext-row">
      <label class="scf-ext-label">{label}</label>
      <input
        type="text"
        class="scf-input"
        id={id}
        placeholder={placeholder}
        value={value}
        onInput={(e) => onInput((e.target as HTMLInputElement).value)}
      />
    </div>
  );
}
