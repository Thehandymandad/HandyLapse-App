"""Copia la color e l'atmosfera di luce di un'immagine di riferimento (uno screen di un video che piace) sul girato.

    python color_match.py --edit <edit_dir> --ref screen.png [--crop x,y,w,h] [--strength 1] [--light 0.5]
    python color_match.py --edit <edit_dir> --ref screen.png --stills 3,12,30     # solo prova: prima/dopo in review/color

- legge <edit_dir>/base.mp4 (l'originale resta in base_nocolor.mp4 e si riparte sempre da lì: si può rilanciare con
  un'altra referenza); `--src` per un altro file (es. base_wall.mp4 per provare sul girato senza sfondo nuovo)
- persona e sfondo si trattano a parte (scontorno: <edit_dir>/matte.mp4 se c'è, altrimenti RVM veloce a 540x960 →
  matte.mp4), sia nella referenza sia nel girato:
  · sfondo → stessa distribuzione di luce e colori dello sfondo della referenza (curva per quantili con pendenza
    limitata, tinta per zone di luminosità)
  · persona → ancorata alla pelle: la pelle prende luminosità, contrasto e tinta della pelle della referenza, il resto
    segue senza stravolgere i vestiti; neri e bianchi come quelli della persona nella referenza
- il risultato sono due LUT 3D (.cube in review/color, riusabili) applicate da ffmpeg con lo scontorno come maschera:
  stesse su ogni fotogramma, niente sfarfallio
- `--light`: luce simulata (non una vera nuova illuminazione): più luce sul viso, cala verso il basso e i bordi
- `--strength` 0–1: quanto spingere verso la referenza
Prima di speed.py e del resto della catena (dopo background.py se si cambia anche lo sfondo).
"""
import argparse
import shutil
import subprocess
from pathlib import Path

import cv2
import numpy as np
from scipy.interpolate import PchipInterpolator

W, H = 1080, 1920
MODEL = Path(__file__).resolve().parents[4] / "editor/assets/models/rvm_mobilenetv3_fp32.onnx"
YUV_IN = "scale=in_color_matrix=bt709:in_range=tv"
YUV_OUT = "scale=out_color_matrix=bt709:out_range=tv"
WARMTH = 0.7  # quanto della temperatura della referenza si prende
SKIN_PULL = 0.75
BG_TINT = 0.85  # quanto lo sfondo prende la tinta di quello della referenza  # quanto la luce della pelle va verso quella della referenza (1 = uguale)


# ---------- lettura ----------

def duration(path: Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True).stdout
    return float(out.strip())


def frame_at(path: Path, t: float, gray: bool = False) -> np.ndarray:
    fmt, ch = ("gray", 1) if gray else ("rgb24", 3)
    vf = f"scale={W}:{H}" if gray else f"{YUV_IN},scale={W}:{H}"
    buf = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(path), "-frames:v", "1", "-vf", vf,
                          "-f", "rawvideo", "-pix_fmt", fmt, "-"], capture_output=True, check=True).stdout
    a = np.frombuffer(buf, np.uint8)[: W * H * ch]
    return a.reshape(H, W) if gray else a.reshape(H, W, 3)


def to_lab(rgb: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(rgb.astype(np.float32) / 255.0, cv2.COLOR_RGB2Lab)


# ---------- scontorno ----------

def rvm_session():
    import onnxruntime as ort
    return ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])


def matte_image(sess, rgb: np.ndarray) -> np.ndarray:
    """Scontorno di un'immagine sola (la referenza): RVM con memoria vuota, un paio di passate per stabilizzarla."""
    x = cv2.resize(rgb, (540, int(540 * rgb.shape[0] / rgb.shape[1])), interpolation=cv2.INTER_AREA)
    x = x.astype(np.float32).transpose(2, 0, 1)[None] / 255.0
    rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4
    for _ in range(3):
        _, pha, *rec = sess.run(None, {"src": x, "r1i": rec[0], "r2i": rec[1], "r3i": rec[2], "r4i": rec[3],
                                       "downsample_ratio": np.array([0.5], np.float32)})
    return cv2.resize(pha[0, 0], (rgb.shape[1], rgb.shape[0]), interpolation=cv2.INTER_LINEAR)


