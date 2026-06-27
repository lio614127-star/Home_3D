# Convert Sweet Home 3D Assets to GLB (Blender Fallback)

The automatic Node.js importer (`npm run assets:sweethome3d-import`) successfully handles `.obj` files because of the `obj2gltf` integration. However, Sweet Home 3D `.sh3f` catalogs sometimes contain models in other formats such as `.dae` (Collada), `.3ds`, or `.kmz`.

When the importer encounters these formats, it will skip them and log a warning in `sweethome3d-import-report.md`. To convert these models, you can use **Blender CLI**.

## Prerequisites
1. [Blender](https://www.blender.org/download/) installed and added to your system `PATH`.

## The Python Script (`convert.py`)
Save this script somewhere, for example `scripts/assets/blender_convert.py`:

```python
import bpy
import sys

# Get arguments
argv = sys.argv
argv = argv[argv.index("--") + 1:] # get all args after "--"

input_file = argv[0]
output_file = argv[1]

# Clear default scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Determine format and import
ext = input_file.lower().split('.')[-1]
if ext == 'dae':
    bpy.ops.wm.collada_import(filepath=input_file)
elif ext == '3ds':
    bpy.ops.import_scene.autodesk_3ds(filepath=input_file)
else:
    print(f"Format {ext} not handled in this script.")
    sys.exit(1)

# Ensure origin is normalized to bottom-center (optional, adjust per model)
# ... apply transforms if necessary ...

# Export to GLB
bpy.ops.export_scene.gltf(filepath=output_file, export_format='GLB')
```

## Running the CLI

You can manually batch process the skipped models like this:

```bash
blender --background --python scripts/assets/blender_convert.py -- "path/to/skipped_model.dae" "public/assets/library/models/sweethome3d/model_id.glb"
```

After generating the `.glb`, you can manually append its metadata to `public/assets/library/asset-manifest.json` using the same metadata schema generated for the `.obj` files.
