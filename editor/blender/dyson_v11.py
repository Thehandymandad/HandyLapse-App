"""Aspirapolvere a stelo stile Dyson V11 (corpo portatile + inizio del tubo), modellato con primitive e
modificatori, su fondo trasparente, con una rotazione da vetrina. Nessun logo.

    blender -b -P dyson_v11.py -- --out <cartella> [--still] [--frames 90] [--res 1080] [--samples 48]

--still: rende un solo fotogramma (out/still.png); altrimenti una sequenza PNG con canale alfa in out/frames/.
"""
import argparse
import math
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True)
ap.add_argument("--still", action="store_true")
ap.add_argument("--frames", type=int, default=90)
ap.add_argument("--res", type=int, default=1080)
ap.add_argument("--samples", type=int, default=48)
ap.add_argument("--frame", type=int, default=20, help="fotogramma da rendere con --still")
a = ap.parse_args(argv)

# ---------------------------------------------------------------- scena vuota
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = a.samples
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 8
scene.cycles.transmission_bounces = 8
scene.render.film_transparent = True
scene.render.resolution_x = a.res
scene.render.resolution_y = a.res
scene.render.fps = 30
scene.frame_start = 1
scene.frame_end = a.frames
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Punchy"

world = bpy.data.worlds.new("world")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.62, 0.64, 0.68, 1)
bg.inputs[1].default_value = 0.35

root = bpy.data.objects.new("dyson", None)
scene.collection.objects.link(root)


# ---------------------------------------------------------------- materiali
def mat(name, color, metallic=0.0, rough=0.4, transmission=0.0, ior=1.45, coat=0.0, emission=None, alpha=1.0, aniso=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Metallic"].default_value = metallic
    p.inputs["Roughness"].default_value = rough
    p.inputs["IOR"].default_value = ior
    p.inputs["Transmission Weight"].default_value = transmission
    p.inputs["Coat Weight"].default_value = coat
    p.inputs["Anisotropic"].default_value = aniso
    p.inputs["Alpha"].default_value = alpha
    if emission:
        p.inputs["Emission Color"].default_value = (*emission, 1)
        p.inputs["Emission Strength"].default_value = 3.0
    return m


NICKEL = mat("nickel", (0.72, 0.72, 0.74), metallic=1.0, rough=0.28, aniso=0.6)
BLUE = mat("blu", (0.01, 0.05, 0.42), metallic=0.9, rough=0.2, coat=0.8)
PURPLE = mat("viola", (0.12, 0.02, 0.32), metallic=0.9, rough=0.2, coat=0.8)
GREY = mat("grigio", (0.025, 0.025, 0.03), rough=0.4, coat=0.3)
DARK = mat("nero", (0.012, 0.012, 0.014), rough=0.35)
RED = mat("rosso", (0.42, 0.005, 0.01), rough=0.3, coat=0.5)
CLEAR = mat("trasparente", (0.92, 0.94, 0.96), rough=0.04, transmission=1.0, ior=1.49)
SCREEN = mat("schermo", (0.0, 0.0, 0.0), rough=0.1, emission=(0.15, 0.55, 1.0))


# ---------------------------------------------------------------- utilità
def finish(o, m, bevel=0.004, segs=3, smooth=True, parent=root):
    o.data.materials.append(m)
    if bevel:
        b = o.modifiers.new("bevel", "BEVEL")
        b.width = bevel
        b.segments = segs
        b.limit_method = "ANGLE"
    if smooth:
        for poly in o.data.polygons:
            poly.use_smooth = True
        o.modifiers.new("wn", "WEIGHTED_NORMAL").keep_sharp = True
    o.parent = parent
    return o


def cyl(name, r, depth, loc, rot=(0, 0, 0), m=NICKEL, verts=64, bevel=0.003, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, vertices=verts, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=depth, vertices=verts, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    return finish(o, m, bevel)


def box(name, size, loc, rot=(0, 0, 0), m=GREY, bevel=0.01, segs=4):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, m, bevel, segs)


def torus(name, R, r, loc, rot=(0, 0, 0), m=NICKEL):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=64, minor_segments=16)
    o = bpy.context.object
    o.name = name
    return finish(o, m, 0)


deg = math.radians

# ---------------------------------------------------------------- corpo (asse del ciclone leggermente inclinato)
# sistema: x = avanti (verso il tubo), z = su; misure in metri, scala reale (~ corpo alto 30 cm)
body = bpy.data.objects.new("corpo", None)
scene.collection.objects.link(body)
body.parent = root
body.rotation_euler = (0, deg(-8), 0)

# contenitore trasparente con dentro un po' di polvere grigia
cyl("contenitore", 0.058, 0.17, (0, 0, -0.02), m=CLEAR, bevel=0.0).parent = body
cyl("polvere", 0.052, 0.012, (0, 0, -0.098), m=mat("polvere", (0.35, 0.33, 0.3), rough=0.9), bevel=0.0).parent = body
cyl("fondo", 0.06, 0.012, (0, 0, -0.11), m=GREY, bevel=0.003).parent = body
# leva rossa di svuotamento sopra il contenitore
box("leva", (0.03, 0.014, 0.05), (-0.045, 0.0, 0.11), rot=(0, deg(10), 0), m=RED, bevel=0.005).parent = body

