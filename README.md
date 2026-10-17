# The Shadowbloom of Eldenwood

**Version:** Alpha 0.1.0.1 · built on DokuQuest 0.9.0.57
**Status:** Alpha — ready to test-play. Things will change, and you may meet a bug or two.

A Dungeons & Dragons–style campaign played in a voxel world. Make a hero, step into the Eldenwood, and play the story with up to four friends on one screen, or over your home network or the internet.

## What's in it

- **A character creator** — nine species, twelve classes, ten backgrounds; ability scores by standard array, point buy or 4d6; skills; and a looks editor (body, skin, hair, beard, eyes, ears, horns, markings, outfits and colours). No skin file needed. Each split-screen player makes their own with their own controller.
- **The d20 decides** — attack rolls against armour class both ways, weapon dice, critical hits, resistances, death saving throws, levels 1–20.
- **Spells and features** — 69 SRD spells cast in real time with spell slots and concentration; class features (Rage, Second Wind, Lay on Hands, Bardic Inspiration, Wild Shape, Channel Divinity…) and species features (Breath Weapon, Adrenaline Rush, Stonecunning…).
- **The campaign** — towns where the story puts them, named people with dialogue trees and on-screen skill checks, quests in stages, a journal of quests, people, places and letters, narration at the start and the end. One story per world, shared by the whole party.
- **Everything DokuQuest does** — an endless world to dig and build in, creatures, villages, dungeons, portals to other realms, split screen (2–4), LAN, online and a dedicated server.

## Controls (keyboard)

| Key | | Key | |
|---|---|---|---|
| Z | cast your ready spell | P | character sheet (short rest) |
| G | next spell | J | journal |
| B | class feature | N | species feature |
| Right click on someone | talk | Left click | attack (an attack roll) |

Controller: d-pad up casts, d-pad left changes spell, d-pad right is your class feature, right stick click your species feature. The pause menu also opens the sheet and the journal.

## Download

From **[Releases](https://github.com/FartGarfunkel/The-Shadowbloom-of-Eldenwood/releases/latest)**:

- **Linux:** `Shadowbloom-…-x86_64.AppImage` — make it executable and run it.
- **Windows:** `Shadowbloom-…-windows-x64.zip` — unzip anywhere and run `Shadowbloom.exe`.
- **Just the game:** `shadowbloom.html` — open it in a browser (Chrome, Edge or Firefox), or install it in the desktop app with Options → Install update…

The desktop app keeps itself up to date from this repository. Worlds are kept in `~/.config/Shadowbloom` (Linux) or `%APPDATA%\Shadowbloom` (Windows), apart from any DokuQuest install.

## The project

- `src/js/dnd/` — the tabletop rules: rules data (SRD 5.2), dice, character sheets, combat, spells, features, the creator and the looks painter.
- `src/js/campaign/engine.js` — the campaign engine; `src/js/campaign/shadowbloom.js` — the campaign itself (see `notes/campaign-format.md` to edit it).
- Everything else is DokuQuest's: `src/js/game`, `world`, `render`, `net`, `ui`.
- Build with `node tools/build.js` → `dist/shadowbloom.html`. Tests: `python3 tools/dnd_test.py OUT` and `python3 tools/dnd_coop_test.py OUT` (Playwright).
- Pushing to `main` builds the game, packages the desktop apps and publishes a release (`.github/workflows/release.yml`).

## Credits and licence notes

This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

Built on DokuQuest. Not affiliated with or endorsed by Wizards of the Coast.
