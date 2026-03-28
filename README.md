# Water Lab

A clean-room, static-site ocean demo built in Three.js for quick Paperclip testing.

## What this is

This project is an **original prototype** that captures the general interaction style of modern premium water demos:

- animated ocean surface
- environment presets
- floating buoy
- underwater mode
- faux caustics / seabed glow
- orbit camera controls

It is **not** a copy of Three.js Water Pro and does not use any proprietary source code or paid assets.

## Tech

- Vite
- Three.js
- lil-gui

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## GitHub Pages

This repo is configured to deploy to GitHub Pages with the base path:

```txt
/threejs-water-lab/
```

If you rename the repository, update `base` in `vite.config.js`.

## Current limitations

This MVP focuses on a fast, testable browser experience rather than a physically accurate ocean simulation. It uses custom shader math and preset tuning rather than FFT simulation or a full WebGPU pipeline.
