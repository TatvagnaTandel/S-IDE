# Changelog

All notable changes to **S-IDE** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-20

### Added
- Modern dark-themed browser IDE interface with Activity bar, File Explorer, Search, Source Control, and Extensions panel.
- Multi-tab code editor with line numbers, minimap overview, dirty state tracking, and cursor coordinate status.
- Virtual workspace filesystem with `localStorage` persistence and default starter templates.
- Interactive terminal console supporting common commands (`ls`, `cat`, `help`, `clear`, `echo`, `run`).
- Quick-open Command Palette (`Cmd/Ctrl + P`) for quick file switching and action execution.
- Keyboard shortcuts for saving (`Cmd/Ctrl + S`), terminal toggle (``Ctrl + ` ``), and palette navigation.
- Minimal zero-dependency Node.js HTTP preview server.
- Automated unit test suite and build verification scripts.
- Dockerfile and Makefile for easy local containerization and testing.