def make_matte(sess, src: Path, out: Path) -> None:
    """Scontorno del girato a 540x960 (basta per la color: la maschera viene comunque ammorbidita)."""
    w, h = 540, 960
    rd = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(src), "-vf", f"{YUV_IN},scale={w}:{h}", "-f", "rawvideo",
                           "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    wr = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{w}x{h}",
                           "-r", str(fps_of(src)), "-i", "-", "-vf", f"scale={W}:{H}", "-c:v", "libx264", "-crf", "18",
                           "-pix_fmt", "yuv420p", str(out)], stdin=subprocess.PIPE)
    rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4
    ratio = np.array([0.5], np.float32)
    while True:
        buf = rd.stdout.read(w * h * 3)
        if len(buf) < w * h * 3:
            break
        x = np.frombuffer(buf, np.uint8).reshape(h, w, 3).astype(np.float32).transpose(2, 0, 1)[None] / 255.0
        _, pha, *rec = sess.run(None, {"src": x, "r1i": rec[0], "r2i": rec[1], "r3i": rec[2], "r4i": rec[3],
                                       "downsample_ratio": ratio})
        wr.stdin.write(np.clip(pha[0, 0] * 255 + 0.5, 0, 255).astype(np.uint8).tobytes())
    rd.wait()
    wr.stdin.close()
    wr.wait()


def fps_of(path: Path) -> str:
    return subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate",
                           "-of", "csv=p=0", str(path)], capture_output=True, text=True).stdout.strip()


def skin_mask(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Pelle del viso: testa (dall'alto della sagoma fino al collo, il punto più stretto) ∩ colori da pelle."""
    h = alpha.shape[0]
    width = (alpha > 0.5).sum(1)
    rows = np.where(width > alpha.shape[1] * 0.03)[0]
    if len(rows) == 0:
        return np.zeros_like(alpha, bool)
    top = rows[0]
    lo, hi = top + int(0.12 * h), min(h - 1, top + int(0.40 * h))
    neck = lo + int(np.argmin(width[lo:hi])) if hi > lo else hi
    head = np.zeros_like(alpha, bool)
    head[top:neck] = True
    ycc = cv2.cvtColor(rgb, cv2.COLOR_RGB2YCrCb).astype(np.int16)
    y, cr, cb = ycc[..., 0], ycc[..., 1], ycc[..., 2]
    skin = (cr > 133) & (cr < 180) & (cb > 77) & (cb < 135) & (y > 55) & (y < 245)
    return head & skin & (alpha > 0.9)


# ---------- trasformazioni ----------

def monotone(x: np.ndarray, y: np.ndarray, smin: float, smax: float) -> PchipInterpolator:
    """Curva crescente per i punti (x, y) con pendenza tra smin e smax, ancorata alla mediana."""
    x, idx = np.unique(x, return_index=True)
    y = y[idx]
    if len(x) < 2:
        return PchipInterpolator([0, 100], [0, 100])
    s = np.clip(np.diff(y) / np.maximum(np.diff(x), 1e-6), smin, smax)
    yy = np.concatenate([[0], np.cumsum(s * np.diff(x))])
    mid = len(x) // 2
    yy += y[mid] - yy[mid]
    return PchipInterpolator(x, yy, extrapolate=True)


def chroma_std(ab: np.ndarray) -> float:
    return float(np.sqrt(((ab - ab.mean(0)) ** 2).sum(1).mean()) + 1e-6)


def lab_to_lin(lab: np.ndarray) -> np.ndarray:
    rgb = np.clip(cv2.cvtColor(lab[None].astype(np.float32), cv2.COLOR_Lab2RGB)[0], 0, 1)
    return np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)


def lin_to_lab(lin: np.ndarray) -> np.ndarray:
    lin = np.clip(lin, 0, 1)
    rgb = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.power(lin, 1 / 2.4) - 0.055)
    return cv2.cvtColor(rgb[None].astype(np.float32), cv2.COLOR_RGB2Lab)[0]


