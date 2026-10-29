"""Dal piano di motion-director al progetto Remotion: <edit_dir>/motion-plan.json + words_out.json → <edit_dir>/reel.json.

    python plan_to_reel.py <edit_dir> [--base base.mp4]

Nel piano tutti i tempi sono in secondi della timeline di uscita (quella di words_out.json). Qui diventano:
- `scenes[].graphic` ({"type", "props", "y", "text", "behind"}) → una grafica dello style pack, da scene.start a scene.end;
  nelle props le chiavi che finiscono in `At` (numero o lista), `reveal` e `items[].at` sono secondi ASSOLUTI e
  vengono convertite in frame relativi all'inizio della grafica (come le vogliono i componenti Remotion).
- `camera[]` con op `punch` / `push` → zoom (`punch` secco, `push` lento); whip sui tagli, tremori sui timbri e
  riquadro-telefono li fa già la camera dello style pack.
- `captions.emphasis` (indici delle parole di words_out.json) → parole chiave dei sottotitoli.
- le giunte di video-use (segments[].out_start) → `joins`: la camera le tratta come jump cut (punch / whip 3D).
- `hold` → fermo finale (secondi).
- `frame` → la cornice attorno al parlato (default: quella della casa, `HOUSE_FRAME`; `"frame": null` = schermo pieno).
"""
import argparse
import json
from pathlib import Path

FPS = 30
# cornice della casa: ~1 cm (150 px) ai lati, fascia alta (y < 580) e bassa (y > 1340) libere per grafiche e sottotitoli
HOUSE_FRAME = {"x": 150, "y": 580, "w": 780, "h": 760, "radius": 56, "border": 7, "zoom": 1.0, "faceY": 0.42, "faceAt": 0.46}


def rel_frames(v, start: float):
    if isinstance(v, list):
        return [rel_frames(x, start) for x in v]
    return max(0, round((float(v) - start) * FPS))


def convert_props(props: dict, start: float) -> dict:
    out = {}
    for k, v in props.items():
        if k.endswith("At") or k == "reveal":
            out[k] = rel_frames(v, start)
        elif k == "items" and isinstance(v, list) and v and isinstance(v[0], dict):
            out[k] = [{**it, "at": rel_frames(it["at"], start)} if "at" in it else it for it in v]
        else:
            out[k] = v
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("edit")
    ap.add_argument("--base", default="base.mp4", help="montato di video-use, relativo a <edit_dir>")
    a = ap.parse_args()
    edit = Path(a.edit)
    plan = json.loads((edit / "motion-plan.json").read_text())
    wo = json.loads((edit / "words_out.json").read_text())

    graphics = []
    for sc in plan.get("scenes", []):
        g = sc.get("graphic")
        if not g:
            continue
        start, end = float(sc["start"]), float(sc["end"])
        item = {"type": g["type"], "at": round(start, 3), "duration": round(end - start, 3)}
        for k in ("text", "y", "x", "scale", "behind", "icon", "object"):
            if k in g:
                item[k] = g[k]
        if g.get("props"):
            item["props"] = convert_props(g["props"], start)
        graphics.append(item)

    zooms = [
        {"at": float(c["t"]), "kind": "punch" if (c.get("op") or c.get("type")) == "punch" else "smooth", "strength": float(c.get("strength", 0.8)),
         **({"duration": float(c["dur"])} if "dur" in c else {})}
        for c in plan.get("camera", [])
        if (c.get("op") or c.get("type")) in ("punch", "push")
    ]

    reel = {
        "version": 1,
        "name": plan.get("video", edit.parent.name),
        "source": {"file": a.base, "width": 1080, "height": 1920, "fps": FPS, "duration": wo["duration"]},
        "styleId": plan.get("style", "pulse"),
        **({"styleOverrides": plan["styleOverrides"]} if plan.get("styleOverrides") else {}),
        "keep": [],
        "cuts": [],
        "frame": plan["frame"] if "frame" in plan else HOUSE_FRAME,
        "joins": [round(s["out_start"], 3) for s in wo.get("segments", [])[1:]],
        "hold": float(plan.get("hold", 0)),
        "words": [{"text": w["text"], "start": w["start"], "end": w["end"]} for w in wo["words"]],
        "emphasis": plan.get("captions", {}).get("emphasis", []),
        "hook": None,
        "zooms": sorted(zooms, key=lambda z: z["at"]),
        "graphics": graphics,
        "cta": None,
    }
    (edit / "reel.json").write_text(json.dumps(reel, ensure_ascii=False, indent=1) + "\n")
    print(f"{edit / 'reel.json'}: {len(graphics)} grafiche, {len(zooms)} zoom, {len(reel['joins'])} giunte, hold {reel['hold']} s")


if __name__ == "__main__":
    main()
