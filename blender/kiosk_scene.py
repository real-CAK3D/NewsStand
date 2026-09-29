"""The Corner Chronicle kiosk, built in Blender and rendered with Cycles.

  D:\\blender.exe -b --factory-startup -P kiosk_scene.py -- <out_dir> [samples] [views] [times]

Builds a green street-corner newsstand kiosk (after a Bryant Park kiosk): open service window with a wooden counter (radio, glass ashtray
with a burning joint, brass register with paper tape, service bell), back shelves of mason jars and seed packets, a payphone and mail slot
on the pillars, a Scrapbook drawer, fold-out side doors with wire magazine racks and a zine clothesline, a stash box on a milk crate at the
lower right, a chalkboard sign — on a city sidewalk in front of glass towers. Renders each camera view (desk, phone_front, phone_left,
phone_right) by day and by night, and writes anchors.json: where every rack slot, sign and prop lands in each image (normalized
coordinates), so the web page can lay live covers and hotspots exactly on top.
"""
import json, math, os, sys

import bmesh
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Euler, Matrix, Vector

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
SAMPLES = int(ARGS[1]) if len(ARGS) > 1 else 96
VIEWS = ARGS[2].split(",") if len(ARGS) > 2 and ARGS[2] != "all" else ["desk", "behind", "behind_open", "drawer"] + ["jar_%d" % i for i in range(7)]
TIMES = ARGS[3].split(",") if len(ARGS) > 3 else ["day", "night"]
os.makedirs(OUT, exist_ok=True)
FONT_DIR = "C:/Windows/Fonts/"

# ------------------------------------------------------------------ reset
bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene
ANCH = {"quads": {}, "rects": {}, "points": {}}   # names of things the web page needs to find in the image
MATS = {}


# ------------------------------------------------------------------ materials
def pbsdf(nt):
    return next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")


def setin(node, names, value):
    for n in names if isinstance(names, (list, tuple)) else [names]:
        if n in node.inputs:
            node.inputs[n].default_value = value
            return