LUMA = np.array([0.2126, 0.7152, 0.0722])


def light_color(lab: np.ndarray) -> np.ndarray:
    """Colore medio in luce lineare a luminosità 1 (il "colore della luce" su quella superficie)."""
    lin = lab_to_lin(lab).mean(0)
    return lin / max(1e-6, float(lin @ LUMA))


class Look:
    """La color della referenza su tutto il fotogramma, una sola trasformazione (persona e stanza restano coerenti):
    1. temperatura della luce: guadagni rosso/blu in luce lineare presi dal fotogramma intero della referenza, come
       cambiare la luce: tocca tutti i materiali allo stesso modo (una felpa beige resta beige, solo più calda). La
       tinta della pelle non si copia: è della persona, non della luce (copiarla fa la pelle verde o arancione)
    2. luce: curva su L ancorata alla pelle (neri, pelle 10/50/90, bianchi)
    3. saturazione generale come quella della referenza"""

    def __init__(self, gains: np.ndarray, curve, sat: float):
        self.gains, self.curve, self.sat = gains, curve, sat

    def balance(self, lab: np.ndarray) -> np.ndarray:
        return lin_to_lab(lab_to_lin(lab) * self.gains)

    def __call__(self, lab: np.ndarray) -> np.ndarray:
        out = self.balance(lab)
        out[:, 0] = np.clip(self.curve(out[:, 0]), 0, 100)
        out[:, 1:] *= self.sat
        return out


def fit_look(src: np.ndarray, ref: np.ndarray, src_skin: np.ndarray, ref_skin: np.ndarray) -> Look:
    ratio = light_color(ref) / light_color(src)
    t = float(np.clip(np.sqrt(ratio[0] / ratio[2]), 0.8, 1.25)) ** WARMTH
    gains = np.array([t, 1.0, 1 / t])
    gains /= float(gains @ LUMA)
    look = Look(gains, None, 1.0)
    src, src_skin = look.balance(src), look.balance(src_skin)
    q = [10, 50, 90]
    ss, rs = np.percentile(src_skin[:, 0], q), np.percentile(ref_skin[:, 0], q)
    rs = ss + (rs - ss) * SKIN_PULL
    sb, rb = np.percentile(src[:, 0], 1), np.percentile(ref[:, 0], 1)
    sw = np.percentile(src[:, 0], 99.5)
    # i bianchi restano sotto il 97: la pelle si schiarisce, i vestiti chiari non bruciano
    rw = max(min(97.0, sw + (rs[1] - ss[1]) * 0.3), rs[2] + 4)
    xs = np.array([0, sb, *ss, sw, 100])
    ys = np.array([max(0.0, rb - sb * 0.5), rb, *rs, rw, min(100.0, rw + (100 - sw) * 0.8)])
    look.curve = monotone(np.sort(xs), ys[np.argsort(xs)], 0.4, 1.6)

    def colorfulness(lab):
        return float(np.mean(np.hypot(lab[:, 1], lab[:, 2]) / np.maximum(lab[:, 0], 8.0)))
    look.sat = float(np.clip(colorfulness(ref) / colorfulness(src), 0.85, 1.2))
    return look


class Exposed:
    """Il look seguito da un cambio di esposizione (in luce lineare) e dalla tinta dello sfondo della referenza: per
    lo sfondo, che nella referenza ha un altro rapporto di luce con il viso e un altro colore."""

    def __init__(self, look: Look, gain: float):
        self.look, self.gain = look, gain
        self.ref_tab, self.src_ratio = None, np.zeros(2)

    def expose(self, lab: np.ndarray) -> np.ndarray:
        return lin_to_lab(lab_to_lin(self.look(lab)) * self.gain)

    def fit_tint(self, src_bg: np.ndarray, ref_bg: np.ndarray) -> None:
        """Tinta dello sfondo come quella della referenza alla stessa luminosità (nella referenza le parti chiare dello
        sfondo sono arancioni, le scure rosse: dipende dalla luce). Il colore dominante dello sfondo del girato (il
        muro) va su quella tinta, gli altri oggetti tengono la loro differenza."""
        out = self.expose(src_bg)
        self.ref_tab = band_means(ref_bg)
        self.src_ratio = np.median(out[:, 1:] / np.maximum(out[:, :1], 8.0)[:, None][:, 0], 0)

    def __call__(self, lab: np.ndarray) -> np.ndarray:
        out = self.expose(lab)
        if self.ref_tab is None:
            return out
        L = out[:, :1]
        dominant = self.src_ratio * np.maximum(L, 8.0)
        out[:, 1:] += (band_interp(L[:, 0], self.ref_tab) - dominant) * BG_TINT
        return out


