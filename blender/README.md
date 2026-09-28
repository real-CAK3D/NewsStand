# The kiosk, in Blender

`kiosk_scene.py` builds The Corner Chronicle's kiosk procedurally and renders it with Cycles:

    blender -b --factory-startup -P kiosk_scene.py -- <out_dir> [samples=96] [views=all] [times=day,night]

Views: `desk` (the wide shot for computers), `phone_front`, `phone_counter` (close-up of the counter), `phone_left`, `phone_right`.
It writes `<view>-<day|night>.jpg` and `anchors.json` — where every rack slot, sign and prop lands in each image. Copy the images
to `site/scene/` and `anchors.json` to `scene_anchors.json`, then run `build_newsstand.py`: `site/scene.js` maps the live covers,
sign, chalkboard, punch card, radio dial and register tape onto the render and puts a button over every prop.