def mat(name, color=(0.8, 0.8, 0.8), metal=0.0, rough=0.5, emit=None, estr=0.0, transm=0.0, ior=1.45, coat=0.0, alpha=1.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = pbsdf(m.node_tree)
    setin(b, "Base Color", (*color, 1))
    setin(b, "Metallic", metal)
    setin(b, "Roughness", rough)
    setin(b, ["Transmission Weight", "Transmission"], transm)
    setin(b, "IOR", ior)
    setin(b, ["Coat Weight", "Clearcoat"], coat)
    if emit:
        setin(b, ["Emission Color", "Emission"], (*emit, 1))
        setin(b, "Emission Strength", estr)
    if alpha < 1:
        setin(b, "Alpha", alpha)
    MATS[name] = m
    return m


def noisy(name, c1, c2, scale=6.0, rough=0.5, metal=0.0, bump=0.15, kind="noise", detail=6.0, stretch=None):
    """A procedural material: two colors mixed by noise (or wood rings / wave), with a matching bump."""
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = pbsdf(nt)
    setin(b, "Roughness", rough)
    setin(b, "Metallic", metal)
    coord = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    if stretch:
        mp.inputs["Scale"].default_value = stretch
    nt.links.new(coord.outputs["Object"], mp.inputs["Vector"])
    if kind == "wave":
        tex = nt.nodes.new("ShaderNodeTexWave")
        tex.inputs["Scale"].default_value = scale
        tex.inputs["Distortion"].default_value = 6
        tex.inputs["Detail"].default_value = 3
        fac = tex.outputs["Fac"]
    else:
        tex = nt.nodes.new("ShaderNodeTexNoise")
        tex.inputs["Scale"].default_value = scale
        tex.inputs["Detail"].default_value = detail
        fac = tex.outputs["Fac"]
    nt.links.new(mp.outputs["Vector"], tex.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*c1, 1)
    ramp.color_ramp.elements[1].color = (*c2, 1)
    nt.links.new(fac, ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = bump
    nt.links.new(fac, bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    MATS[name] = m
    return m


def bricks(name, c1, c2, mortar, scale, rough=0.85):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = pbsdf(nt)
    setin(b, "Roughness", rough)
    coord = nt.nodes.new("ShaderNodeTexCoord")
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.offset = 0.0
    br.inputs["Scale"].default_value = scale
    br.inputs["Mortar Size"].default_value = 0.012
    br.inputs["Color1"].default_value = (*c1, 1)
    br.inputs["Color2"].default_value = (*c2, 1)
    br.inputs["Mortar"].default_value = (*mortar, 1)
    br.inputs["Brick Width"].default_value = 1.0
    br.inputs["Row Height"].default_value = 1.0
    nt.links.new(coord.outputs["Object"], br.inputs["Vector"])
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 40
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["Factor"].default_value = 0.12
    nt.links.new(br.outputs["Color"], mix.inputs[6])
    nt.links.new(nz.outputs["Color"], mix.inputs[7])
    nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.3
    nt.links.new(br.outputs["Fac"], bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    MATS[name] = m
    return m


GREEN = noisy("kiosk_green", (0.018, 0.075, 0.048), (0.03, 0.11, 0.07), scale=30, rough=0.42, metal=0.35, bump=0.03)
TRIM = mat("trim", (0.01, 0.035, 0.022), metal=0.5, rough=0.35)
GOLD = mat("gold_paint", (0.75, 0.55, 0.2), metal=0.9, rough=0.3)
BRASS = mat("brass", (0.78, 0.56, 0.24), metal=1.0, rough=0.25)
CHROME = mat("chrome", (0.9, 0.9, 0.92), metal=1.0, rough=0.08)
STEEL = mat("steel", (0.55, 0.56, 0.58), metal=1.0, rough=0.35)
WOOD = noisy("counter_wood", (0.15, 0.065, 0.025), (0.34, 0.16, 0.065), scale=5, rough=0.3, bump=0.03, detail=10, stretch=(0.35, 22, 22))
DARKWOOD = noisy("box_wood", (0.08, 0.035, 0.013), (0.24, 0.11, 0.045), scale=5, rough=0.38, bump=0.04, detail=10, stretch=(0.35, 18, 18))
CREAM = mat("wall_cream", (0.85, 0.76, 0.58), rough=0.8)
PAPER = mat("paper", (0.92, 0.9, 0.84), rough=0.75)
GLASS = mat("glass", (0.95, 0.98, 0.97), rough=0.02, transm=1.0, ior=1.45)
JARGLASS = mat("jar_glass", (0.88, 0.97, 0.95), rough=0.05, transm=1.0, ior=1.5)
RED = mat("bakelite_red", (0.5, 0.05, 0.035), rough=0.22, coat=0.6)
IVORY = mat("ivory", (0.9, 0.84, 0.68), rough=0.35, coat=0.3)
BLACK = mat("black_plastic", (0.015, 0.015, 0.015), rough=0.3)
RUBBER = mat("rubber", (0.02, 0.02, 0.02), rough=0.8)
SLOT = mat("slot_dark", (0.03, 0.03, 0.03), rough=0.9)
WIRE = mat("wire", (0.75, 0.76, 0.78), metal=1.0, rough=0.2)
CONCRETE = bricks("sidewalk", (0.24, 0.235, 0.22), (0.28, 0.27, 0.25), (0.14, 0.135, 0.13), 0.9)
ASPHALT = noisy("asphalt", (0.035, 0.035, 0.038), (0.07, 0.07, 0.072), scale=80, rough=0.9, bump=0.3)
CURB = noisy("curb", (0.45, 0.44, 0.42), (0.55, 0.54, 0.5), scale=20, rough=0.8, bump=0.2)
ASH = noisy("ash", (0.25, 0.25, 0.24), (0.55, 0.54, 0.52), scale=60, rough=0.95, bump=0.6)
EMBER = mat("ember", (0.3, 0.05, 0.0), rough=0.8, emit=(1.0, 0.35, 0.05), estr=30.0)
CHALK = noisy("chalkboard", (0.03, 0.05, 0.04), (0.08, 0.1, 0.09), scale=20, rough=0.9, bump=0.05)
MILK = mat("milk_crate", (0.05, 0.2, 0.55), rough=0.5)
LAMPGLOW = mat("lamp_glow", (1, 0.9, 0.7), emit=(1.0, 0.82, 0.55), estr=0.0)
DIALGLOW = mat("dial", (0.95, 0.88, 0.7), rough=0.4, emit=(1.0, 0.8, 0.45), estr=0.0)
STRIP = mat("light_strip", (1, 1, 1), emit=(1.0, 0.9, 0.72), estr=8.0)


# ------------------------------------------------------------------ geometry helpers
def link(ob):
    if ob.name not in S.collection.objects:
        S.collection.objects.link(ob)
    return ob


def bevel(ob, w=0.004, seg=3):
    if w > 0:
        m = ob.modifiers.new("bevel", "BEVEL")
        m.width = w
        m.segments = seg
        m.limit_method = "ANGLE"
    return ob


def box(name, size, loc, material, bev=0.004, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(material)
    return bevel(ob, bev)


def cyl(name, r, depth, loc, material, rot=(0, 0, 0), verts=48, bev=0.0, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return bevel(ob, bev, 2)


def sphere(name, r, loc, material, seg=24, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=r, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = scale
    ob.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return ob


def quad(name, corners, material):
    """A flat 4-corner face: corners TL, TR, BR, BL in world space (the web page maps a cover onto exactly these)."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([Vector(c) for c in corners], [], [(0, 1, 2, 3)])
    ob = link(bpy.data.objects.new(name, me))
    ob.data.materials.append(material)
    ANCH["quads"][name] = [list(c) for c in corners]
    return ob


def rect_on(origin, u, v, w, h, cx, cz, lift=0.0, n=None):
    """Corners (TL,TR,BR,BL) of a w×h rectangle centered at (cx, cz) in a plane spanned by unit vectors u (right) and v (up) from origin."""
    o = Vector(origin) + (Vector(n) * lift if n else Vector())
    c = o + u * cx + v * cz
    return [c - u * w / 2 + v * h / 2, c + u * w / 2 + v * h / 2, c + u * w / 2 - v * h / 2, c - u * w / 2 - v * h / 2]


def text(name, body, loc, size, material, font="georgiab.ttf", rot=(math.pi / 2, 0, 0), align="CENTER", extrude=0.002):
    cu = bpy.data.curves.new(name, "FONT")
    cu.body = body
    try:
        cu.font = bpy.data.fonts.load(FONT_DIR + font, check_existing=True)
    except Exception:
        pass
    cu.size = size
    cu.align_x = align
    cu.align_y = "CENTER"
    cu.extrude = extrude
    ob = link(bpy.data.objects.new(name, cu))
    ob.location = loc
    ob.rotation_euler = rot
    ob.data.materials.append(material)
    return ob


def child(ob, parent, local):
    ob.parent = parent
    ob.matrix_parent_inverse = Matrix.Identity(4)
    ob.location = local
    ob.rotation_euler = (0, 0, 0)
    return ob


def nug(name, r, loc, material):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=r, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (1, 1, 1.25)
    ob.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    tx = bpy.data.textures.get("nug_clouds") or bpy.data.textures.new("nug_clouds", "CLOUDS")
    tx.noise_scale = 0.012
    d = ob.modifiers.new("lumps", "DISPLACE")
    d.texture = tx
    d.strength = r * 0.45
    d.mid_level = 0.5
    return ob


def frosty(name, base, tip):
    """Cannabis: two greens (or purples) mottled together, frosted with fine white trichome specks, a soft sheen."""
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = pbsdf(nt)
    setin(b, "Roughness", 0.55)
    setin(b, ["Sheen Weight", "Sheen"], 0.6)
    setin(b, ["Subsurface Weight", "Subsurface"], 0.08)
    coord = nt.nodes.new("ShaderNodeTexCoord")
    n1 = nt.nodes.new("ShaderNodeTexNoise")
    n1.inputs["Scale"].default_value = 70
    n1.inputs["Detail"].default_value = 8
    r1 = nt.nodes.new("ShaderNodeValToRGB")
    r1.color_ramp.elements[0].color = (*base, 1)
    r1.color_ramp.elements[1].color = (*tip, 1)
    n2 = nt.nodes.new("ShaderNodeTexNoise")
    n2.inputs["Scale"].default_value = 900
    n2.inputs["Detail"].default_value = 2
    r2 = nt.nodes.new("ShaderNodeValToRGB")
    r2.color_ramp.elements[0].position = 0.6
    r2.color_ramp.elements[1].position = 0.68
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs[7].default_value = (0.92, 0.94, 0.9, 1)
    n3 = nt.nodes.new("ShaderNodeTexNoise")
    n3.inputs["Scale"].default_value = 260
    n3.inputs["Detail"].default_value = 3
    n3.inputs["Distortion"].default_value = 4.0
    r3 = nt.nodes.new("ShaderNodeValToRGB")
    r3.color_ramp.elements[0].position = 0.64
    r3.color_ramp.elements[1].position = 0.7
    mix2 = nt.nodes.new("ShaderNodeMix")
    mix2.data_type = "RGBA"
    mix2.inputs[7].default_value = (0.78, 0.33, 0.07, 1)
    for a_, b_ in ((coord.outputs["Object"], n1.inputs["Vector"]), (coord.outputs["Object"], n2.inputs["Vector"]), (n1.outputs["Fac"], r1.inputs["Fac"]),
                   (n2.outputs["Fac"], r2.inputs["Fac"]), (r1.outputs["Color"], mix.inputs[6]), (r2.outputs["Color"], mix.inputs["Factor"]),
                   (mix.outputs[2], mix2.inputs[6]), (coord.outputs["Object"], n3.inputs["Vector"]), (n3.outputs["Fac"], r3.inputs["Fac"]),
                   (r3.outputs["Color"], mix2.inputs["Factor"]), (mix2.outputs[2], b.inputs["Base Color"])):
        nt.links.new(a_, b_)
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.5
    nt.links.new(n1.outputs["Fac"], bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    MATS[name] = m
    return m


PISTIL = mat("pistil", (0.78, 0.33, 0.07), rough=0.6)


NUG_GROUPS = {}


def nug_nodes(material):
    """Geometry nodes that turn a lumpy core into a real-looking nug: hundreds of little calyxes scattered over it, plus hair-thin
    orange pistils sticking out along the surface normals."""
    if material.name in NUG_GROUPS:
        return NUG_GROUPS[material.name]
    ng = bpy.data.node_groups.new("nug_" + material.name, "GeometryNodeTree")
    ng.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    N, L = ng.nodes, ng.links
    gi, go = N.new("NodeGroupInput"), N.new("NodeGroupOutput")

    def sock(node, name, out=False):
        return next(x for x in (node.outputs if out else node.inputs) if x.name == name and x.enabled)
    d1 = N.new("GeometryNodeDistributePointsOnFaces"); sock(d1, "Density").default_value = 32000
    ico = N.new("GeometryNodeMeshIcoSphere"); sock(ico, "Radius").default_value = 0.0037; sock(ico, "Subdivisions").default_value = 2
    rv = N.new("FunctionNodeRandomValue"); rv.data_type = "FLOAT"; sock(rv, "Min").default_value = 0.55; sock(rv, "Max").default_value = 1.45
    i1 = N.new("GeometryNodeInstanceOnPoints")
    r1 = N.new("GeometryNodeRealizeInstances")
    m1 = N.new("GeometryNodeSetMaterial"); sock(m1, "Material").default_value = material
    d2 = N.new("GeometryNodeDistributePointsOnFaces"); sock(d2, "Density").default_value = 2600
    ln = N.new("GeometryNodeCurvePrimitiveLine"); sock(ln, "End").default_value = (0.0, 0.0, 0.0075)
    cp = N.new("GeometryNodeCurvePrimitiveCircle"); sock(cp, "Resolution").default_value = 4; sock(cp, "Radius").default_value = 0.00045
    cm = N.new("GeometryNodeCurveToMesh")
    i2 = N.new("GeometryNodeInstanceOnPoints")
    r2 = N.new("GeometryNodeRealizeInstances")
    m2 = N.new("GeometryNodeSetMaterial"); sock(m2, "Material").default_value = PISTIL
    j = N.new("GeometryNodeJoinGeometry")
    L.new(gi.outputs[0], sock(d1, "Mesh")); L.new(gi.outputs[0], sock(d2, "Mesh"))
    L.new(sock(d1, "Points", True), sock(i1, "Points")); L.new(sock(ico, "Mesh", True), sock(i1, "Instance"))
    L.new(sock(d1, "Rotation", True), sock(i1, "Rotation")); L.new(sock(rv, "Value", True), sock(i1, "Scale"))
    L.new(sock(i1, "Instances", True), r1.inputs[0]); L.new(r1.outputs[0], sock(m1, "Geometry"))
    L.new(sock(ln, "Curve", True), sock(cm, "Curve")); L.new(sock(cp, "Curve", True), sock(cm, "Profile Curve"))
    L.new(sock(d2, "Points", True), sock(i2, "Points")); L.new(sock(cm, "Mesh", True), sock(i2, "Instance")); L.new(sock(d2, "Rotation", True), sock(i2, "Rotation"))
    L.new(sock(i2, "Instances", True), r2.inputs[0]); L.new(r2.outputs[0], sock(m2, "Geometry"))
    for g_ in (gi.outputs[0], sock(m1, "Geometry", True), sock(m2, "Geometry", True)):
        L.new(g_, j.inputs[0])
    L.new(j.outputs[0], go.inputs[0])
    NUG_GROUPS[material.name] = ng
    return ng


def bud(name, r, loc, material, rot=(0, 0, 0)):
    """A cured nug: an elongated lumpy calyx cluster (voronoi + clouds displacement), frosted, with short orange pistils."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=r, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (1, 0.9, 1.45)
    ob.data.materials.append(material)
    ob.data.materials.append(PISTIL)
    bpy.ops.object.shade_smooth()
    t1 = bpy.data.textures.get("calyx") or bpy.data.textures.new("calyx", "VORONOI")
    t1.noise_scale = r * 0.55
    t2 = bpy.data.textures.get("nug_clouds") or bpy.data.textures.new("nug_clouds", "CLOUDS")
    t2.noise_scale = r * 0.9
    for nm, tx, st in (("calyx", t1, r * 0.38), ("lumps", t2, r * 0.3)):
        d = ob.modifiers.new(nm, "DISPLACE")
        d.texture = tx
        d.strength = st
        d.mid_level = 0.5
    gn = ob.modifiers.new("calyxes", "NODES")
    gn.node_group = nug_nodes(material)
    return ob


def hot(name, *objs):
    """Remember a clickable prop: the web page gets its on-screen box."""
    ANCH["rects"].setdefault(name, [])
    ANCH["rects"][name] += [o.name for o in objs]


# ------------------------------------------------------------------ the city: sidewalk, street, glass towers, lamp, hydrant
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 2, 0))
walk = bpy.context.active_object
walk.name = "sidewalk"
walk.scale = (40, 12, 1)
walk.data.materials.append(CONCRETE)
box("curb", (40, 0.3, 0.16), (0, -3.95, 0.02), CURB, bev=0.02)
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -12, -0.1))
road = bpy.context.active_object
road.scale = (60, 16, 1)
road.data.materials.append(ASPHALT)
TOWER = mat("tower_glass", (0.18, 0.28, 0.36), metal=0.85, rough=0.05)
_tn = TOWER.node_tree
_br = _tn.nodes.new("ShaderNodeTexBrick")
_br.offset = 0.0
_br.inputs["Scale"].default_value = 0.62
_br.inputs["Color1"].default_value = (1.0, 0.82, 0.55, 1)
_br.inputs["Color2"].default_value = (0.02, 0.02, 0.03, 1)
_br.inputs["Mortar"].default_value = (0, 0, 0, 1)
_br.inputs["Brick Width"].default_value = 1.6
_br.inputs["Row Height"].default_value = 1.4
_br.inputs["Bias"].default_value = 0.72
_tc = _tn.nodes.new("ShaderNodeTexCoord")
_tn.links.new(_tc.outputs["Object"], _br.inputs["Vector"])
_tn.links.new(_br.outputs["Color"], pbsdf(_tn).inputs["Emission Color"])
MULL = mat("mullion", (0.1, 0.12, 0.13), metal=0.8, rough=0.3)
for bx, by, bw, bh, rz in ((-6, 16, 18, 34, 0), (11, 13, 10, 28, -0.35), (-17, 10, 8, 22, 0.5)):
    t = box("tower_%d" % bx, (bw, 0.6, bh), (bx, by, bh / 2), TOWER, bev=0, rot=(0, 0, rz))
    for i in range(int(bw / 1.6) + 1):   # vertical mullions
        m = box("mv_%d_%d" % (bx, i), (0.08, 0.3, bh), (0, 0, 0), MULL, bev=0)
        m.parent = t
        m.location = (-bw / 2 + i * 1.6, -0.45, 0)
    for j in range(int(bh / 1.4) + 1):   # floor lines
        m = box("mh_%d_%d" % (bx, j), (bw, 0.3, 0.1), (0, 0, 0), MULL, bev=0)
        m.parent = t
        m.location = (0, -0.45, -bh / 2 + j * 1.4)
box("tower_base", (60, 0.5, 4.2), (0, 9.5, 2.1), mat("storefront", (0.08, 0.09, 0.1), metal=0.6, rough=0.2), bev=0)
# street lamp
POLE = mat("lamp_pole", (0.02, 0.05, 0.035), metal=0.6, rough=0.4)
LPX, LPY = -3.0, -0.3
cyl("lamp_pole", 0.07, 4.6, (LPX, LPY, 2.3), POLE, verts=24)
cyl("lamp_base", 0.13, 0.35, (LPX, LPY, 0.175), POLE, verts=24, r2=0.09)
cyl("lamp_arm", 0.04, 0.9, (LPX + 0.45, LPY, 4.55), POLE, rot=(0, math.pi / 2, 0), verts=16)
lamp_head = cyl("lamp_head", 0.28, 0.25, (LPX + 0.9, LPY, 4.45), POLE, verts=32, r2=0.08)
lamp_bulb = sphere("lamp_bulb", 0.13, (LPX + 0.9, LPY, 4.3), LAMPGLOW)
# hydrant
HYD = mat("hydrant", (0.55, 0.06, 0.03), rough=0.4, coat=0.3)
cyl("hydrant", 0.13, 0.62, (3.4, -3.3, 0.31), HYD, verts=32, bev=0.01)
sphere("hydrant_cap", 0.14, (3.4, -3.3, 0.64), HYD, scale=(1, 1, 0.8))
cyl("hydrant_nozzle", 0.06, 0.34, (3.4, -3.3, 0.45), HYD, rot=(0, math.pi / 2, 0), verts=24)

# ------------------------------------------------------------------ the kiosk body (front face at y=0, 3.2 m wide, window from z 1.03 to 2.35)
W2, DEPTH, TOP = 1.6, 1.6, 2.5
box("plinth", (3.26, 1.66, 0.08), (0, DEPTH / 2, 0.04), TRIM, bev=0.01)
box("wall_left", (0.06, DEPTH, TOP), (-W2 + 0.03, DEPTH / 2, TOP / 2), GREEN)
box("wall_right", (0.06, DEPTH, TOP), (W2 - 0.03, DEPTH / 2, TOP / 2), GREEN)
box("wall_back", (3.2, 0.06, TOP), (0, DEPTH - 0.03, TOP / 2), GREEN)
box("pillar_left", (0.5, 0.08, TOP), (-1.35, 0.0, TOP / 2), GREEN, bev=0.006)
box("pillar_right", (0.5, 0.08, TOP), (1.35, 0.0, TOP / 2), GREEN, bev=0.006)
box("header", (2.2, 0.08, 0.16), (0, 0.0, 2.42), GREEN)
box("base_panel", (2.2, 0.08, 0.96), (0, 0.0, 0.52), GREEN)
for x in (-1.1, 1.1):
    box("jamb_%s" % x, (0.05, 0.1, 1.33), (x, -0.005, 1.68), TRIM, bev=0.005)
for z in (0.1, 1.0, 2.34):
    box("rail_%s" % z, (3.22, 0.1, 0.035), (0, -0.01, z), TRIM, bev=0.004)
def moulding(name, cx, cz, w, h, y=-0.045):
    for k, (sx_, sz_, px, pz) in enumerate(((w, 0.018, 0, h / 2), (w, 0.018, 0, -h / 2), (0.018, h, -w / 2, 0), (0.018, h, w / 2, 0))):
        box("%s_m%d" % (name, k), (sx_, 0.012, sz_), (cx + px, y, cz + pz), TRIM, bev=0.003)


for x in (-1.35, 1.35):
    moulding("pillar_up_%s" % x, x, 1.97, 0.38, 0.62)
    moulding("pillar_lo_%s" % x, x, 0.5, 0.38, 0.72)
moulding("base_frame", 0, 0.52, 2.08, 0.86)

# the roof and awning with its sign band
box("roof", (3.7, 2.2, 0.12), (0, 0.72, 2.56), TRIM, bev=0.01)
box("awning_top", (3.8, 2.3, 0.05), (0, 0.72, 2.64), GREEN, bev=0.01)
box("fascia", (3.8, 0.06, 0.34), (0, -0.4, 2.62), GREEN, bev=0.008)
box("fascia_trim_t", (3.82, 0.08, 0.03), (0, -0.41, 2.79), GOLD, bev=0.003)
box("fascia_trim_b", (3.82, 0.08, 0.03), (0, -0.41, 2.46), GOLD, bev=0.003)
for x in (-1.85, 1.85):
    box("fascia_side_%s" % x, (0.06, 2.3, 0.34), (x, 0.72, 2.62), GREEN, bev=0.008)
quad("sign", [(-1.62, -0.435, 2.76), (1.62, -0.435, 2.76), (1.62, -0.435, 2.49), (-1.62, -0.435, 2.49)], mat("sign_panel", (0.012, 0.045, 0.028), rough=0.5, emit=(0.1, 0.35, 0.2), estr=0.0))
quad("marquee", [(-1.0, -0.045, 2.49), (1.0, -0.045, 2.49), (1.0, -0.045, 2.36), (-1.0, -0.045, 2.36)], mat("marquee_panel", (0.85, 0.8, 0.66), rough=0.6))

# ------------------------------------------------------------------ the interior: vendor floor, back counter, shelves, jars, smoke shop, TV
box("interior_wall", (2.2, 0.02, 2.3), (0, 1.5, 1.2), CREAM, bev=0)
FLOOR = bricks("floor_tiles", (0.12, 0.1, 0.08), (0.62, 0.58, 0.5), (0.2, 0.19, 0.17), 3.2, rough=0.6)
box("interior_floor", (2.2, 1.5, 0.02), (0, 0.78, 0.075), FLOOR, bev=0)
box("interior_ceiling", (2.2, 1.5, 0.03), (0, 0.78, 2.35), CREAM, bev=0)
box("light_strip", (1.8, 0.05, 0.02), (0, 0.2, 2.32), STRIP, bev=0)
# back counter along the back wall, with tomorrow's bundles on it
box("back_counter", (2.1, 0.34, 0.88), (0, 1.31, 0.52), GREEN, bev=0.006)
box("back_counter_top", (2.14, 0.38, 0.04), (0, 1.3, 0.98), WOOD, bev=0.006)
TWINE = mat("twine", (0.6, 0.48, 0.3), rough=0.9)
NEWS = noisy("newsprint", (0.62, 0.6, 0.55), (0.78, 0.76, 0.7), scale=90, rough=0.85, bump=0.02)
for bx_, n_, rz_ in ((-0.72, 14, 0.05), (-0.3, 10, -0.08), (0.45, 12, 0.12), (0.85, 16, -0.04)):
    by_ = 1.3
    for k in range(n_):
        box("bundle_%s_%d" % (bx_, k), (0.34, 0.25, 0.011), (bx_ + math.sin(k * 1.7) * 0.006, by_ + math.cos(k * 2.3) * 0.006, 1.006 + k * 0.0115), NEWS, bev=0.001,
            rot=(0, 0, rz_ + math.sin(k) * 0.02))
    h_ = n_ * 0.0115
    box("twine_a_%s" % bx_, (0.006, 0.26, h_ + 0.006), (bx_, by_, 1.002 + h_ / 2), TWINE, bev=0.001, rot=(0, 0, rz_))
    box("twine_b_%s" % bx_, (0.35, 0.006, h_ + 0.006), (bx_, by_, 1.002 + h_ / 2), TWINE, bev=0.001, rot=(0, 0, rz_))
for z in (2.02, 1.6):
    box("shelf_%s" % z, (2.1, 0.32, 0.03), (0, 1.32, z), DARKWOOD, bev=0.004)
    for x in (-1.0, 0, 1.0):
        box("bracket_%s_%s" % (z, x), (0.02, 0.26, 0.06), (x, 1.34, z - 0.045), BRASS, bev=0.002)
# the jars: real buds, frosty, with orange hairs
JAR_NAMES = [("First Light", "Haze", (0.2, 0.36, 0.08), (0.55, 0.62, 0.22)), ("Big Fix", "OG", (0.1, 0.25, 0.06), (0.3, 0.45, 0.14)),
             ("Crash Cart", "Kush", (0.16, 0.12, 0.22), (0.35, 0.42, 0.18)), ("Front Page", "Purple", (0.2, 0.08, 0.24), (0.42, 0.22, 0.42)),
             ("Belly Laugh", "Blue", (0.1, 0.2, 0.22), (0.35, 0.46, 0.38)), ("Payday", "Punch", (0.25, 0.28, 0.06), (0.55, 0.5, 0.16)),
             ("Keeper's", "Reserve", (0.08, 0.22, 0.1), (0.28, 0.5, 0.26))]
LABEL = mat("jar_label", (0.94, 0.9, 0.78), rough=0.8)
INK = mat("ink", (0.08, 0.05, 0.03), rough=0.6)
LID = mat("jar_lid", (0.8, 0.62, 0.22), metal=1.0, rough=0.3)
JAR_X = []
for i, (l1, l2, c1, c2) in enumerate(JAR_NAMES):
    x = -0.52 + i * 0.245
    JAR_X.append(x)
    g = cyl("jar_%d" % i, 0.092, 0.26, (x, 1.3, 2.165), JARGLASS, verts=48)
    cyl("jar_%d_lid" % i, 0.076, 0.035, (x, 1.3, 2.315), LID, verts=48, bev=0.004)
    cyl("jar_%d_band" % i, 0.084, 0.03, (x, 1.3, 2.29), LID, verts=48, bev=0.003)
    bm_ = frosty("bud_%d" % i, c1, c2)
    k = 0
    for layer, (zz, n_) in enumerate(((2.075, 5), (2.13, 5), (2.18, 3))):
        for q in range(n_):
            a = q * (2 * math.pi / n_) + layer * 0.7
            rr = 0.045 if n_ > 3 else 0.028
            bud("jar_%d_bud_%d" % (i, k), 0.026 + (q % 3) * 0.004, (x + math.cos(a) * rr, 1.3 + math.sin(a) * rr, zz), bm_, rot=(0.3 * math.sin(a), 0.3 * math.cos(a), a))
            k += 1
    quad("jar_%d_label" % i, [(x - 0.07, 1.204, 2.125), (x + 0.07, 1.204, 2.125), (x + 0.07, 1.204, 2.045), (x - 0.07, 1.204, 2.045)], LABEL)
    hot("jar_%d" % i, g)
# the smoke shop on the middle shelf: rolling papers, pre-rolls, glass pipes, price tags
shop = []
PACK_COLS = [(0.6, 0.12, 0.08), (0.12, 0.3, 0.55), (0.16, 0.42, 0.18), (0.55, 0.36, 0.08), (0.38, 0.14, 0.45), (0.12, 0.42, 0.4), (0.6, 0.3, 0.1), (0.25, 0.25, 0.5)]
PAPERS_BOX = mat("papers_box", (0.75, 0.62, 0.3), rough=0.6)
box("papers_display", (0.3, 0.16, 0.05), (-0.72, 1.3, 1.64), PAPERS_BOX, bev=0.004)
BOOK_COLS = [(0.85, 0.82, 0.72), (0.12, 0.35, 0.18), (0.55, 0.1, 0.08), (0.1, 0.2, 0.45)]
for r_ in range(2):
    for k in range(6):
        bk = box("papers_pack_%d_%d" % (r_, k), (0.045, 0.012, 0.07), (-0.84 + k * 0.047, 1.26 + r_ * 0.06, 1.7 + r_ * 0.015), mat("book_%d" % (k % 4), BOOK_COLS[k % 4], rough=0.5),
                 bev=0.002, rot=(-0.25, 0, 0))
        shop.append(bk)
tube_cols = [(0.2, 0.5, 0.25), (0.6, 0.2, 0.5), (0.9, 0.6, 0.1), (0.2, 0.4, 0.7), (0.8, 0.2, 0.15)]
cyl("preroll_jar", 0.06, 0.16, (-0.35, 1.3, 1.695), JARGLASS, verts=40)
for k in range(9):
    a = k * 2.2
    j_ = cyl("preroll_%d" % k, 0.0062, 0.13, (-0.35 + math.cos(a) * 0.028, 1.3 + math.sin(a) * 0.028, 1.7), PAPER, rot=(0.12 * math.cos(a), 0.12 * math.sin(a), 0), verts=16, r2=0.0085)
    shop.append(j_)
for k, c_ in enumerate(tube_cols):
    t_ = cyl("doob_tube_%d" % k, 0.011, 0.12, (-0.12 + k * 0.03, 1.32, 1.675), mat("tube_%d" % k, c_, rough=0.25, coat=0.5), verts=20, bev=0.003)
    shop.append(t_)
def swirl_glass(name, c1, c2):
    """Fumed/swirled borosilicate: two colours wound through clear glass."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = pbsdf(nt)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    wv = nt.nodes.new("ShaderNodeTexWave")
    wv.wave_type = "BANDS"
    wv.inputs["Scale"].default_value = 6.0
    wv.inputs["Distortion"].default_value = 9.0
    wv.inputs["Detail"].default_value = 3.0
    nt.links.new(tc.outputs["Object"], wv.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*c1, 1)
    ramp.color_ramp.elements[1].color = (*c2, 1)
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[1].position = 0.65
    nt.links.new(wv.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    setin(b, "Roughness", 0.06)
    setin(b, ("Transmission Weight", "Transmission"), 0.45)
    setin(b, "IOR", 1.47)
    setin(b, ("Coat Weight", "Clearcoat"), 0.6)
    return m


CLEAR = mat("boro_clear", (0.92, 0.97, 0.95), rough=0.02, transm=1.0, ior=1.47)
BONGWATER = mat("bong_water", (0.72, 0.85, 0.78), rough=0.02, transm=1.0, ior=1.33)
HOLE = mat("pipe_hole", (0.02, 0.02, 0.02), rough=0.5)
SH = 1.61   # the shelf top
for k, (px_, c1, c2) in enumerate(((0.12, (0.1, 0.35, 0.6), (0.85, 0.9, 0.95)), (0.31, (0.55, 0.2, 0.5), (0.95, 0.7, 0.3)))):
    gm = swirl_glass("spoon_glass_%d" % k, c1, c2)
    cradle = box("pipe_cradle_%d" % k, (0.13, 0.05, 0.012), (px_, 1.3, SH + 0.006), DARKWOOD, bev=0.003)
    head = sphere("spoon_head_%d" % k, 0.034, (px_ - 0.035, 1.3, SH + 0.04), gm, seg=32, scale=(1.15, 1.0, 0.82))
    body = sphere("spoon_body_%d" % k, 0.03, (px_ + 0.01, 1.3, SH + 0.036), gm, seg=32, scale=(1.9, 0.78, 0.66))
    neck = cyl("spoon_neck_%d" % k, 0.0125, 0.06, (px_ + 0.065, 1.3, SH + 0.034), gm, rot=(0, math.pi / 2 - 0.05, 0), verts=24, r2=0.0105)
    cyl("spoon_bowl_%d" % k, 0.012, 0.006, (px_ - 0.04, 1.3, SH + 0.066), HOLE, verts=24)
    cyl("spoon_carb_%d" % k, 0.004, 0.004, (px_ - 0.02, 1.3 - 0.022, SH + 0.036), HOLE, rot=(math.pi / 2, 0, 0), verts=12)
    for d in range(5):   # dots of frit
        sphere("spoon_dot_%d_%d" % (k, d), 0.0045, (px_ - 0.05 + d * 0.022, 1.3 - 0.024 + (d % 2) * 0.002, SH + 0.036 + (d % 3) * 0.006), mat("frit_%d" % d, [(0.9, 0.2, 0.2), (0.95, 0.8, 0.2), (0.2, 0.7, 0.4), (0.3, 0.4, 0.9), (0.95, 0.95, 0.95)][d], rough=0.1))
    shop += [cradle, head, body, neck]


def bong(name, bx, h, accent, beaker=True):
    parts = []
    by_ = 1.3
    if beaker:
        parts.append(cyl(name + "_base", 0.058, 0.11, (bx, by_, SH + 0.055), CLEAR, verts=48, r2=0.024))
        cyl(name + "_water", 0.05, 0.035, (bx, by_, SH + 0.02), BONGWATER, verts=48, r2=0.042)
        tube_z0 = SH + 0.11
    else:
        parts.append(cyl(name + "_foot", 0.05, 0.01, (bx, by_, SH + 0.005), CLEAR, verts=48))
        parts.append(cyl(name + "_chamber", 0.026, 0.1, (bx, by_, SH + 0.06), CLEAR, verts=40))
        cyl(name + "_water", 0.022, 0.05, (bx, by_, SH + 0.035), BONGWATER, verts=32)
        tube_z0 = SH + 0.11
    tl = h - (tube_z0 - SH)
    parts.append(cyl(name + "_tube", 0.022, tl, (bx, by_, tube_z0 + tl / 2), CLEAR, verts=40))
    parts.append(cyl(name + "_mouth", 0.022, 0.025, (bx, by_, SH + h + 0.01), accent, verts=40, r2=0.029))
    for q in range(3):   # ice pinches
        a = q * 2.1
        sphere(name + "_pinch_%d" % q, 0.005, (bx + math.cos(a) * 0.02, by_ + math.sin(a) * 0.02, tube_z0 + tl * 0.45), CLEAR)
    cyl(name + "_ring", 0.0235, 0.01, (bx, by_, tube_z0 + tl * 0.8), accent, verts=40)
    # downstem into the base, with the bowl piece sticking out front-left
    ds = Vector((bx - 0.045, by_ - 0.025, SH + 0.1))
    cyl(name + "_downstem", 0.007, 0.09, tuple(ds + Vector((0.018, 0.01, -0.03))), CLEAR, rot=(0.35, -0.7, 0), verts=16)
    parts.append(sphere(name + "_bowl", 0.017, tuple(ds), accent, seg=24, scale=(1, 1, 0.8)))
    cyl(name + "_bowl_hole", 0.009, 0.004, tuple(ds + Vector((0, 0, 0.012))), HOLE, verts=16)
    return parts


shop += bong("bong_a", 0.52, 0.3, swirl_glass("bong_accent_a", (0.1, 0.5, 0.3), (0.2, 0.8, 0.5)), beaker=True)
shop += bong("bong_b", 0.7, 0.24, swirl_glass("bong_accent_b", (0.6, 0.15, 0.1), (0.95, 0.55, 0.2)), beaker=False)
shop += bong("bong_c", 0.88, 0.33, swirl_glass("bong_accent_c", (0.15, 0.25, 0.7), (0.5, 0.7, 0.95)), beaker=True)
TAG = mat("price_tag", (0.97, 0.95, 0.85), rough=0.7)
for k, (tx_, word) in enumerate(((-0.72, "PAPERS 15"), (-0.3, "PRE-ROLLS 25"), (0.21, "PIPES 60"), (0.7, "BONGS 120"))):
    box("tag_%d" % k, (0.08, 0.002, 0.03), (tx_, 1.15, 1.615), TAG, bev=0.001, rot=(0.3, 0, 0))
    text("tag_text_%d" % k, word, (tx_, 1.148, 1.616), 0.009, INK, font="bahnschrift.ttf", rot=(math.pi / 2 + 0.3, 0, 0), extrude=0.0003)
hot("shop", *shop)
text("shop_sign", "SMOKE SHOP · PAID IN GARDEN BUCKS", (0, 1.155, 1.585), 0.024, GOLD, font="georgiab.ttf", extrude=0.001)
# the little square TV, hung from the ceiling in the front-left corner
TVX, TVY, TVZ, TVR = -0.8, 0.36, 2.0, 0.28
tvm = Matrix.Translation((TVX, TVY, TVZ)) @ Matrix.Rotation(TVR, 4, "Z")
TVBODY = mat("tv_body", (0.05, 0.045, 0.04), rough=0.45)
tv = box("tv_body", (0.36, 0.32, 0.3), (TVX, TVY, TVZ), TVBODY, bev=0.025, rot=(0, 0, TVR))
box("tv_bezel", (0.34, 0.01, 0.28), tuple(tvm @ Vector((0, -0.16, 0))), mat("tv_bezel", (0.1, 0.09, 0.08), rough=0.4), bev=0.01, rot=(0, 0, TVR))
quad("tv_screen", [tuple(tvm @ Vector(c)) for c in ((-0.15, -0.167, 0.105), (0.08, -0.167, 0.105), (0.08, -0.167, -0.105), (-0.15, -0.167, -0.105))],
     mat("tv_glass", (0.02, 0.03, 0.03), rough=0.08, emit=(0.4, 0.6, 0.7), estr=0.0))
for k, zk in enumerate((0.06, -0.01)):
    cyl("tv_knob_%d" % k, 0.018, 0.02, tuple(tvm @ Vector((0.125, -0.168, zk))), CHROME, rot=(math.pi / 2, 0, TVR), verts=20, bev=0.003)
for k in range(5):
    box("tv_vent_%d" % k, (0.05, 0.004, 0.006), tuple(tvm @ Vector((0.125, -0.166, -0.06 - k * 0.012))), BLACK, bev=0.001, rot=(0, 0, TVR))
cyl("tv_pole", 0.012, 0.19, (TVX, TVY, 2.24), STEEL, verts=16)
box("tv_mount", (0.12, 0.12, 0.012), (TVX, TVY, 2.34), STEEL, bev=0.002)
for sgn in (-1, 1):
    cyl("tv_antenna_%d" % sgn, 0.003, 0.28, tuple(tvm @ Vector((sgn * 0.05, 0.02, 0.26))), CHROME, rot=(0, sgn * 0.5, TVR), verts=8)
sphere("tv_antenna_base", 0.02, tuple(tvm @ Vector((0, 0.02, 0.155))), BLACK)
hot("tv", tv)

# ------------------------------------------------------------------ under the counter (behind): shelves, stash box, cash box, scrapbook, bowls
box("under_top", (2.2, 0.4, 0.04), (0, 0.27, 0.985), WOOD, bev=0.004)
for z in (0.36, 0.67):
    box("under_shelf_%s" % z, (2.12, 0.38, 0.022), (0, 0.26, z), DARKWOOD, bev=0.003)
for x in (-1.07, 1.07):
    box("under_side_%s" % x, (0.03, 0.4, 0.9), (x, 0.26, 0.53), DARKWOOD, bev=0.003)
sb = box("stash_box", (0.34, 0.22, 0.1), (-0.58, 0.27, 0.42), DARKWOOD, bev=0.006)
lid = box("stash_lid", (0.35, 0.23, 0.03), (-0.58, 0.27, 0.485), DARKWOOD, bev=0.008)
box("stash_latch", (0.035, 0.012, 0.04), (-0.58, 0.385, 0.45), BRASS, bev=0.003)
text("stash_word", "STASH", (-0.58, 0.27, 0.502), 0.06, mat("stencil", (0.9, 0.82, 0.6), rough=0.7), font="impact.ttf", rot=(0, 0, math.pi), extrude=0.0008)
hot("stash", sb, lid)
LEATHER = noisy("leather", (0.2, 0.08, 0.04), (0.32, 0.14, 0.07), scale=120, rough=0.55, bump=0.2)
album = box("scrapbook", (0.3, 0.24, 0.07), (0.12, 0.27, 0.41), LEATHER, bev=0.01)
box("scrapbook_pages", (0.29, 0.225, 0.05), (0.125, 0.27, 0.41), PAPER, bev=0.002)
text("scrapbook_word", "SCRAPBOOK", (0.12, 0.27, 0.447), 0.03, GOLD, font="georgiab.ttf", rot=(0, 0, math.pi), extrude=0.0006)
for k in range(4):
    box("photo_corner_%d" % k, (0.04, 0.002, 0.03), (0.02 + k * 0.07, 0.385, 0.425), PAPER, bev=0.001, rot=(0, 0, 0.05 * k))
hot("drawer", album)
# ---- the point of sale: a cash drawer hung under the counter top, and a monitor, keyboard and mouse on it
TEX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tex")


def imgmat(name, path, rough=0.75, metal=0.0, alpha=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = pbsdf(m.node_tree)
    t = m.node_tree.nodes.new("ShaderNodeTexImage")
    t.image = bpy.data.images.load(path)
    m.node_tree.links.new(t.outputs["Color"], b.inputs["Base Color"])
    setin(b, "Roughness", rough)
    if metal:
        setin(b, "Metallic", metal)
        bump = m.node_tree.nodes.new("ShaderNodeBump")   # the stamped relief, from the face art itself
        bump.inputs["Strength"].default_value = 0.8
        bump.inputs["Distance"].default_value = 0.0004
        m.node_tree.links.new(t.outputs["Color"], bump.inputs["Height"])
        m.node_tree.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    if alpha:
        m.node_tree.links.new(t.outputs["Alpha"], b.inputs["Alpha"])
        m.blend_method = "HASHED" if hasattr(m, "blend_method") else None
    return m


def plane(name, size, loc, material, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (size[0], size[1], 1)
    ob.data.materials.append(material)
    return ob


DX, DY, DZ = 0.55, 0.26, 0.905          # drawer housing centre (under the counter top, whose underside is at z 0.965)
TRAVEL = 0.36                           # how far the tray slides out
HOUSING = mat("pos_steel", (0.1, 0.1, 0.11), metal=0.7, rough=0.4)
TRAYPL = mat("pos_tray", (0.03, 0.03, 0.035), rough=0.55)
housing = box("drawer_housing", (0.46, 0.4, 0.11), (DX, DY - 0.02, DZ), HOUSING, bev=0.004)
drawer_tray_ob = link(bpy.data.objects.new("drawer_tray", None))
tray_parts = []


def tp(ob):
    ob.parent = drawer_tray_ob
    tray_parts.append(ob)
    return ob


front = tp(box("drawer_front", (0.46, 0.022, 0.1), (DX, 0.47, DZ - 0.003), TRAYPL, bev=0.006))
tp(box("drawer_lip", (0.3, 0.03, 0.01), (DX, 0.475, DZ - 0.055), TRAYPL, bev=0.003))
tp(cyl("drawer_lock", 0.011, 0.012, (DX - 0.17, 0.483, DZ + 0.01), CHROME, rot=(math.pi / 2, 0, 0), verts=20, bev=0.002))
tp(box("drawer_lock_slot", (0.002, 0.004, 0.012), (DX - 0.17, 0.49, DZ + 0.01), BLACK, bev=0))
tp(box("tray_base", (0.43, 0.38, 0.006), (DX, 0.27, DZ - 0.045), TRAYPL, bev=0.002))
for sx_ in (-1, 1):
    tp(box("tray_side_%d" % sx_, (0.006, 0.38, 0.06), (DX + sx_ * 0.212, 0.27, DZ - 0.015), TRAYPL, bev=0.001))
tp(box("tray_back", (0.43, 0.006, 0.06), (DX, 0.083, DZ - 0.015), TRAYPL, bev=0.001))
# five bill compartments at the back (bills lie front-to-back), five coin cups at the front
def coin(name, r, t, loc, rot, edge, face):
    """A coin: smooth rim, flat faces with the stamped art mapped straight on (no separate decal)."""
    ob = cyl(name, r, t, loc, edge, rot=rot, verts=48)
    me = ob.data
    me.materials.append(face)
    uv = me.uv_layers.active.data
    for poly in me.polygons:
        if abs(poly.normal.z) > 0.9:
            poly.material_index = 1
            poly.use_smooth = False
            for li in poly.loop_indices:
                co = me.vertices[me.loops[li].vertex_index].co
                uv[li].uv = (co.x / (2 * r) + 0.5, co.y / (2 * r) + 0.5)
    return ob


BILLS = [1, 5, 10, 20, 50]
BILLMAT = {n: imgmat("bill_%d" % n, os.path.join(TEX, "bill_%d.png" % n), rough=0.85) for n in BILLS + [100]}
EDGE = mat("bill_edge", (0.8, 0.82, 0.74), rough=0.95)
tp(box("bill_divider_row", (0.42, 0.006, 0.05), (DX, 0.33, DZ - 0.02), TRAYPL, bev=0.001))


def jit(k, a=1.0):   # a hash in -0.5..0.5 (uncorrelated between neighbouring seeds)
    v = math.sin(k * 12.9898 + a * 78.233) * 43758.5453
    return v - math.floor(v) - 0.5


for i, n in enumerate(BILLS):
    cx_ = DX + 0.168 - i * 0.084       # $1 on the vendor's left (+x), $50 on the right
    if i:
        tp(box("bill_divider_%d" % i, (0.004, 0.24, 0.045), (cx_ + 0.042, 0.205, DZ - 0.02), TRAYPL, bev=0.001))
    count = [38, 22, 17, 26, 7][i]
    h = 0.0011 + count * 0.00011
    base_z = DZ - 0.042
    tp(box("bill_stack_%d" % n, (0.064, 0.154, h), (cx_, 0.205, base_z + h / 2), EDGE, bev=0.0003))
    for k in range(6):   # the top notes, each a little askew, one or two sticking out
        z_ = base_z + h + 0.0003 + k * 0.00035
        tp(plane("bill_%d_%d" % (n, k), (0.156, 0.066), (cx_ + jit(k, n) * 0.004, 0.205 + jit(k + 3, n) * 0.008, z_), BILLMAT[n],
                 rot=(0, 0, math.pi / 2 + jit(k + 7, n) * 0.06)))
    top_z = base_z + h + 0.0025
    tp(box("bill_clip_%d" % n, (0.058, 0.012, 0.004), (cx_, 0.25, top_z + 0.003), CHROME, bev=0.0015))
    tp(box("bill_clip_arm_%d" % n, (0.006, 0.16, 0.003), (cx_, 0.17, top_z + 0.011), CHROME, bev=0.001, rot=(-0.06, 0, 0)))
    tp(cyl("bill_clip_hinge_%d" % n, 0.004, 0.02, (cx_, 0.093, top_z + 0.017), CHROME, rot=(0, math.pi / 2, 0), verts=12))
# the hundreds, tucked under the coin tray with their ends showing
for k in range(4):
    tp(plane("bill_100_%d" % k, (0.156, 0.066), (DX - 0.1 + k * 0.004, 0.4 + k * 0.004, DZ - 0.0419 + k * 0.00005), BILLMAT[100], rot=(0, 0, 0.04 * (k - 1.5))))
# coins by the cup
CUP = mat("coin_cup", (0.05, 0.05, 0.055), rough=0.5)
COIN = [(1, 0.0095, 0.0015, (0.62, 0.34, 0.2)), (5, 0.0106, 0.0019, (0.72, 0.72, 0.7)), (10, 0.009, 0.0013, (0.78, 0.78, 0.77)),
        (25, 0.0121, 0.0017, (0.75, 0.75, 0.74)), (100, 0.0133, 0.002, (0.8, 0.64, 0.3))]
for i, (n, r_, t_, col) in enumerate(COIN):
    cx_ = DX + 0.168 - i * 0.084
    tp(box("coin_cup_%d" % i, (0.074, 0.1, 0.004), (cx_, 0.395, DZ - 0.0392), CUP, bev=0.002))   # a hollow cup: floor and four walls
    for sx_ in (-1, 1):
        tp(box("coin_cup_%d_x%d" % (i, sx_), (0.004, 0.1, 0.03), (cx_ + sx_ * 0.035, 0.395, DZ - 0.03), CUP, bev=0.0015))
        tp(box("coin_cup_%d_y%d" % (i, sx_), (0.074, 0.004, 0.03), (cx_, 0.395 + sx_ * 0.048, DZ - 0.03), CUP, bev=0.0015))
    edge = mat("coin_edge_%d" % n, col, metal=0.6, rough=0.58)
    face = imgmat("coin_face_%d" % n, os.path.join(TEX, "coin_%d.png" % n), rough=0.62, metal=0.5, alpha=False)
    floor_z = DZ - 0.0372
    placed = []
    for k in range(22):   # a loose, overlapping pile, two layers deep, the way coins actually sit in a till
        layer = k // 12
        placed.append((cx_ + jit(k * 7 + 11, n) * 0.05, 0.395 + jit(k * 13 + 5, n + 3) * 0.075, floor_z + t_ * (0.5 + layer) + (0.0004 if layer else 0),
                       jit(k * 3 + 31, n) * 0.3, jit(k * 5 + 37, n) * 0.3, jit(k + 23, n) * 12))
    for k, (x_, y_, z_, rx_, ry_, rz_) in enumerate(placed):
        tp(coin("coin_%d_%d" % (n, k), r_, t_, (x_, y_, z_), (rx_, ry_, rz_), edge, face))
hot("cashbox", housing, front)
# the monitor, keyboard and mouse on the counter top (behind the brass register, so it's hidden from out front)
TOPZ = 1.005
MX, MY = 0.55, 0.2
PLASTIC = mat("pos_plastic", (0.035, 0.035, 0.04), rough=0.45)
box("monitor_base", (0.16, 0.12, 0.01), (MX, MY - 0.01, TOPZ + 0.005), PLASTIC, bev=0.004)
box("monitor_neck", (0.04, 0.018, 0.1), (MX, MY - 0.025, TOPZ + 0.06), PLASTIC, bev=0.004)
MM = Matrix.Translation((MX, MY, 1.145)) @ Matrix.Rotation(0.2, 4, "X")
mon = box("monitor_body", (0.31, 0.024, 0.2), tuple(MM @ Vector((0, 0, 0))), PLASTIC, bev=0.006, rot=(0.2, 0, 0))
quad("pos_screen", [tuple(MM @ Vector(c)) for c in ((0.143, 0.0125, 0.088), (-0.143, 0.0125, 0.088), (-0.143, 0.0125, -0.088), (0.143, 0.0125, -0.088))],
     mat("pos_glass", (0.01, 0.02, 0.03), rough=0.12, emit=(0.2, 0.5, 0.6), estr=0.3))
kbm = Matrix.Translation((MX, 0.37, TOPZ + 0.009)) @ Matrix.Rotation(0.06, 4, "X")
kbd = box("keyboard", (0.34, 0.11, 0.014), tuple(kbm @ Vector((0, 0, 0))), PLASTIC, bev=0.004, rot=(0.06, 0, 0))
KEYCAP = mat("keycap", (0.12, 0.12, 0.13), rough=0.5)
for r_ in range(4):
    for k in range(14):
        kx = 0.143 - k * 0.022
        box("key_%d_%d" % (r_, k), (0.018, 0.018, 0.008), tuple(kbm @ Vector((kx, -0.035 + r_ * 0.022, 0.009))), KEYCAP, bev=0.002, rot=(0.06, 0, 0))
box("key_space", (0.13, 0.018, 0.008), tuple(kbm @ Vector((0, 0.053, 0.009))), KEYCAP, bev=0.002, rot=(0.06, 0, 0))
box("mouse_pad", (0.17, 0.14, 0.003), (MX - 0.3, 0.35, TOPZ + 0.0015), mat("mouse_pad", (0.08, 0.2, 0.13), rough=0.9), bev=0.002)
mouse = sphere("mouse", 0.03, (MX - 0.3, 0.36, TOPZ + 0.012), PLASTIC, scale=(0.62, 1.0, 0.4))
cu2 = bpy.data.curves.new("mouse_cord", "CURVE")
cu2.dimensions = "3D"
cu2.bevel_depth = 0.0018
sp2 = cu2.splines.new("BEZIER")
sp2.bezier_points.add(2)
for bp_, pt in zip(sp2.bezier_points, ((MX - 0.3, 0.33, TOPZ + 0.01), (MX - 0.26, 0.24, TOPZ + 0.004), (MX - 0.12, 0.16, TOPZ + 0.004))):
    bp_.co = pt
    bp_.handle_left_type = bp_.handle_right_type = "AUTO"
cord = link(bpy.data.objects.new("mouse_cord", cu2))
cord.data.materials.append(PLASTIC)
hot("pos", mon, kbd, mouse)
box("lighter", (0.025, 0.012, 0.07), (-0.3, 0.27, 0.406), mat("lighter_red", (0.6, 0.05, 0.03), rough=0.3), bev=0.003)
# Clydius's corner: food bowl, water bowl, a bone
BOWL = mat("steel_bowl", (0.8, 0.8, 0.82), metal=1.0, rough=0.2)
fb_ = cyl("dog_bowl_food", 0.1, 0.06, (-0.88, 0.54, 0.115), BOWL, verts=48, r2=0.075, bev=0.006)
for k in range(22):
    a = k * 2.39
    sphere("kibble_%d" % k, 0.011, (-0.88 + math.cos(a) * 0.05 * (k % 3) / 2, 0.54 + math.sin(a) * 0.05 * (k % 3) / 2, 0.14 + (k % 4) * 0.004),
           mat("kibble", (0.28, 0.14, 0.05), rough=0.8), seg=10, scale=(1, 1, 0.7))
wb_ = cyl("dog_bowl_water", 0.1, 0.06, (-0.88, 0.77, 0.115), BOWL, verts=48, r2=0.075, bev=0.006)
cyl("water", 0.082, 0.004, (-0.88, 0.77, 0.13), mat("water", (0.6, 0.75, 0.8), rough=0.02, transm=1.0, ior=1.33), verts=48)
BONE = mat("bone", (0.92, 0.88, 0.78), rough=0.5)
cyl("bone_shaft", 0.014, 0.16, (-0.64, 0.66, 0.1), BONE, rot=(0, math.pi / 2, 0.5), verts=20)
for sx_ in (-1, 1):
    for sy_ in (-1, 1):
        sphere("bone_knob_%d_%d" % (sx_, sy_), 0.02, (-0.64 + sx_ * 0.07 * math.cos(0.5) - sy_ * 0.012 * math.sin(0.5), 0.66 + sx_ * 0.07 * math.sin(0.5) + sy_ * 0.012 * math.cos(0.5), 0.1), BONE)
text("bowl_name", "CLYDE", (-0.88, 0.443, 0.12), 0.018, INK, font="impact.ttf", rot=(math.pi / 2 - 0.3, 0, 0), extrude=0.0004)
hot("bowl", fb_, wb_)

# ------------------------------------------------------------------ the counter and what sits on it
box("counter_top", (2.26, 0.42, 0.05), (0, -0.13, 1.005), WOOD, bev=0.008)
box("counter_edge", (2.28, 0.03, 0.07), (0, -0.345, 0.995), BRASS, bev=0.004)
for x in (-0.9, 0, 0.9):
    box("counter_bracket_%s" % x, (0.04, 0.28, 0.16), (x, -0.16, 0.9), TRIM, bev=0.004)
CZ = 1.03   # counter surface

# the radio (left)
RX, RY = -0.72, -0.15
radio = box("radio_body", (0.36, 0.17, 0.22), (RX, RY, CZ + 0.115), RED, bev=0.03)
box("radio_grille_bg", (0.15, 0.005, 0.15), (RX - 0.08, RY - 0.086, CZ + 0.11), IVORY, bev=0.005)
for k in range(8):
    box("radio_bar_%d" % k, (0.14, 0.008, 0.007), (RX - 0.08, RY - 0.09, CZ + 0.05 + k * 0.017), BRASS, bev=0.001)
quad("radio_dial", [(RX + 0.02, RY - 0.087, CZ + 0.185), (RX + 0.16, RY - 0.087, CZ + 0.185), (RX + 0.16, RY - 0.087, CZ + 0.13), (RX + 0.02, RY - 0.087, CZ + 0.13)], DIALGLOW)
knob_v = cyl("radio_knob_vol", 0.024, 0.03, (RX + 0.045, RY - 0.095, CZ + 0.075), IVORY, rot=(math.pi / 2, 0, 0), verts=24, bev=0.003)
knob_t = cyl("radio_knob_tune", 0.024, 0.03, (RX + 0.135, RY - 0.095, CZ + 0.075), IVORY, rot=(math.pi / 2, 0, 0), verts=24, bev=0.003)
cyl("radio_handle", 0.012, 0.22, (RX, RY, CZ + 0.245), BRASS, rot=(0, math.pi / 2, 0), verts=16)
for dx in (-0.1, 0.1):
    cyl("radio_post_%s" % dx, 0.01, 0.03, (RX + dx, RY, CZ + 0.232), BRASS, verts=12)
for dx in (-0.14, 0.14):
    box("radio_foot_%s" % dx, (0.04, 0.12, 0.012), (RX + dx, RY, CZ + 0.005), RUBBER, bev=0.003)
for nm, cx_, w_, z0, z1 in (("grille", RX - 0.08, 0.16, CZ + 0.035, CZ + 0.19), ("dial", RX + 0.09, 0.15, CZ + 0.126, CZ + 0.19)):
    for k, (sx_, sz_, px, pz) in enumerate(((w_, 0.006, 0, z1), (w_, 0.006, 0, z0), (0.006, z1 - z0, -w_ / 2, (z0 + z1) / 2), (0.006, z1 - z0, w_ / 2, (z0 + z1) / 2))):
        box("radio_%s_bezel_%d" % (nm, k), (sx_, 0.006, sz_), (cx_ + px, RY - 0.09, pz if k > 1 else pz), CHROME, bev=0.001)
text("radio_brand", "GARDEN-TONE", (RX + 0.09, RY - 0.088, CZ + 0.108), 0.018, mat("brand_gold", (0.95, 0.8, 0.45), metal=1.0, rough=0.3), font="georgiab.ttf", extrude=0.0008)
hot("radio", radio)
hot("radio_vol", knob_v)
hot("radio_tune", knob_t)

# the ashtray with a burning joint
AX, AY = -0.37, -0.17
tray = cyl("ashtray", 0.09, 0.035, (AX, AY, CZ + 0.018), mat("amber_glass", (0.85, 0.5, 0.15), rough=0.08, transm=1.0, ior=1.5), verts=64, bev=0.01)
cyl("ashtray_well", 0.065, 0.02, (AX, AY, CZ + 0.03), mat("ash_dark", (0.12, 0.12, 0.12), rough=0.9), verts=48)
sphere("ash_pile", 0.04, (AX + 0.01, AY + 0.01, CZ + 0.037), ASH, scale=(1.2, 1, 0.3))
for a in (0.4, 2.5, 4.6):   # notches (cigarette rests)
    box("notch_%s" % a, (0.03, 0.012, 0.012), (AX + math.cos(a) * 0.088, AY + math.sin(a) * 0.088, CZ + 0.036), mat("ash_dark"), bev=0.002, rot=(0, 0, a))
ang = 0.4    # the joint rests in a notch: crutch outside, lit end over the ash
d_ = Vector((math.cos(ang), math.sin(ang), 0))
rim = Vector((AX, AY, CZ)) + d_ * 0.088
joint = cyl("joint", 0.0072, 0.075, tuple(rim - d_ * 0.03 + Vector((0, 0, 0.043))), PAPER, rot=(0, math.pi / 2 - 0.08, ang), verts=20)
cyl("joint_filter", 0.0066, 0.018, tuple(rim + d_ * 0.012 + Vector((0, 0, 0.046))), mat("crutch", (0.65, 0.48, 0.28), rough=0.7), rot=(0, math.pi / 2 - 0.08, ang), verts=20)
ember_pos = rim - d_ * 0.07 + Vector((0, 0, 0.04))
sphere("ember", 0.0078, tuple(ember_pos), EMBER, seg=16)
sphere("joint_ash_tip", 0.0072, tuple(ember_pos - d_ * 0.006 + Vector((0, 0, 0.001))), ASH, seg=12, scale=(1.3, 1, 1))
ANCH["points"]["ember"] = list(ember_pos)
hot("ashtray", tray, joint)

# the service bell (search)
BX, BY = 0.21, -0.22
bellb = cyl("bell_base", 0.05, 0.015, (BX, BY, CZ + 0.008), mat("bell_base", (0.05, 0.03, 0.02), rough=0.4), verts=48, bev=0.003)
bell = sphere("bell_dome", 0.042, (BX, BY, CZ + 0.02), CHROME, seg=32, scale=(1, 1, 0.75))
cyl("bell_plunger", 0.006, 0.02, (BX, BY, CZ + 0.06), CHROME, verts=12)
hot("bell", bellb, bell)


BRASS2 = mat("brass_dark", (0.55, 0.36, 0.13), metal=1.0, rough=0.35)
MUG = mat("mug", (0.9, 0.88, 0.82), rough=0.25, coat=0.4)
UX, UY, UZ = 0.84, 0.2, 1.005   # the coffee sits on the back counter top, next to the computer
mug = cyl("mug", 0.04, 0.095, (UX, UY, UZ + 0.048), MUG, verts=40, bev=0.004)
cyl("mug_coffee", 0.036, 0.004, (UX, UY, UZ + 0.086), mat("coffee", (0.08, 0.035, 0.015), rough=0.1), verts=40)
bpy.ops.mesh.primitive_torus_add(major_radius=0.028, minor_radius=0.008, location=(UX, UY + 0.045, UZ + 0.05), rotation=(math.pi / 2, 0, math.pi / 2))
bpy.context.active_object.data.materials.append(MUG)
ANCH["points"]["steam"] = [UX, UY, UZ + 0.1]
# the 3-tier seed case on the counter
SX_, SY_ = -0.03, -0.14
case = []
for t_ in range(3):
    case.append(box("seed_tier_%d" % t_, (0.27, 0.07, 0.05 + t_ * 0.05), (SX_, SY_ - 0.07 + t_ * 0.065, CZ + 0.025 + t_ * 0.025), DARKWOOD, bev=0.003))
    for k in range(3):
        c_ = PACK_COLS[(t_ * 3 + k) % len(PACK_COLS)]
        pk_ = box("seed_packet_%d_%d" % (t_, k), (0.07, 0.004, 0.095), (SX_ - 0.085 + k * 0.085, SY_ - 0.075 + t_ * 0.065, CZ + 0.1 + t_ * 0.05),
                  mat("pack_%d" % ((t_ * 3 + k) % 8), c_, rough=0.6), bev=0.001, rot=(-0.2, 0, 0))
        lb_ = box("seed_packet_%d_%d_lbl" % (t_, k), (0.058, 0.0015, 0.04), (0, 0, 0), PAPER, bev=0.0003)
        child(lb_, pk_, (0, -0.003, -0.02))
        dot = cyl("seed_packet_%d_%d_pic" % (t_, k), 0.012, 0.0015, (0, 0, 0), mat("pack_pic_%d" % ((t_ * 3 + k) % 8), tuple(min(1, v * 1.6) for v in c_), rough=0.5), verts=20)
        child(dot, pk_, (0, -0.0045, -0.018))
        dot.rotation_euler = (math.pi / 2, 0, 0)
        case.append(pk_)
box("seed_case_sign", (0.12, 0.004, 0.035), (SX_, SY_ + 0.07, CZ + 0.2), TAG, bev=0.001)
text("seed_case_word", "SEEDS", (SX_, SY_ + 0.067, CZ + 0.2), 0.02, INK, font="georgiab.ttf", extrude=0.0004)
hot("seeds", *case)

# the payphone (tip line) on the right pillar
PX, PZ = 1.35, 1.45
phone = box("payphone", (0.26, 0.12, 0.44), (PX, -0.1, PZ), CHROME, bev=0.02)
box("payphone_panel", (0.2, 0.01, 0.1), (PX, -0.165, PZ + 0.14), GREEN, bev=0.004)
text("payphone_label", "TIP LINE", (PX, -0.171, PZ + 0.14), 0.035, GOLD, font="bahnschrift.ttf", extrude=0.001)
for r_ in range(4):
    for k in range(3):
        box("pp_key_%d_%d" % (r_, k), (0.028, 0.012, 0.022), (PX + 0.02 + (k - 1) * 0.04, -0.165, PZ + 0.04 - r_ * 0.035), STEEL, bev=0.003)
hs = cyl("payphone_handset", 0.022, 0.26, (PX - 0.11, -0.19, PZ + 0.0), BLACK, verts=24, bev=0.006)
sphere("handset_top", 0.035, (PX - 0.11, -0.19, PZ + 0.13), BLACK, scale=(1, 0.8, 0.7))
sphere("handset_bot", 0.035, (PX - 0.11, -0.19, PZ - 0.13), BLACK, scale=(1, 0.8, 0.7))
cu2 = bpy.data.curves.new("cord", "CURVE")
cu2.dimensions = "3D"
cu2.bevel_depth = 0.004
sp2 = cu2.splines.new("POLY")
pts = [(PX - 0.11 + 0.012 * math.cos(t * 1.2), -0.2 + 0.012 * math.sin(t * 1.2), PZ - 0.16 - t * 0.012) for t in range(24)]
sp2.points.add(len(pts) - 1)
for p_, c in zip(sp2.points, pts):
    p_.co = (*c, 1)
cob = link(bpy.data.objects.new("phone_cord", cu2))
cob.data.materials.append(BLACK)
hot("phone", phone, hs)
quad("flyer", [(1.21, -0.047, 2.17), (1.49, -0.047, 2.17), (1.49, -0.047, 1.74), (1.21, -0.047, 1.74)], PAPER)
for fx_ in (1.23, 1.47):
    box("flyer_tape_%s" % fx_, (0.05, 0.002, 0.018), (fx_, -0.05, 2.16), mat("tape_clear", (0.95, 0.93, 0.8), rough=0.3, transm=0.5), bev=0, rot=(0, 0.5 if fx_ < 1.3 else -0.5, 0))

# the mail slot (Letters to the Editor) on the left pillar, and the punch card above it
MX, MZ = -1.35, 1.42
mplate = box("mail_plate", (0.34, 0.012, 0.14), (MX, -0.046, MZ), BRASS, bev=0.004)
box("mail_slot", (0.24, 0.02, 0.025), (MX, -0.05, MZ + 0.02), BLACK, bev=0.002)
text("mail_text", "LETTERS", (MX, -0.054, MZ - 0.035), 0.03, INK, font="georgiab.ttf", extrude=0.001)
hot("mail", mplate)
quad("punch", [(-1.5, -0.047, 2.08), (-1.2, -0.047, 2.08), (-1.2, -0.047, 1.84), (-1.5, -0.047, 1.84)], PAPER)
sphere("punch_pin", 0.012, (-1.35, -0.06, 2.07), mat("pin_red", (0.6, 0.05, 0.04), rough=0.3))

# (the Scrapbook lives under the counter now; the left pillar keeps its moulding)

# ------------------------------------------------------------------ racks: slots for covers (the web page lays the live covers on these)
def rack_row(prefix, origin, u, v, n, w, h, gap, cz, tilt=0.18, start=0):
    """n cover slots across; each tilted back by `tilt` like a wire rack, with a wire lip below."""
    total = n * w + (n - 1) * gap
    for i in range(n):
        cx = -total / 2 + w / 2 + i * (w + gap)
        normal = u.cross(v).normalized()               # toward the viewer
        c = Vector(origin) + u * cx + v * cz + normal * 0.03
        top = c + v * (h / 2) * math.cos(tilt) - normal * (h / 2) * math.sin(tilt)
        bot = c - v * (h / 2) * math.cos(tilt) + normal * (h / 2) * math.sin(tilt)
        corners = [top - u * w / 2, top + u * w / 2, bot + u * w / 2, bot - u * w / 2]
        quad("%s_%d" % (prefix, start + i), [tuple(p) for p in corners], SLOT)
        lip = bot + normal * 0.03 - v * 0.02
        cyl("%s_%d_lip" % (prefix, start + i), 0.004, w + 0.04, tuple(lip), WIRE, rot=(0, math.pi / 2, math.atan2(u.y, u.x)), verts=8)



# front: one row of six under the counter
rack_row("front", (0, -0.045, 0.0), Vector((1, 0, 0)), Vector((0, 0, 1)), 6, 0.285, 0.38, 0.055, 0.54, tilt=0.12, start=0)

# the fold-out side doors (hinged at the front corners, swung open toward the street)
DOOR_ANGLE = math.radians(38)
for side, sx in (("left", -1), ("right", 1)):
    hinge = Vector((sx * W2, -0.02, 0))
    u = Vector((sx * math.cos(DOOR_ANGLE), -math.sin(DOOR_ANGLE), 0))   # along the door, away from the hinge
    face_u = u if side == "right" else -u                               # "right" on the door's face, seen from the street
    v = Vector((0, 0, 1))
    n = face_u.cross(v).normalized()                                     # the door face's outward normal (toward the street)
    mid = hinge + u * 0.55
    rz = math.atan2(u.y, u.x)
    door = box("door_%s" % side, (1.1, 0.05, 1.95), tuple(mid + Vector((0, 0, 1.38)) - n * 0.03), GREEN, bev=0.008, rot=(0, 0, rz))
    box("door_%s_frame" % side, (1.14, 0.04, 0.04), tuple(mid + Vector((0, 0, 2.36)) + n * 0.01), TRIM, bev=0.004, rot=(0, 0, rz))
    box("door_%s_frameb" % side, (1.14, 0.04, 0.04), tuple(mid + Vector((0, 0, 0.41)) + n * 0.01), TRIM, bev=0.004, rot=(0, 0, rz))
    rack_row("%s" % side, tuple(mid), face_u, v, 2, 0.34, 0.45, 0.14, 1.56, tilt=0.12, start=0)
    rack_row("%s" % side, tuple(mid), face_u, v, 2, 0.34, 0.45, 0.14, 1.04, tilt=0.12, start=2)
    sign_c = mid + v * 2.27 + n * 0.02
    text("door_%s_sign" % side, "MONTHLIES" if side == "left" else "BOOKS", tuple(sign_c), 0.075, GOLD, font="georgiab.ttf",
         rot=(math.pi / 2, 0, rz + (math.pi if side == "left" else 0)), extrude=0.004)
    for k in (0.35, 1.0, 1.65, 2.3):
        cyl("hinge_%s_%s" % (side, k), 0.015, 0.1, (sx * W2, -0.02, k), STEEL, verts=12)
    if side == "left":   # the zine clothesline across the top of the left door
        a, b = mid - face_u * 0.5 + v * 2.14 + n * 0.08, mid + face_u * 0.5 + v * 2.14 + n * 0.08
        cu3 = bpy.data.curves.new("zine_line", "CURVE")
        cu3.dimensions = "3D"
        cu3.bevel_depth = 0.002
        sp3 = cu3.splines.new("BEZIER")
        sp3.bezier_points.add(2)
        for bp_, pt in zip(sp3.bezier_points, (a, (a + b) / 2 - v * 0.05, b)):
            bp_.co = pt
            bp_.handle_left_type = bp_.handle_right_type = "AUTO"
        lob = link(bpy.data.objects.new("zine_line_obj", cu3))
        lob.data.materials.append(mat("string", (0.85, 0.82, 0.74), rough=0.9))
        for k in range(5):
            t = (k + 0.5) / 5
            p = a.lerp(b, t) - v * (0.05 * 4 * t * (1 - t)) - v * 0.005
            box("pin_%d" % k, (0.016, 0.012, 0.05), tuple(p + n * 0.006), mat("pin_wood", (0.6, 0.42, 0.22), rough=0.6), bev=0.002, rot=(0, 0, rz))
            zc = p - v * 0.125 + n * 0.004
            quad("zine_%d" % k, [tuple(zc - face_u * 0.075 + v * 0.1), tuple(zc + face_u * 0.075 + v * 0.1), tuple(zc + face_u * 0.075 - v * 0.1),
                                 tuple(zc - face_u * 0.075 - v * 0.1)], PAPER)
    else:   # the EXTRA poster spot at the top of the right door
        pc = mid + v * 2.02 + n * 0.012
        quad("extra_poster", [tuple(pc - face_u * 0.46 + v * 0.14), tuple(pc + face_u * 0.46 + v * 0.14), tuple(pc + face_u * 0.46 - v * 0.14),
                              tuple(pc - face_u * 0.46 - v * 0.14)], mat("door_poster_bg", (0.02, 0.07, 0.045), rough=0.5))

# ------------------------------------------------------------------ outside: a milk crate with a bundle on it, and the A-frame chalkboard
CX, CY = 1.3, -0.95
crate = box("milk_crate", (0.42, 0.34, 0.3), (CX, CY, 0.15), MILK, bev=0.012)
for k in range(4):
    box("crate_slot_%d" % k, (0.06, 0.345, 0.12), (CX - 0.14 + k * 0.095, CY, 0.17), mat("crate_hole", (0.01, 0.03, 0.08), rough=0.6), bev=0.004)
for k in range(10):
    box("crate_bundle_%d" % k, (0.34, 0.25, 0.011), (CX + math.sin(k) * 0.005, CY, 0.306 + k * 0.0115), NEWS, bev=0.001, rot=(0, 0, 0.1 + math.cos(k) * 0.02))
box("crate_twine", (0.35, 0.006, 0.12), (CX, CY, 0.36), TWINE, bev=0.001, rot=(0, 0, 0.1))
BF = mat("board_frame", (0.35, 0.22, 0.1), rough=0.6)
BDX, BDY, BRZ = -2.32, -1.35, 0.28
for side_, tilt_, off_ in (("front", -0.19, -0.1), ("back", 0.19, 0.1)):
    M_ = Matrix.Translation((BDX, BDY, 0)) @ Matrix.Rotation(BRZ, 4, "Z") @ Matrix.Translation((0, off_, 0.47)) @ Matrix.Rotation(tilt_, 4, "X")
    rx_, ry_, rz_ = (Matrix.Rotation(BRZ, 4, "Z") @ Matrix.Rotation(tilt_, 4, "X")).to_euler()
    for sx_ in (-0.23, 0.23):   # side rails = the legs, down to the sidewalk
        box("board_%s_rail_%s" % (side_, sx_), (0.035, 0.03, 0.96), tuple(M_ @ Vector((sx_, 0, 0))), BF, bev=0.004, rot=(rx_, ry_, rz_))
    for zz in (0.43, -0.15):
        box("board_%s_bar_%s" % (side_, zz), (0.5, 0.03, 0.035), tuple(M_ @ Vector((0, 0, zz))), BF, bev=0.004, rot=(rx_, ry_, rz_))
    if side_ == "front":
        quad("chalkboard", [tuple(M_ @ Vector(c)) for c in ((-0.21, -0.018, 0.41), (0.21, -0.018, 0.41), (0.21, -0.018, -0.13), (-0.21, -0.018, -0.13))], CHALK)
    else:
        box("board_back_panel", (0.42, 0.01, 0.54), tuple(M_ @ Vector((0, 0.01, 0.14))), CHALK, bev=0, rot=(rx_, ry_, rz_))
cyl("board_hinge", 0.008, 0.46, tuple(Matrix.Translation((BDX, BDY, 0)) @ Matrix.Rotation(BRZ, 4, "Z") @ Vector((0, 0, 0.94))), STEEL, rot=(0, math.pi / 2, BRZ), verts=12)

# ------------------------------------------------------------------ lights, sky, cameras
def world(time):
    w = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    S.world = w
    w.use_nodes = True
    nt = w.node_tree
    for nd in list(nt.nodes):
        nt.nodes.remove(nd)
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    sky = nt.nodes.new("ShaderNodeTexSky")
    for t in ("MULTIPLE_SCATTERING", "SINGLE_SCATTERING", "NISHITA", "HOSEK_WILKIE"):
        try:
            sky.sky_type = t
            break
        except Exception:
            continue
    try:
        sky.sun_elevation = math.radians(38 if time == "day" else -8)
        sky.sun_rotation = math.radians(200)
        sky.air_density = 1.0
        sky.dust_density = 1.5
    except Exception:
        pass
    nt.links.new(sky.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 0.16 if time == "day" else 0.0
    if time != "day":   # a deep city-night blue instead of the sky model
        nt.links.remove(bg.inputs["Color"].links[0])
        bg.inputs["Color"].default_value = (0.012, 0.02, 0.05, 1)
        bg.inputs["Strength"].default_value = 1.0
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])


LIGHTS = []


def light(name, kind, loc, energy, color, size=0.5, rot=(0, 0, 0)):
    ld = bpy.data.lights.new(name, kind)
    ld.energy = energy
    ld.color = color
    if kind == "AREA":
        ld.size = size
    elif kind in ("POINT", "SPOT"):
        ld.shadow_soft_size = size
    ob = link(bpy.data.objects.new(name, ld))
    ob.location = loc
    ob.rotation_euler = rot
    LIGHTS.append(ob)
    return ob


sun = light("sun", "SUN", (0, 0, 10), 3.2, (1.0, 0.95, 0.88), rot=(math.radians(52), 0, math.radians(-160)))
sun.data.angle = math.radians(1.5)
inside = light("inside", "AREA", (0, 0.75, 2.28), 60, (1.0, 0.82, 0.58), size=1.6, rot=(0, 0, 0))
inside.data.shape = "RECTANGLE"
inside.data.size, inside.data.size_y = 1.9, 1.0
jar_light = light("jar_light", "AREA", (0, 1.1, 2.5), 0, (1.0, 0.95, 0.88), size=0.25, rot=(math.radians(25), 0, 0))
drawer_light = light("drawer_light", "AREA", (DX, 0.9, 1.3), 0, (1.0, 0.95, 0.88), size=1.3, rot=(math.radians(40), 0, 0))
drawer_light.visible_camera = drawer_light.visible_glossy = False
under_fill = light("under_fill", "AREA", (0.0, 0.75, 1.4), 30, (1.0, 0.85, 0.65), size=1.2, rot=(math.radians(35), 0, 0))
counter_fill = light("counter_fill", "AREA", (0, -0.9, 2.2), 25, (1.0, 0.9, 0.8), size=1.8, rot=(math.radians(-50), 0, 0))
sign_lamps = [light("sign_lamp_%d" % i, "SPOT", (x, -0.68, 2.84), 0, (1.0, 0.8, 0.5), size=0.05, rot=(math.radians(-30), 0, 0)) for i, x in enumerate((-1.2, 0, 1.2))]
street = light("street", "SPOT", (LPX + 0.9, LPY, 4.2), 0, (1.0, 0.75, 0.45), size=0.25, rot=(0, 0, 0))
street.data.spot_size = math.radians(120)
street.data.spot_blend = 0.6
door_fill = [light("door_fill_%s" % s, "AREA", (s * 2.6, -1.6, 2.6), 0, (1.0, 0.82, 0.6), size=1.0, rot=(math.radians(-55), 0, math.radians(-s * 35))) for s in (-1, 1)]


def time_of_day(time):
    world(time)
    day = time == "day"
    sun.data.energy = 2.4 if day else 0.0
    S.view_settings.exposure = -0.6 if day else 0.0
    inside.data.energy = 70 if day else 160
    counter_fill.data.energy = 18 if day else 45
    for L in sign_lamps:
        L.data.energy = 0 if day else 60
    street.data.energy = 0 if day else 1400
    for L in door_fill:
        L.data.energy = 0 if day else 160
    setin(pbsdf(LAMPGLOW.node_tree), "Emission Strength", 0.0 if day else 25.0)
    setin(pbsdf(DIALGLOW.node_tree), "Emission Strength", 0.0 if day else 2.0)
    setin(pbsdf(STRIP.node_tree), "Emission Strength", 6.0 if day else 14.0)
    setin(pbsdf(TOWER.node_tree), "Emission Strength", 0.0 if day else 0.9)
    setin(pbsdf(MATS["sign_panel"].node_tree), "Emission Strength", 0.0 if day else 0.6)


CAMS = {
    #            location               look at            lens  resolution
    "desk": ((0.0, -6.6, 1.58), (0.0, 0.0, 1.36), 35, (3200, 2000)),
    "behind": ((0.62, 1.28, 1.58), (-0.1, 0.12, 0.52), 17, (3200, 2000)),
    "drawer": ((0.55, 1.0, 1.36), (0.55, 0.6, 0.86), 30, (1400, 1000)),
    "phone_front": ((0.0, -3.45, 1.5), (0.0, 0.0, 1.42), 26, (1080, 1350)),
    "phone_counter": ((0.05, -1.55, 1.52), (0.0, 0.1, 1.2), 30, (1080, 1080)),
}
for side, sx in (("left", -1), ("right", 1)):
    u = Vector((sx * math.cos(DOOR_ANGLE), -math.sin(DOOR_ANGLE), 0))
    face_u = u if side == "right" else -u
    n = face_u.cross(Vector((0, 0, 1))).normalized()
    mid = Vector((sx * W2, -0.02, 0)) + u * 0.55
    cam_loc = mid + n * 2.9 + Vector((0, 0, 1.45))
    CAMS["phone_" + side] = (tuple(cam_loc), tuple(mid + Vector((0, 0, 1.35))), 32, (1080, 1380))


for _i, _x in enumerate(JAR_X):   # close-ups of each jar (shown when you open one)
    CAMS["jar_%d" % _i] = ((_x + 0.03, 1.3 - 0.3, 2.3), (_x, 1.3, 2.1), 42, (900, 900))


def camera(name):
    loc, target, lens, (rx, ry) = CAMS["behind" if name == "behind_open" else name]
    cd = bpy.data.cameras.get("cam") or bpy.data.cameras.new("cam")
    ob = bpy.data.objects.get("cam") or link(bpy.data.objects.new("cam", cd))
    ob.location = loc
    d = Vector(target) - Vector(loc)
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    cd.lens = lens
    cd.sensor_fit = "AUTO"
    cd.dof.use_dof = True
    cd.dof.focus_distance = d.length
    cd.dof.aperture_fstop = 9.0 if name.startswith("jar_") else 5.6
    for ob_ in bpy.data.objects:   # open the jar we're looking into (and only that one)
        if ob_.name.startswith("jar_") and (ob_.name.endswith("_lid") or ob_.name.endswith("_band")):
            ob_.hide_render = name.startswith("jar_") and ob_.name.startswith(name + "_")
    jl = bpy.data.objects.get("jar_light")
    if jl:
        jl.data.energy = 6 if name.startswith("jar_") else 0
        jl.data.size = 0.45   # softer, and never seen directly or mirrored in the jar glass
        jl.visible_camera = jl.visible_glossy = jl.visible_transmission = False
        if name.startswith("jar_"):
            jl.location = Vector(target) + Vector((-0.12, -0.2, 0.2))
            jl.rotation_euler = (Vector(target) - jl.location).to_track_quat("-Z", "Y").to_euler()
    S.camera = ob
    S.render.resolution_x, S.render.resolution_y = rx, ry
    S.render.resolution_percentage = 100
    return ob


def project(cam, co):
    p = world_to_camera_view(S, cam, Vector(co))
    return [round(p.x, 5), round(1 - p.y, 5), round(p.z, 3)]


def anchors_for(cam):
    bpy.context.view_layer.update()
    out = {"quads": {}, "rects": {}, "points": {}}
    for k, corners in ANCH["quads"].items():
        pts = [project(cam, c) for c in corners]
        if all(p[2] > 0 for p in pts) and any(-0.05 <= p[0] <= 1.05 and -0.05 <= p[1] <= 1.05 for p in pts):
            out["quads"][k] = [p[:2] for p in pts]
    for k, names in ANCH["rects"].items():
        xs, ys = [], []
        for nm in names:
            ob = bpy.data.objects[nm]
            for c in ob.bound_box:
                p = project(cam, ob.matrix_world @ Vector(c))
                xs.append(p[0])
                ys.append(p[1])
        box_ = [max(0, min(xs)), max(0, min(ys)), min(1, max(xs)), min(1, max(ys))]
        if box_[2] > box_[0] and box_[3] > box_[1]:
            out["rects"][k] = [round(v, 5) for v in box_]
    for k, co in ANCH["points"].items():
        out["points"][k] = project(cam, co)[:2]
    return out


# ------------------------------------------------------------------ render settings
S.render.engine = "CYCLES"
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "HIP"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    S.cycles.device = "GPU"
except Exception as ex:
    print("GPU unavailable, using CPU:", ex)
S.cycles.samples = SAMPLES
S.cycles.use_denoising = True
S.cycles.max_bounces = 8
S.cycles.transmission_bounces = 8
S.cycles.caustics_reflective = False
S.cycles.caustics_refractive = False
S.render.use_persistent_data = True
try:
    S.view_settings.view_transform = "AgX"
    S.view_settings.look = "AgX - Punchy"
except Exception:
    try:
        S.view_settings.view_transform = "Filmic"
    except Exception:
        pass
S.render.image_settings.file_format = "JPEG"
S.render.image_settings.quality = 88

all_anchors = {}
prev = {}
if os.path.exists(os.path.join(OUT, "anchors.json")):
    prev = json.load(open(os.path.join(OUT, "anchors.json")))
for v in VIEWS:
    drawer_tray_ob.location.y = TRAVEL if v in ("behind_open", "drawer") else 0.0
    cam = camera(v)
    closeup = v.startswith("jar_") or v == "drawer"
    S.render.use_border = S.render.use_crop_to_border = False
    if v == "behind_open":   # render only the drawer's box, so the page can lay it over the closed view and slide it out
        bpy.context.view_layer.update()
        xs, ys = [], []
        for ob_ in tray_parts + [housing]:
            for c in ob_.bound_box:
                q = project(cam, ob_.matrix_world @ Vector(c))
                xs.append(q[0])
                ys.append(q[1])
        r = [max(0, min(xs) - 0.012), max(0, min(ys) - 0.012), min(1, max(xs) + 0.012), min(1, max(ys) + 0.012)]
        S.render.use_border = S.render.use_crop_to_border = True
        S.render.border_min_x, S.render.border_max_x = r[0], r[2]
        S.render.border_min_y, S.render.border_max_y = 1 - r[3], 1 - r[1]
        all_anchors.setdefault("behind", prev.get("behind", {})).setdefault("crops", {})["drawer_open"] = [round(x_, 5) for x_ in r]
    elif not closeup:
        crops = (all_anchors.get(v) or prev.get(v) or {}).get("crops")
        all_anchors[v] = dict(anchors_for(cam), size=[S.render.resolution_x, S.render.resolution_y])
        if crops:
            all_anchors[v]["crops"] = crops
    drawer_light.data.energy = 5 if v == "drawer" else 0
    for t in (["day"] if closeup else TIMES):
        time_of_day(t)
        if v.startswith("jar_"):
            inside.data.energy = 35   # the ceiling tube sits right over the open jar; tame it for the close-up
        S.render.filepath = os.path.join(OUT, "%s-%s.jpg" % (v, t))
        print("rendering", v, t, flush=True)
        bpy.ops.render.render(write_still=True)
if all_anchors:
    prev.update(all_anchors)
    json.dump(prev, open(os.path.join(OUT, "anchors.json"), "w"), indent=1)
print("done", OUT)
