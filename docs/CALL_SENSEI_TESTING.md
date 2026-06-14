# Call Sensei — manual test checklist

Realtime tutor quality pass. Run these after any change to `functions/index.js`
(`buildRealtimeSession` / `buildRealtimeInstructions`) or `src/ai/callModes.js`.
Server-side changes require `firebase deploy --only functions` first.

Config under test (all in `functions/index.js` → `buildRealtimeSession`):
- model `gpt-realtime-2`, voice `marin`
- `audio.input.turn_detection`: `semantic_vad`, eagerness `low` (waits for the learner)
- `audio.input.transcription`: `gpt-4o-transcribe` + mixed AR/JA/EN prompt hint
- `audio.input.noise_reduction`: `near_field`
- `audio.output.speed`: N5/N4 `0.85` · N3 `0.92` · N2/N1 `1.0`

## Scenarios

1. **Arabic speech** — speak a full Arabic sentence. Expect: understood as Arabic (not mistaken for broken Japanese), no confident mis-guess.
2. **Beginner Japanese (N5)** — say a simple sentence (e.g. わたしは がくせい です). Expect: short JP reply + brief Arabic + one question; slow speech.
3. **Broken Japanese** — say a wrong sentence (e.g. わたし は いく きのう). Expect: ONE gentle correction, the better sentence, a one-line Arabic why, then "repeat it."
4. **Unclear pronunciation** — mumble / speak very quietly. Expect: it asks to repeat ("ما سمعت الجملة بوضوح، ممكن تعيدها ببطء؟") instead of guessing.
5. **Interrupting Sensei** — start talking while it speaks. Expect: it stops and listens (barge-in via `interrupt_response`).
6. **N5 mode** — set level N5. Expect: very short JP, lots of Arabic, slow, max 1 correction.
7. **N3 mode** — set level N3. Expect: more natural Japanese, less Arabic, slightly faster.
8. **Role Play (e.g. restaurant)** — Expect: stays in character, corrects only after you answer, doesn't break role.
9. **Shadowing mode** — Expect: one short sentence at a time, waits for you to repeat, gentle correction, then next.

## Also verify
- **Live transcript** shows BOTH sides — your recognized speech appears (proves `input_audio_transcription` is active). Toggle with the transcript button.
- **No false cutoffs** — pause mid-sentence to think; it should wait, not answer the fragment (semantic_vad working).
- Function logs are clean: `npx firebase-tools functions:log --only createSenseiRealtimeCall`. A successful call logs no error (success is silent); a bad session field shows a 400 naming the field.
