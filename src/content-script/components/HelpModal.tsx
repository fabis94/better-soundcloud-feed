import { Modal, mountModal } from "./Modal";

const HELP_MODAL_ID = "scf-help-modal";

function HelpModalContent({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Better SC Feed Help" onClose={onClose}>
      <h2>Filters</h2>

      <section class="scf-modal-section">
        <h3>Activity Types</h3>
        <p>Toggle which types of feed items to show:</p>
        <ul>
          <li>
            <strong>Tracks</strong> — original track posts
          </li>
          <li>
            <strong>Reposts</strong> — tracks reposted by people you follow
          </li>
          <li>
            <strong>Playlists</strong> — playlist posts and reposts
          </li>
        </ul>
        <p>These filter at the API level, so unchecked types are never fetched.</p>
      </section>

      <section class="scf-modal-section">
        <h3>Search</h3>
        <p>
          Search works in two modes: <strong>Simple</strong> and <strong>Extended</strong>.
        </p>

        <h4>Simple Mode</h4>
        <p>
          A single search box that matches against all fields (title, artist, genre, description,
          label).
        </p>

        <h4>Extended Mode</h4>
        <p>
          Separate inputs for each field: Title, Description, Genre, Artist, and Label. Only
          non-empty fields are used.
        </p>
      </section>

      <section class="scf-modal-section">
        <h3>Search Syntax</h3>
        <p>Both modes support the same syntax in each input:</p>
        <ul>
          <li>
            <strong>Comma-separated terms</strong> — <code>garage, house, techno</code> searches for
            three separate terms
          </li>
          <li>
            <strong>
              Exclude with <code>-</code>
            </strong>{" "}
            — <code>-remix, -edit</code> hides items matching those terms
          </li>
          <li>
            <strong>
              Wildcards with <code>*</code>
            </strong>{" "}
            — <code>epic*house</code> matches "epic deep house", "epic warehouse", etc.
          </li>
          <li>
            All matching is <strong>case-insensitive</strong>
          </li>
          <li>Empty inputs match everything</li>
        </ul>
      </section>

      <section class="scf-modal-section">
        <h3>All / Any Toggle</h3>
        <p>
          Controls how <em>include</em> terms combine:
        </p>
        <ul>
          <li>
            <strong>All</strong> (AND) — every include term must match
          </li>
          <li>
            <strong>Any</strong> (OR) — at least one include term must match
          </li>
        </ul>
        <p>Exclude terms always reject on any match, regardless of this setting.</p>
        <p>
          In <strong>Extended Mode</strong>, this also controls how non-empty fields relate to each
          other.
        </p>
      </section>

      <section class="scf-modal-section">
        <h3>Duration</h3>
        <p>
          Filter tracks by length in minutes. Set a minimum, maximum, or both. Applies only to
          tracks (not playlists).
        </p>
      </section>

      <section class="scf-modal-section">
        <h3>Actions</h3>
        <ul>
          <li>
            <strong>Apply</strong> — saves filters and applies them to next loaded pages
            (already-loaded items stay visible, page doesn't refresh)
          </li>
          <li>
            <strong>Apply &amp; Reload</strong> — saves filters and reloads the page so the very
            first page already uses the new filters
          </li>
          <li>
            <strong>Extended / Simple Mode</strong> — switches between single-input and per-field
            search
          </li>
          <li>
            <strong>Clear</strong> — resets the UI to defaults (does not auto-apply — click Apply to
            persist)
          </li>
        </ul>
      </section>

      <h2>Playback</h2>

      <section class="scf-modal-section">
        <h3>Seek Forward / Backward</h3>
        <p>
          Two buttons in the player bar that jump forward or backward in the current track by a
          configurable number of seconds (default 30).
        </p>
        <p>
          If seeking forward would land past 90% of the track, it plays the next track. If seeking
          backward would land before 10%, it plays the previous track.
        </p>
      </section>

      <section class="scf-modal-section">
        <h3>Playback Settings</h3>
        <p>Click the gear icon in the player bar to open the settings modal:</p>
        <ul>
          <li>
            <strong>Enable Seek Buttons</strong> — show or hide the seek buttons in the player bar
          </li>
          <li>
            <strong>Seconds to seek</strong> — how far each seek button jumps (1–300 seconds)
          </li>
        </ul>
        <p>
          Click <strong>Apply</strong> to save, <strong>Reset</strong> to restore defaults, or{" "}
          <strong>Cancel</strong> to discard changes.
        </p>
      </section>

      <h2>Picture-in-Picture</h2>

      <section class="scf-modal-section">
        <h3>Auto PiP</h3>
        <p>
          When you switch away from the SoundCloud tab while music is playing, a mini player window
          appears on top of all other windows.
        </p>
        <p>The PiP window includes:</p>
        <ul>
          <li>
            <strong>Track title</strong> — click to open the track page in a new tab
          </li>
          <li>
            <strong>Artist name</strong> — click to open the artist's profile
          </li>
          <li>
            <strong>Like button</strong> — heart icon next to the title, synced with SoundCloud
          </li>
          <li>
            <strong>Cover artwork</strong>
          </li>
          <li>
            <strong>Waveform</strong> — click anywhere to seek to that position
          </li>
          <li>
            <strong>Transport controls</strong> — seek backward/forward, skip prev/next, play/pause
          </li>
          <li>
            <strong>Time display</strong> — current position and total duration
          </li>
        </ul>
        <p>The PiP window closes automatically when you return to the SoundCloud tab.</p>
      </section>

      <section class="scf-modal-section">
        <h3>Browser Support</h3>
        <ul>
          <li>
            <strong>Chrome / Edge 116+</strong> — supported out of the box
          </li>
          <li>
            <strong>Firefox 148+</strong> — requires enabling <code>dom.documentpip.enabled</code>{" "}
            in <code>about:config</code>
          </li>
        </ul>
        <p>
          Toggle auto-PiP on or off in the <strong>Playback Settings</strong> dialog (gear icon). If
          your browser doesn't support Document PiP, the toggle will be disabled.
        </p>
      </section>
    </Modal>
  );
}

export function openHelpModal(): void {
  mountModal(HELP_MODAL_ID, (close) => <HelpModalContent onClose={close} />);
}
