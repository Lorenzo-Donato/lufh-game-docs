import os
import json
from PIL import Image

def get_sprites_from_sheet(img_path):
    im = Image.open(img_path).convert('RGBA')
    bg_color = im.getpixel((0, 0))
    width, height = im.size

    # Find non-background pixels
    y_has_pixel = [False] * height
    for y in range(height):
        for x in range(width):
            p = im.getpixel((x, y))
            if p != bg_color and p[3] > 0:
                y_has_pixel[y] = True
                break

    # Find rows (Y ranges)
    y_ranges = []
    in_row = False
    start_y = 0
    for y in range(height):
        if y_has_pixel[y] and not in_row:
            in_row = True
            start_y = y
        elif not y_has_pixel[y] and in_row:
            in_row = False
            y_ranges.append((start_y, y))
    if in_row:
        y_ranges.append((start_y, height))

    rows_data = []
    for start_y, end_y in y_ranges:
        # project to X
        x_has_pixel = [False] * width
        for x in range(width):
            for y in range(start_y, end_y):
                p = im.getpixel((x, y))
                if p != bg_color and p[3] > 0:
                    x_has_pixel[x] = True
                    break
        
        # gap closing to merge disconnected pieces of the same sprite (e.g. projectile)
        for _ in range(15):
            for x in range(1, width - 1):
                if not x_has_pixel[x] and x_has_pixel[x-1]:
                    # check ahead
                    if any(x_has_pixel[x+1:min(x+16, width)]):
                        x_has_pixel[x] = True
                    
        segments = []
        in_seg = False
        start_x = 0
        for x in range(width):
            if x_has_pixel[x] and not in_seg:
                in_seg = True
                start_x = x
            elif not x_has_pixel[x] and in_seg:
                in_seg = False
                segments.append((start_x, x))
        if in_seg:
            segments.append((start_x, width))
            
        frames = []
        for sx, ex in segments:
            # find exact bounding box within this segment
            min_x, max_x = ex, sx
            min_y, max_y = end_y, start_y
            has_pixels = False
            
            for y in range(start_y, end_y):
                for x in range(sx, ex):
                    p = im.getpixel((x, y))
                    if p != bg_color and p[3] > 0:
                        has_pixels = True
                        min_x = min(min_x, x)
                        max_x = max(max_x, x)
                        min_y = min(min_y, y)
                        max_y = max(max_y, y)
            
            if has_pixels:
                # Extract image
                frame_w = max_x - min_x + 1
                frame_h = max_y - min_y + 1
                frame_im = Image.new('RGBA', (frame_w, frame_h), (0, 0, 0, 0))
                for y in range(frame_h):
                    for x in range(frame_w):
                        p = im.getpixel((min_x + x, min_y + y))
                        if p != bg_color and p[3] > 0:
                            frame_im.putpixel((x, y), p)
                frames.append(frame_im)
                
        if frames:
            rows_data.append(frames)
            
    return rows_data

def main():
    img_path = r'C:\Users\loren\Desktop\lufh_game_sm\img\Game Boy Advance - Mega Man Zero - Enemies - Pantheon Guardian.png'
    out_dir = r'C:\Users\loren\Desktop\lufh_game_sm\sprites_extracted'
    catalog_path = r'C:\Users\loren\Desktop\lufh_game_sm\enemy_sprites_catalog.json'
    
    rows_data = get_sprites_from_sheet(img_path)
    
    seq_names = [
        "enemy_pantheon_seq_01_idle",
        "enemy_pantheon_seq_02_hurt",
        "enemy_pantheon_seq_03_shoot",
        "enemy_pantheon_seq_04_walk",
        "enemy_pantheon_seq_05_death"
    ]
    
    seq_labels = [
        "IDLE (Patrol)",
        "HURT (Damage)",
        "SHOOT (Attack)",
        "WALK (Patrol)",
        "DEATH (Explosion)"
    ]
    
    catalog = []
    
    for i, frames in enumerate(rows_data):
        if i >= len(seq_names):
            break
            
        seq_name = seq_names[i]
        seq_dir = os.path.join(out_dir, seq_name)
        os.makedirs(seq_dir, exist_ok=True)
        
        frame_paths = []
        for j, frame in enumerate(frames):
            frame_filename = f"frame_{j:02d}.png"
            frame_path = os.path.join(seq_dir, frame_filename)
            frame.save(frame_path)
            frame_paths.append(f"sprites_extracted/{seq_name}/{frame_filename}")
            
        # create strip
        strip_w = sum(f.width for f in frames)
        strip_h = max(f.height for f in frames)
        strip_im = Image.new('RGBA', (strip_w, strip_h), (0, 0, 0, 0))
        cx = 0
        for f in frames:
            # bottom align
            cy = strip_h - f.height
            strip_im.paste(f, (cx, cy))
            cx += f.width
        strip_path = os.path.join(seq_dir, "strip.png")
        strip_im.save(strip_path)
        
        # create gif
        gif_path = os.path.join(seq_dir, "animation.gif")
        frames[0].save(
            gif_path,
            save_all=True,
            append_images=frames[1:],
            duration=150,
            loop=0,
            disposal=2
        )
        
        catalog.append({
            "id": seq_name,
            "cat": "Enemy",
            "label": seq_labels[i],
            "fps": 6,
            "loop": True if i not in [1, 4] else False,
            "gif": f"sprites_extracted/{seq_name}/animation.gif",
            "strip": f"sprites_extracted/{seq_name}/strip.png",
            "frames": frame_paths
        })
        
    with open(catalog_path, 'w') as f:
        json.dump(catalog, f, indent=2)
        
    print("Extraction complete!")

if __name__ == '__main__':
    main()