def band_means(lab: np.ndarray, step: float = 8.0):
    """(a, b) per fasce di luminosità, pesati con la saturazione: contano le luci colorate (l'alone arancione), non
    il muro grigio."""
    cs, ms = [], []
    w = np.hypot(lab[:, 1], lab[:, 2]) ** 2 + 1.0
    for lo in np.arange(0, 100, step):
        m = (lab[:, 0] >= lo) & (lab[:, 0] < lo + step)
        if m.sum() > 150:
            cs.append(lab[m, 0].mean())
            ms.append((lab[m, 1:] * w[m, None]).sum(0) / w[m].sum())
    return np.array(cs), np.array(ms)


def band_interp(L: np.ndarray, tab) -> np.ndarray:
    cs, ms = tab
    return np.stack([np.interp(L, cs, ms[:, 0]), np.interp(L, cs, ms[:, 1])], -1)


def lum(L: float) -> float:
    """Luminanza relativa (lineare) da L* di Lab."""
    return ((L + 16) / 116) ** 3 if L > 8 else L / 903.3


def background_gain(look: Look, src_bg_L: float, src_skin_L: float, ref_bg_L: float, ref_skin_L: float,
                    max_stops: float) -> float:
    """Quanto scurire (o schiarire) lo sfondo perché il rapporto sfondo/viso sia quello della referenza."""
    after_bg, after_skin = float(look.curve(src_bg_L)), float(look.curve(src_skin_L))
    want = lum(ref_bg_L) / lum(ref_skin_L)
    have = lum(after_bg) / lum(after_skin)
    return float(np.clip(want / have, 2 ** -max_stops, 2 ** 0.5))


def write_cube(path: Path, fn, strength: float, n: int = 33) -> None:
    g = np.linspace(0, 1, n, dtype=np.float32)
    b, gg, r = np.meshgrid(g, g, g, indexing="ij")  # .cube: il rosso varia più in fretta
    rgb = np.stack([r, gg, b], -1).reshape(-1, 3)
    lab = cv2.cvtColor(rgb[None], cv2.COLOR_RGB2Lab)[0]
    out = fn(lab)
    out = lab + (out - lab) * strength
    rgb2 = np.clip(cv2.cvtColor(out[None].astype(np.float32), cv2.COLOR_Lab2RGB)[0], 0, 1)
    with open(path, "w") as f:
        f.write(f"LUT_3D_SIZE {n}\n")
        for row in rgb2:
            f.write(f"{row[0]:.6f} {row[1]:.6f} {row[2]:.6f}\n")


