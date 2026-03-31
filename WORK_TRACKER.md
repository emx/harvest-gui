# Work Tracker — harvest-gui

## Phase 1: Scaffold
- [x] Tauri 2 + React app builds and launches
- [x] Template greet command works
- [x] shadcn/ui initialized with button component
- [x] Path alias @/ configured

## Phase 2: Rust Commands — File Reads
- [ ] `get_processed(state_dir)` — read processed_collects.json
- [ ] `get_last_poll(state_dir)` — read last_poll.json
- [ ] `list_collect_files(local_dir)` — walk collects/ dir tree
- [ ] `get_config()` — read CANOPY_* env vars
- [ ] `tail_log(local_dir, lines)` — read last N lines of harvest.log
- [ ] Register all commands in lib.rs
- [ ] Temporary test UI in App.tsx to verify commands work

## Phase 3: Dashboard Screen
- [ ] App shell layout (header, sidebar, main content)
- [ ] Poll status indicator (green pulse / gray stopped)
- [ ] Metric cards (processed count, on-disk count, disk usage)
- [ ] Recent activity (last 5 processed collects)
- [ ] Config summary panel

## Phase 4: History Screen
- [ ] Processed collects table (sortable/filterable)
- [ ] Collect detail view (files list with name, size, path)

## Phase 5: Process Management
- [ ] `start_polling(flags)` — spawn harvest as background process
- [ ] `stop_polling()` — kill process
- [ ] Stream stdout as Tauri events
- [ ] Frontend log feed

## Phase 6: Active Downloads + Health
- [ ] Asset list via --assets command
- [ ] Log viewer (tail + filter by level)
- [ ] Connection test (auth token fetch)

## Phase 7: Settings + Polish
- [ ] Config display (env vars, masked secrets)
- [ ] Dark theme, animations, loading skeletons, error states
