"""Render a GLB city prop from Emberwell's 2:1 projected camera."""

import argparse
import math
from pathlib import Path
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("model", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--size", type=int, default=64)
    parser.add_argument("--azimuth", type=float, default=-45)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    if args.size < 16 or args.size > 512:
        parser.error("Sprite size must be between 16 and 512 pixels.")

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(args.model.resolve(strict=True)))
    scene = bpy.context.scene
    meshes = [obj for obj in scene.objects if obj.type == "MESH"]
    if not meshes:
        raise ValueError("The GLB has no meshes.")
    corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    lo = Vector(tuple(min(p[axis] for p in corners) for axis in range(3)))
    hi = Vector(tuple(max(p[axis] for p in corners) for axis in range(3)))
    width = max(hi.x - lo.x, hi.y - lo.y)
    if width <= 0:
        raise ValueError("The GLB has no horizontal footprint.")

    # Rebase the source so the world origin is the center of the ground footprint.
    roots = [obj for obj in scene.objects if obj.parent is None]
    root = bpy.data.objects.new("Sprite origin", None)
    scene.collection.objects.link(root)
    for obj in roots:
        matrix = obj.matrix_world.copy()
        obj.parent = root
        obj.matrix_world = matrix
    factor = 2.6 / width
    root.scale = (factor,) * 3
    root.location = Vector((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)) * factor
    bpy.context.view_layer.update()
    corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]

    angle = math.radians(args.azimuth)
    offset = Vector((8 * math.cos(angle), 8 * math.sin(angle), 8 * math.tan(math.radians(30))))
    center = Vector((0, 0, (hi.z - lo.z) * factor / 2))
    camera_data = bpy.data.cameras.new("City 2:1")
    camera = bpy.data.objects.new("City 2:1", camera_data)
    scene.collection.objects.link(camera)
    camera.location = center + offset
    camera.rotation_euler = (-offset).to_track_quat("-Z", "Y").to_euler()
    camera_data.type = "ORTHO"
    scene.camera = camera
    bpy.context.view_layer.update()
    inverse = camera.matrix_world.inverted()
    projected = [inverse @ p for p in corners]
    x_min, x_max = min(p.x for p in projected), max(p.x for p in projected)
    y_min, y_max = min(p.y for p in projected), max(p.y for p in projected)
    camera.location += camera.matrix_world.to_quaternion() @ Vector(((x_min + x_max) / 2, (y_min + y_max) / 2, 0))
    camera_data.ortho_scale = 1.12 * max(x_max - x_min, y_max - y_min)
    bpy.context.view_layer.update()

    def light(name, location, energy, size, color):
        data = bpy.data.lights.new(name, "AREA")
        data.energy, data.shape, data.size, data.color = energy, "DISK", size, color
        source = bpy.data.objects.new(name, data)
        scene.collection.objects.link(source)
        source.location = location
        source.rotation_euler = (center - source.location).to_track_quat("-Z", "Y").to_euler()

    light("Key", (-3, -4, 7), 825, 4, (1, .86, .72))
    light("Fill", (4, 2, 5), 490, 5, (.77, .85, 1))
    scene.world.color = (.22, .22, .22)
    scene.view_settings.view_transform = "Standard"
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.film_transparent = True
    scene.render.resolution_x = scene.render.resolution_y = args.size
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.filepath = str(args.output.resolve())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.render.render(write_still=True)
    anchor = world_to_camera_view(scene, camera, Vector((0, 0, 0)))
    print(f"Sprite ground anchor: {anchor.x:.4f}, {1 - anchor.y:.4f}")


if __name__ == "__main__":
    main()
