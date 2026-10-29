# HandyLapse

- App Next.js (root): generatore di video timelapse con Gemini/Imagen/Veo.
- `editor/`: montaggio dei reel con Claude Code e skill (video-use, HyperFrames + le 5 custom `motion-*` in
  `.claude/skills/`). Per qualsiasi richiesta di montare un video, segui `editor/README.md`:
  video-use (trascrizione e tagli) → motion-director → motion-design → motion-library → motion-hyperframes → motion-review.
  Se mancano le skill pubbliche (`.claude/skills/video-use`, `~/.claude/skills/hyperframes`), installale con
  `bash editor/setup.sh` (chiedi prima all'utente: scarica ed esegue codice di terze parti).
- Rispondi all'utente in italiano.
