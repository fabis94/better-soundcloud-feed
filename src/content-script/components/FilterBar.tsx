import { useSignal } from "@preact/signals";
import type { FilterState, SCActivityType, SearchField } from "../../shared/types";
import { SCActivityType as ActivityTypes, SearchField as SearchFields } from "../../shared/types";
import { DEFAULT_FILTERS } from "../../shared/stores/filter-store";
import type { PageUiConfig } from "../../shared/pages";
import { formatActivityType, formatSearchField } from "../feed/filter-bar";
import { ISSUES_URL, REPO_URL, APP_NAME } from "../../shared/constants";
import bugIcon from "../feed/icons/bug.svg?raw";
import brandingIcon from "../../../public/icon.svg?raw";

interface FilterBarProps {
  initialFilters: FilterState;
  storageAvailable: boolean;
  /** Per-page variant: which rows and labels to show. */
  ui: PageUiConfig;
  /** Whether the "More filters" section starts expanded (persisted by the caller). */
  initialAdvancedOpen: boolean;
  onAdvancedOpenChange: (open: boolean) => void;
  onApplyReload: (filters: FilterState) => void;
  onHelp: () => void;
}

/** "" → null; otherwise a finite number or null. */
function numberOrNull(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

const numberToInput = (n: number | null): string => (n != null ? String(n) : "");
const secondsToMinutesInput = (s: number | null): string => (s != null ? String(s / 60) : "");

export function FilterBar({
  initialFilters,
  storageAvailable,
  ui,
  initialAdvancedOpen,
  onAdvancedOpenChange,
  onApplyReload,
  onHelp,
}: FilterBarProps) {
  const advancedOpen = useSignal(initialAdvancedOpen);
  const activityTypes = useSignal<SCActivityType[]>([...initialFilters.activityTypes]);
  const searchMode = useSignal<FilterState["searchMode"]>(initialFilters.searchMode);
  const searchOperator = useSignal<FilterState["searchOperator"]>(initialFilters.searchOperator);
  const searchString = useSignal(initialFilters.searchString);
  const searchFields = useSignal<SearchField[]>([...initialFilters.searchFields]);
  const searchTitle = useSignal(initialFilters.searchTitle);
  const searchDescription = useSignal(initialFilters.searchDescription);
  const searchGenre = useSignal(initialFilters.searchGenre);
  const searchArtist = useSignal(initialFilters.searchArtist);
  const searchLabel = useSignal(initialFilters.searchLabel);
  const minDurationMinutes = useSignal(secondsToMinutesInput(initialFilters.minDurationSeconds));
  const maxDurationMinutes = useSignal(secondsToMinutesInput(initialFilters.maxDurationSeconds));
  const createdFrom = useSignal(initialFilters.createdFrom ?? "");
  const createdTo = useSignal(initialFilters.createdTo ?? "");
  const minLikes = useSignal(numberToInput(initialFilters.minLikes));
  const maxLikes = useSignal(numberToInput(initialFilters.maxLikes));
  const minPlays = useSignal(numberToInput(initialFilters.minPlays));
  const maxPlays = useSignal(numberToInput(initialFilters.maxPlays));
  const minFollowers = useSignal(numberToInput(initialFilters.minFollowers));
  const maxFollowers = useSignal(numberToInput(initialFilters.maxFollowers));

  const readFilters = (): FilterState => ({
    activityTypes: activityTypes.value,
    searchMode: searchMode.value,
    searchString: searchString.value,
    searchFields: searchFields.value,
    searchTitle: searchTitle.value,
    searchDescription: searchDescription.value,
    searchGenre: searchGenre.value,
    searchArtist: searchArtist.value,
    searchLabel: searchLabel.value,
    searchOperator: searchOperator.value,
    minDurationSeconds: minDurationMinutes.value ? parseFloat(minDurationMinutes.value) * 60 : null,
    maxDurationSeconds: maxDurationMinutes.value ? parseFloat(maxDurationMinutes.value) * 60 : null,
    createdFrom: createdFrom.value || null,
    createdTo: createdTo.value || null,
    minLikes: numberOrNull(minLikes.value),
    maxLikes: numberOrNull(maxLikes.value),
    minPlays: numberOrNull(minPlays.value),
    maxPlays: numberOrNull(maxPlays.value),
    minFollowers: numberOrNull(minFollowers.value),
    maxFollowers: numberOrNull(maxFollowers.value),
  });

  const onActivityChange = (type: SCActivityType, checked: boolean) => {
    if (checked) {
      activityTypes.value = [...activityTypes.value, type];
    } else {
      activityTypes.value = activityTypes.value.filter((t) => t !== type);
    }
  };

  const onSearchFieldChange = (field: SearchField, checked: boolean) => {
    if (checked) {
      searchFields.value = [...searchFields.value, field];
    } else {
      searchFields.value = searchFields.value.filter((f) => f !== field);
    }
  };

  const resetToDefaults = () => {
    activityTypes.value = [...DEFAULT_FILTERS.activityTypes];
    searchMode.value = DEFAULT_FILTERS.searchMode;
    searchOperator.value = DEFAULT_FILTERS.searchOperator;
    searchString.value = DEFAULT_FILTERS.searchString;
    searchFields.value = [...DEFAULT_FILTERS.searchFields];
    searchTitle.value = DEFAULT_FILTERS.searchTitle;
    searchDescription.value = DEFAULT_FILTERS.searchDescription;
    searchGenre.value = DEFAULT_FILTERS.searchGenre;
    searchArtist.value = DEFAULT_FILTERS.searchArtist;
    searchLabel.value = DEFAULT_FILTERS.searchLabel;
    minDurationMinutes.value = secondsToMinutesInput(DEFAULT_FILTERS.minDurationSeconds);
    maxDurationMinutes.value = secondsToMinutesInput(DEFAULT_FILTERS.maxDurationSeconds);
    createdFrom.value = DEFAULT_FILTERS.createdFrom ?? "";
    createdTo.value = DEFAULT_FILTERS.createdTo ?? "";
    minLikes.value = numberToInput(DEFAULT_FILTERS.minLikes);
    maxLikes.value = numberToInput(DEFAULT_FILTERS.maxLikes);
    minPlays.value = numberToInput(DEFAULT_FILTERS.minPlays);
    maxPlays.value = numberToInput(DEFAULT_FILTERS.maxPlays);
    minFollowers.value = numberToInput(DEFAULT_FILTERS.minFollowers);
    maxFollowers.value = numberToInput(DEFAULT_FILTERS.maxFollowers);
  };

  const toggleAdvanced = () => {
    advancedOpen.value = !advancedOpen.value;
    onAdvancedOpenChange(advancedOpen.value);
  };

  // Filters inside a collapsed section still apply — show how many on the toggle
  // (names only in the tooltip, so the toggle never grows into a sentence).
  const activeAdvanced: string[] = [];
  if (createdFrom.value || createdTo.value) activeAdvanced.push(ui.dateLabel);
  if (minLikes.value.trim() || maxLikes.value.trim()) activeAdvanced.push("Likes");
  if (minPlays.value.trim() || maxPlays.value.trim()) activeAdvanced.push("Plays");
  if (minFollowers.value.trim() || maxFollowers.value.trim()) activeAdvanced.push("Followers");

  const isExtended = searchMode.value === "extended";
  const allTypes = Object.values(ActivityTypes);
  const allSearchFields = Object.values(SearchFields);

  return (
    <>
      <a
        class="scf-branding"
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        title={`${APP_NAME} on GitHub`}
      >
        <span class="scf-branding-icon" dangerouslySetInnerHTML={{ __html: brandingIcon }} />
        {APP_NAME}
      </a>

      {ui.showActivityTypes && (
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
      )}

      <div class="scf-row">
        <label class="scf-label">Search:</label>
        <PillToggle
          id="scf-mode-toggle"
          dataAttr="mode"
          value={searchMode.value}
          options={[
            { value: "simple", label: "Simple" },
            { value: "extended", label: "Extended" },
          ]}
          onChange={(mode) => (searchMode.value = mode)}
        />
        <PillToggle
          id="scf-operator"
          dataAttr="op"
          value={searchOperator.value}
          options={[
            { value: "and", label: "All" },
            { value: "or", label: "Any" },
          ]}
          onChange={(op) => (searchOperator.value = op)}
        />
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
        <div
          class="scf-search-fields"
          id="scf-search-fields"
          style={{ display: isExtended ? "none" : "flex" }}
        >
          <span class="scf-ext-label">Search in</span>
          {allSearchFields.map((f) => (
            <label class="scf-check" key={f}>
              <input
                type="checkbox"
                data-search-field={f}
                checked={searchFields.value.includes(f)}
                onChange={(e) => onSearchFieldChange(f, (e.target as HTMLInputElement).checked)}
              />
              {" " + formatSearchField(f)}
            </label>
          ))}
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
            placeholder={ui.artistPlaceholder}
          />
          <ExtField
            label="Label"
            id="scf-search-label"
            value={searchLabel.value}
            onInput={(v) => (searchLabel.value = v)}
            placeholder="label filter"
          />
        </div>
      </div>

      <div class="scf-row">
        <label class="scf-label">Duration:</label>
        <NumberRange
          idPrefix="scf"
          name="duration"
          step={0.5}
          placeholder="min"
          min={minDurationMinutes.value}
          max={maxDurationMinutes.value}
          onMin={(v) => (minDurationMinutes.value = v)}
          onMax={(v) => (maxDurationMinutes.value = v)}
        />
        <span class="scf-hint">(minutes)</span>
      </div>

      <div class="scf-advanced">
        <button
          type="button"
          class="scf-advanced-toggle"
          id="scf-advanced-toggle"
          aria-expanded={advancedOpen.value}
          aria-controls="scf-advanced-body"
          onClick={toggleAdvanced}
        >
          <span class="scf-advanced-chevron" aria-hidden="true">
            {advancedOpen.value ? "\u25BE" : "\u25B8"}
          </span>
          More filters
          {!advancedOpen.value && activeAdvanced.length > 0 && (
            <span
              class="scf-advanced-count"
              title={activeAdvanced.join(", ")}
              aria-label={`${activeAdvanced.length} active`}
            >
              {activeAdvanced.length}
            </span>
          )}
        </button>
        <div
          id="scf-advanced-body"
          class="scf-advanced-body"
          style={{ display: advancedOpen.value ? "flex" : "none" }}
        >
          <div class="scf-row">
            <label class="scf-label">{ui.dateLabel}:</label>
            <label class="scf-sublabel">From</label>
            <input
              type="date"
              class="scf-input scf-input-date"
              id="scf-date-from"
              value={createdFrom.value}
              onInput={(e) => (createdFrom.value = (e.target as HTMLInputElement).value)}
            />
            <label class="scf-sublabel">To</label>
            <input
              type="date"
              class="scf-input scf-input-date"
              id="scf-date-to"
              value={createdTo.value}
              onInput={(e) => (createdTo.value = (e.target as HTMLInputElement).value)}
            />
          </div>

          <div class="scf-row">
            <label class="scf-label">Likes:</label>
            <NumberRange
              idPrefix="scf"
              name="likes"
              step={1}
              placeholder="any"
              min={minLikes.value}
              max={maxLikes.value}
              onMin={(v) => (minLikes.value = v)}
              onMax={(v) => (maxLikes.value = v)}
            />
          </div>

          <div class="scf-row">
            <label class="scf-label">Plays:</label>
            <NumberRange
              idPrefix="scf"
              name="plays"
              step={1}
              placeholder="any"
              min={minPlays.value}
              max={maxPlays.value}
              onMin={(v) => (minPlays.value = v)}
              onMax={(v) => (maxPlays.value = v)}
            />
          </div>

          <div class="scf-row">
            <label class="scf-label">Followers:</label>
            <NumberRange
              idPrefix="scf"
              name="followers"
              step={1}
              placeholder="any"
              min={minFollowers.value}
              max={maxFollowers.value}
              onMin={(v) => (minFollowers.value = v)}
              onMax={(v) => (maxFollowers.value = v)}
            />
          </div>
        </div>
      </div>

      <div class="scf-actions">
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

/** Two-option segmented toggle (`.scf-pill`); each button is tagged `data-<dataAttr>=<value>`. */
function PillToggle<T extends string>({
  id,
  dataAttr,
  value,
  options,
  onChange,
}: {
  id: string;
  dataAttr: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div class="scf-pill" id={id}>
      {options.map((opt) => (
        <button
          type="button"
          key={opt.value}
          class={`scf-pill-btn${value === opt.value ? " scf-pill-active" : ""}`}
          {...{ [`data-${dataAttr}`]: opt.value }}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Min/Max pair of number inputs with ids `<idPrefix>-min-<name>` / `<idPrefix>-max-<name>`. */
function NumberRange({
  idPrefix,
  name,
  step,
  placeholder,
  min,
  max,
  onMin,
  onMax,
}: {
  idPrefix: string;
  name: string;
  step: number;
  placeholder: string;
  min: string;
  max: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
}) {
  return (
    <>
      <label class="scf-sublabel">Min</label>
      <input
        type="number"
        class="scf-input scf-input-small"
        id={`${idPrefix}-min-${name}`}
        placeholder={placeholder}
        min={0}
        step={step}
        value={min}
        onInput={(e) => onMin((e.target as HTMLInputElement).value)}
      />
      <label class="scf-sublabel">Max</label>
      <input
        type="number"
        class="scf-input scf-input-small"
        id={`${idPrefix}-max-${name}`}
        placeholder={placeholder}
        min={0}
        step={step}
        value={max}
        onInput={(e) => onMax((e.target as HTMLInputElement).value)}
      />
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
