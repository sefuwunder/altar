# Altar

A digital altar maker. A table against a warm wall, dressed with the fixed
offerings — one white candle (flickering flame), one incense stick (curling
smoke), a bowl of three oranges, a bowl of rice, and a green plant in a
vase — and your own images propped up on the table like framed photographs.

## How it works

- **Drop images onto the window** (or use Add images). Each new image takes
  the next free spot on the table, at a varied size and a slight tilt, the
  way photos lean when you prop them up. Up to **30** images; past that the
  altar tells you it's full.
- **Drag to move.** Grab any image and slide it around the table — it stays
  on the table, never floats up the wall or falls off the edge. The image
  you grab comes to the front.
- **Drag the corner to resize.** The bottom-right handle scales the image
  proportionally (aspect ratio preserved), anchored at its base so it stays
  planted on the table.
- **Click an image to select it** — Delete removes it, Escape deselects,
  the × button removes it, Clear all empties the table (with a confirm).
- **Everything persists.** Images and their poses live in the browser's
  IndexedDB, so the altar is still there when you come back. The server
  holds no user data; if IndexedDB is unavailable the app quietly falls
  back to memory for the session.

## Run it

```bash
bun server.ts
# http://127.0.0.1:3042
```

Bun + zero dependencies. Positions are stored as fractions of the scene, so
the layout survives window resizes. `src/altar.js` holds the pure geometry
(slots, clamping, the 30-limit) and is covered by bun tests.