def light_maps(outdir: Path, face_xy, amount: float) -> tuple[Path, Path]:
    """Luce simulata (si moltiplica):
    - light.png su tutto: piena sul viso, cala verso il basso (il corpo va in ombra) e verso i bordi
    - bglight.png sullo sfondo PRIMA della LUT: alone dietro la testa che si spegne verso i bordi. Così lo sfondo ha
      zone chiare e scure e la LUT le colora come nella referenza (di solito: chiaro arancione, scuro rosso)"""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    fx, fy = face_xy
    d = np.sqrt(((xx - fx) / (0.55 * W)) ** 2 + ((yy - (fy - 0.06 * H)) / (0.42 * H)) ** 2)
    glow = 1 - min(0.8, amount * 1.1) * (1 - np.exp(-d ** 2 * 1.3))
    bg = outdir / "bglight.png"
    cv2.imwrite(str(bg), np.clip(glow * 255 + 0.5, 0, 255).astype(np.uint8))
    path = outdir / "light.png"
    d = np.sqrt(((xx - fx) / (0.62 * W)) ** 2 + ((yy - fy) / (0.55 * H)) ** 2)
    radial = np.clip(1 - 0.55 * np.clip(d - 0.25, 0, None) ** 1.4, 0, 1)
    below = np.clip((yy - fy - 0.08 * H) / (0.45 * H), 0, 1)
    below = below * below * (3 - 2 * below)
    m = 1 - amount * (1 - radial * (1 - 0.8 * below))
    cv2.imwrite(str(path), np.clip(m * 255 + 0.5, 0, 255).astype(np.uint8))
    return path, bg


# ---------- applicazione ----------

def filter_graph(cube_s: Path, cube_b: Path, light) -> str:
    pre = "[3:v]format=gbrp[bl];[b][bl]blend=all_mode=multiply:shortest=1[b2];" if light else "[b]null[b2];"
    g = (f"[0:v]{YUV_IN},format=gbrp,split[a][b];{pre}"
         f"[a]lut3d=file='{cube_s}':interp=tetrahedral[s];[b2]lut3d=file='{cube_b}':interp=tetrahedral[g];"
         f"[1:v]scale={W}:{H},format=gray,lut=c0='clip((val-150)*255/85,0,255)',erosion,erosion,gblur=sigma=3,format=gbrp[m];[g][s][m]maskedmerge[c]")
    if light:
        g += f";[2:v]format=gbrp[l];[c][l]blend=all_mode=multiply:shortest=1[c2];[c2]{YUV_OUT},format=yuv420p[v]"
    else:
        g += f";[c]{YUV_OUT},format=yuv420p[v]"
    return g


