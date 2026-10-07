# SafMove Admin Board: Passcode Verification Fix & Dynamic Hub Management

Implementation blueprint for fixing master passcode updates, instant default restoration, renaming the overview tab to "Metrics", and introducing interactive Hub Management with full metric and dispatch grid recalculation across Greater Accra.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> - **Confirmed Placement**: The Hub Management panel will be rendered as a dedicated, high-visibility management card situated directly above the regional dispatch grid inside the Metrics tab.
> - **State & Persistence**: Custom hubs (added/renamed/deleted) will be managed in dynamic state and synchronized to `localStorage` (`safmove_admin_custom_hubs`) with a one-click "Reset Hubs to Default" safety trigger.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. Fixes the master passcode update handler in `AdminPortal` so current passcode verification cleanly resolves against both the active local storage passcode and in-memory state without spurious mismatch errors, and enables instantaneous password resets via "Restore Default (safmove2026)".
  2. Renames the "Accra Metrics" tab label to "Metrics".
  3. Equips dispatchers and administrators with an interactive **Hub Manager** to add new operational hubs, rename existing areas inline, delete unused corridors, and switch the active filter to dynamically recalculate ride volumes, gross GHS revenue, driver density, and regional corridor dispatch cards.
- **Target Persona**: Accra dispatch coordinators and central fleet administrators operating SafMove.
- **Key Value**: Reliable administrative credentials and localized dispatch control adaptable to Accra's changing transit landscape.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Passcode Update**: Admin enters the Settings tab $\rightarrow$ inputs current passcode $\rightarrow$ provides matching new passcode ($\ge 4$ chars) $\rightarrow$ updates successfully with instant confirmation toast and UI status indicator.
  2. **Passcode Restore**: Admin clicks "Restore Default (safmove2026)" $\rightarrow$ resets active passcode instantly without modal blockers or errors.
  3. **Metrics Hub Filtering**: Admin clicks the "Metrics" tab $\rightarrow$ selects any default or custom hub from the dropdown $\rightarrow$ Total Rides, Gross Fare Volume (GHS), and Verified Drivers cards update in real-time.
  4. **Hub Management**: Admin views the Hub Manager card $\rightarrow$ creates a new hub (e.g., "Tema Harbor", "Kasoa Tollbooth", "Dansoman") $\rightarrow$ renames an existing hub with inline editing $\rightarrow$ deletes unwanted hubs $\rightarrow$ dropdown options and corridor views update immediately.
- **Visual Style & Theme**:
  - Deep slate dark theme (`bg-slate-950`, `bg-slate-900/90`, `border-slate-800`).
  - Warm amber primary accents (`#F59E0B`) adhering to the 60-30-10 palette rule.
  - Tabular numerals (`font-mono tabular-nums`) for currency, passenger counts, and fleet telemetry.
  - Zero-pill metadata discipline with unboxed text separators and high-contrast accessibility compliance.

---

### 3. Key Product Decisions & Trade-Offs

- **Passcode Verification Normalization**:
  - *Chosen Approach*: Clean whitespace-trimmed verification comparing against `SafMoveAPI.getAdminPasscode()` and active state, removing obsolete modal blockers that fail in iframe sandboxes.
  - *Why*: Eliminates false-positive mismatch errors while preserving security.
- **Hub State Architecture**:
  - *Chosen Approach*: Dynamic `hubs` array state initialized from persistent storage (with fallback to default Accra corridors: Circle & Kaneshie, East Legon, Osu, Madina, Lapaz).
  - *Why*: Allows admins to freely expand beyond default zones into Greater Accra's emerging logistics corridors while maintaining backward compatibility with existing trips.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   AdminPortal.tsx                      │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Navigation Tabs: [ Metrics ] [ Drivers ] ...     │  │
│  └──────────────────────────────────────────────────┘  │
│                           │                            │
│  ┌────────────────────────▼─────────────────────────┐  │
│  │ Metrics Tab Overview                             │  │
│  │  - Hub Selector: [ All Accra | Circle | ... ]    │  │
│  │  - Recalculated Metric Cards (GHS, Rides, Fleet) │  │
│  └──────────────────────────────────────────────────┘  │
│                           │                            │
│  ┌────────────────────────▼─────────────────────────┐  │
│  │ Dedicated Hub Management Card                    │  │
│  │  - Add New Area (Name & Corridor Keywords)       │  │
│  │  - Inline Rename & Action Bar                    │  │
│  │  - Delete Area & Reset to Accra Defaults         │  │
│  └──────────────────────────────────────────────────┘  │
│                           │                            │
│  ┌────────────────────────▼─────────────────────────┐  │
│  │ Dynamic Regional Dispatch Grid                   │  │
│  │  - Filtered Corridors matched to Active Hub      │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

- **Interactive State Handlers**:
  - `handleUpdateMasterPasscode`: Trims inputs, checks `SafMoveAPI.getAdminPasscode()` or current state, stores to `safmove_admin_master_passcode`, fires `safmove:admin_passcode_sync`.
  - `handleResetPasscodeDefault`: Direct reset to `'safmove2026'` with immediate green feedback alert.
  - `handleAddHub(name, keywords)`: Validates unique name, appends to `hubs`, saves to storage.
  - `handleRenameHub(id, newName)`: Updates hub label in state and recalculates filters.
  - `handleDeleteHub(id)`: Removes hub, gracefully resetting filter if the deleted hub was active.
  - `matchesHub(hubName, text)`: Matches trips, drivers, and corridors against default keywords and custom user-defined hub names.
