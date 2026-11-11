# Zyrah development progress

## 2026-11-12 audit and implementation plan

The working tree initially contained edited root requirements, `build_zyrah.md`, and the Mao assets. All tracked application files were already deleted. No `updated-files/` application existed. To preserve those deletions, application source from Git `f9f8fcd` was copied into `updated-files/`; no checkout/reset was performed. Existing assets remain in place. No credentials or databases were found in the working tree.

Foundation: retain Node.js built-in HTTP/SQLite, vanilla browser modules, Live2D/Pixi; add Electron as desktop host. AIRI is evaluated separately in `docs/foundation.md`, without importing a competing framework.

Baseline: Node 22.18.0, npm 11.10.0 on Windows 11 Home Single Language 10.0.26200. Ryzen 5 6600H (6 cores/12 threads), 16,438,312,960 bytes RAM, RTX 2050 4096 MiB, NVIDIA driver 595.79. 45/48 recovered tests passed; three avatar tests failed due to the new directory location. Syntax checks passed (30 JS files). These are automated checks, not live-provider or microphone verification.

## Implementation stages

- [x] Audit repository, hardware and recover reusable application without overwriting deleted root files.
- [ ] Connect existing Mao rig to a bounded, layered performance controller and inspection/demo controls.
- [ ] Version Zyrah identity, validate model cues, synchronize performance to playback.
- [ ] Add secure Electron windows, tray, drag/click, shortcut, display recovery and central hide lifecycle.
- [ ] Improve history previews/search and privacy across memory deletion.
- [ ] Add practical local speech adapters and reproducible audition measurements.
- [ ] Run regression, browser and native Electron checks; package locally and document external blockers.

No paid inference, model downloads, release publication, pushes or system-wide installs are authorized by this plan.