def render(src: Path, matte: Path, cube_s: Path, cube_b: Path, light, out: Path,
           at: float | None = None) -> None:
    seek = ["-ss", f"{at:.3f}"] if at is not None else []
    cmd = ["ffmpeg", "-y", "-v", "error", *seek, "-i", str(src), *seek, "-i", str(matte)]
    if light:
        cmd += ["-loop", "1", "-i", str(light[0]), "-loop", "1", "-i", str(light[1])]
    cmd += ["-filter_complex", filter_graph(cube_s, cube_b, light), "-map", "[v]"]
    if at is not None:
        cmd += ["-frames:v", "1", str(out)]
    else:
        cmd += ["-map", "0:a?", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-color_primaries", "bt709",
                "-color_trc", "bt709", "-colorspace", "bt709", "-c:a", "copy", "-movflags", "+faststart", str(out)]
    subprocess.run(cmd, check=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--edit", required=True)
    ap.add_argument("--ref", required=True, help="immagine di riferimento (screen)")
    ap.add_argument("--crop", help="x,y,w,h della parte di video nello screen (senza l'interfaccia dell'app)")
    ap.add_argument("--src", help="girato da correggere (default: base_nocolor.mp4, copia di base.mp4)")
    ap.add_argument("--strength", type=float, default=1.0)
    ap.add_argument("--relight", type=float, default=2.5, help="stop massimi di cui scurire lo sfondo (0 = come la persona)")
    ap.add_argument("--light", type=float, default=0.6, help="0–1: luce simulata sul viso (0 = niente)")
    ap.add_argument("--stills", help="solo prova: tempi in secondi, prima/dopo in review/color")
    ap.add_argument("--samples", type=int, default=12)
    a = ap.parse_args()
    edit = Path(a.edit)
    outdir = edit / "review/color"
    outdir.mkdir(parents=True, exist_ok=True)
    if a.src:
        src = Path(a.src)
    else:
        src = edit / "base_nocolor.mp4"
        if not src.exists():
            shutil.copy2(edit / "base.mp4", src)

    sess = rvm_session()
    ref = cv2.cvtColor(cv2.imread(a.ref, cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB)
    if a.crop:
        x, y, w, h = map(int, a.crop.split(","))
        ref = ref[y:y + h, x:x + w]
    ref_a = matte_image(sess, ref)
    ref_lab = to_lab(ref).reshape(-1, 3)
    ref_alpha = ref_a.reshape(-1)
    ref_skin = skin_mask(ref, ref_a).reshape(-1)

    matte = edit / "matte.mp4"
    if not matte.exists() or abs(duration(matte) - duration(src)) > 0.2:
        print("scontorno del girato (RVM 540x960)…")
        make_matte(sess, src, matte)

    dur = duration(src)
    labs, alphas, skins, faces = [], [], [], []
    for t in np.linspace(0.5, dur - 0.5, a.samples):
        rgb, al = frame_at(src, t), frame_at(matte, t, gray=True).astype(np.float32) / 255.0
        sk = skin_mask(rgb, al)
        small = (slice(None, None, 3), slice(None, None, 3))
        labs.append(to_lab(rgb)[small].reshape(-1, 3))
        alphas.append(al[small].reshape(-1))
        skins.append(sk[small].reshape(-1))
        if sk.sum() > 500:
            ys, xs = np.nonzero(sk)
            faces.append((np.median(xs), np.median(ys)))
    src_lab, src_alpha, src_skin = np.concatenate(labs), np.concatenate(alphas), np.concatenate(skins)
    if ref_skin.sum() < 200 or src_skin.sum() < 200:
        raise SystemExit("non trovo la pelle del viso nella referenza o nel girato: serve un primo piano")

    look = fit_look(src_lab, ref_lab, src_lab[src_skin], ref_lab[ref_skin])
    med = lambda lab, m: float(np.median(lab[m, 0]))
    gain = background_gain(look, med(src_lab, src_alpha < 0.1), med(src_lab, src_skin),
                           med(ref_lab, ref_alpha < 0.1), med(ref_lab, ref_skin), a.relight)
    print(f"sfondo: {np.log2(gain):+.2f} stop rispetto alla persona")
    subj, bg = look, Exposed(look, gain)
    bg.fit_tint(src_lab[src_alpha < 0.1], ref_lab[ref_alpha < 0.1])
    cube_s, cube_b = outdir / "subject.cube", outdir / "background.cube"
    write_cube(cube_s, subj, a.strength)
    write_cube(cube_b, bg, a.strength)
    light = None
    if a.light > 0:
        light = light_maps(outdir, np.median(np.array(faces), 0) if faces else (W / 2, H * 0.3), a.light)
    # controllo: maschere della pelle trovate
    dbg = ref.copy()
    dbg[skin_mask(ref, ref_a)] = (0, 255, 0)
    cv2.imwrite(str(outdir / "ref_skin.jpg"), cv2.cvtColor(dbg, cv2.COLOR_RGB2BGR))

    def stats(lab, m):
        return f"L {np.median(lab[m, 0]):5.1f}  a {lab[m, 1].mean():5.1f}  b {lab[m, 2].mean():5.1f}"
    print("referenza  pelle", stats(ref_lab, ref_skin), "| sfondo", stats(ref_lab, ref_alpha < 0.1))
    print("girato     pelle", stats(src_lab, src_skin), "| sfondo", stats(src_lab, src_alpha < 0.1))

    if a.stills:
        for t in map(float, a.stills.split(",")):
            render(src, matte, cube_s, cube_b, light, outdir / f"after_{t:05.1f}.png", at=t)
            cv2.imwrite(str(outdir / f"before_{t:05.1f}.png"), cv2.cvtColor(frame_at(src, t), cv2.COLOR_RGB2BGR))
        print(f"still prima/dopo in {outdir}")
        return
    out = edit / "base.mp4"
    tmp = edit / "base_color_tmp.mp4"
    render(src, matte, cube_s, cube_b, light, tmp)
    tmp.replace(out)
    print(f"Fatto: {out} con la color di {Path(a.ref).name}; LUT in {outdir}")


if __name__ == "__main__":
    main()