# corona dei cicloni: anello nichel + 14 coni piccoli in due file + cappello blu
cyl("anello", 0.062, 0.03, (0, 0, 0.08), m=NICKEL).parent = body
cyl("griglia", 0.06, 0.05, (0, 0, 0.115), m=mat("griglia", (0.5, 0.5, 0.52), metallic=1.0, rough=0.5), verts=96).parent = body
for i in range(14):
    ring = 0 if i < 9 else 1
    n = 9 if ring == 0 else 5
    k = i if ring == 0 else i - 9
    ang = 2 * math.pi * k / n + (0 if ring == 0 else math.pi / n)
    R = 0.042 if ring == 0 else 0.02
    z = 0.148 if ring == 0 else 0.158
    c = cyl(f"ciclone{i}", 0.011, 0.03, (R * math.cos(ang), R * math.sin(ang), z), m=BLUE, r2=0.007, verts=24, bevel=0.0015)
    c.rotation_euler = (-math.sin(ang) * deg(14) * (1 - ring), math.cos(ang) * deg(14) * (1 - ring), 0)
    c.parent = body
cyl("bordo", 0.061, 0.012, (0, 0, 0.142), m=NICKEL).parent = body
cyl("cappello", 0.016, 0.03, (0, 0, 0.172), m=NICKEL, r2=0.009).parent = body

# ingresso: tubo corto dal fronte del contenitore verso il basso-avanti, poi il tubo lungo
IN_ANG = deg(108)  # asse dell'ingresso: avanti e un po' in basso
d_in = Vector((math.sin(IN_ANG), 0, math.cos(IN_ANG)))
p0 = Vector((0.05, 0, -0.035))
cyl("bocchetta", 0.023, 0.07, p0 + d_in * 0.035, rot=(0, IN_ANG, 0), m=PURPLE).parent = body
cyl("aggancio", 0.027, 0.025, p0 + d_in * 0.08, rot=(0, IN_ANG, 0), m=RED, bevel=0.002).parent = body
cyl("tubo", 0.02, 0.6, p0 + d_in * (0.09 + 0.3), rot=(0, IN_ANG, 0), m=PURPLE, verts=48).parent = body

# ---------------------------------------------------------------- motore, impugnatura, batteria
cyl("motore", 0.038, 0.16, (-0.1, 0, 0.09), rot=(0, deg(90), 0), m=NICKEL)
for j in range(6):  # alette di raffreddamento
    torus(f"aletta{j}", 0.038, 0.0025, (-0.06 - j * 0.014, 0, 0.09), rot=(0, deg(90), 0), m=DARK)
cyl("retro", 0.04, 0.03, (-0.19, 0, 0.09), rot=(0, deg(90), 0), m=BLUE)
# schermo LCD sul retro del motore
box("cornice", (0.006, 0.05, 0.04), (-0.207, 0, 0.09), m=DARK, bevel=0.004)
box("schermo", (0.002, 0.038, 0.028), (-0.2105, 0, 0.09), m=SCREEN, bevel=0.0)

# impugnatura a pistola, inclinata
box("impugnatura", (0.04, 0.034, 0.15), (-0.16, 0, -0.01), rot=(0, deg(-18), 0), m=GREY, bevel=0.014, segs=6)
box("grilletto", (0.02, 0.014, 0.045), (-0.125, 0, 0.02), rot=(0, deg(-18), 0), m=RED, bevel=0.006)
# batteria sotto l'impugnatura, che va verso il fondo del contenitore
box("batteria", (0.17, 0.05, 0.045), (-0.09, 0, -0.105), rot=(0, deg(-6), 0), m=GREY, bevel=0.012, segs=5)
box("sgancio", (0.03, 0.052, 0.012), (-0.155, 0, -0.08), rot=(0, deg(-6), 0), m=RED, bevel=0.004)

# ---------------------------------------------------------------- luci da studio
def area(name, loc, size, power, color=(1, 1, 1)):
    bpy.ops.object.light_add(type="AREA", location=loc)
    lo = bpy.context.object
    lo.name = name
    lo.data.size = size
    lo.data.energy = power
    lo.data.color = color
    d = Vector((0, 0, 0)) - lo.location
    lo.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


area("chiave", (0.9, -0.9, 0.9), 0.8, 260)
area("riempimento", (-0.9, -0.6, 0.3), 1.2, 90, (0.85, 0.9, 1.0))
area("controluce", (-0.4, 0.9, 0.9), 0.6, 220, (1.0, 0.92, 0.85))
area("sotto", (0.2, -0.3, -0.8), 1.0, 30)

# ---------------------------------------------------------------- camera e rotazione da vetrina
cam_data = bpy.data.cameras.new("cam")
cam_data.lens = 55
cam_data.dof.use_dof = False
cam = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam)
cam.location = (0.3, -1.05, 0.2)
target = Vector((0.08, 0, -0.04))
cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam

root.location = (0, 0, 0)
root.rotation_euler = (0, 0, deg(-35))
root.keyframe_insert("rotation_euler", frame=1)
root.rotation_euler = (0, 0, deg(-35 + 70))
root.keyframe_insert("rotation_euler", frame=a.frames)
for fc in root.animation_data.action.fcurves:
    for kp in fc.keyframe_points:
        kp.interpolation = "SINE"
        kp.easing = "EASE_IN_OUT"

# ---------------------------------------------------------------- render
if a.still:
    scene.frame_set(a.frame)
    scene.render.filepath = f"{a.out}/still.png"
    bpy.ops.render.render(write_still=True)
else:
    scene.render.filepath = f"{a.out}/frames/f_"
    bpy.ops.render.render(animation=True)
