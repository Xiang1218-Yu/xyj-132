from PIL import Image, ImageDraw

def create_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    
    margin = int(size * 0.04)
    radius = int(size * 0.19)
    
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg)
    
    for y in range(size):
        ratio = y / size
        r = int(102 + (118 - 102) * ratio)
        g = int(126 + (75 - 126) * ratio)
        b = int(234 + (162 - 234) * ratio)
        bg_draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
    
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(
        [margin, margin, size - margin - 1, size - margin - 1],
        radius=radius,
        fill=255
    )
    
    result = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    result.paste(bg, (0, 0), mask)
    
    draw = ImageDraw.Draw(result)

    panel_x = int(size * 0.18)
    panel_y = int(size * 0.28)
    panel_w = int(size * 0.64)
    panel_h = int(size * 0.44)
    panel_radius = int(size * 0.06)
    
    draw.rounded_rectangle(
        [panel_x, panel_y, panel_x + panel_w, panel_y + panel_h],
        radius=panel_radius,
        fill=(255, 255, 255, 240)
    )

    header_h = int(size * 0.12)
    header_img = Image.new('RGBA', (panel_w, header_h), (0, 0, 0, 0))
    header_draw = ImageDraw.Draw(header_img)
    header_draw.rounded_rectangle(
        [0, 0, panel_w - 1, header_h - 1],
        radius=panel_radius,
        fill=(255, 255, 255, 80)
    )
    header_crop = header_img.crop([0, 0, panel_w, header_h])
    result.paste(header_crop, (panel_x, panel_y), header_crop)
    draw = ImageDraw.Draw(result)

    dot_r = int(size * 0.03)
    dot_y = int(panel_y + header_h / 2)
    
    dot_x1 = int(panel_x + size * 0.09)
    draw.ellipse(
        [dot_x1 - dot_r, dot_y - dot_r, dot_x1 + dot_r, dot_y + dot_r],
        fill=(255, 255, 255, 150)
    )
    
    dot_x2 = int(panel_x + size * 0.18)
    draw.ellipse(
        [dot_x2 - dot_r, dot_y - dot_r, dot_x2 + dot_r, dot_y + dot_r],
        fill=(255, 255, 255, 100)
    )
    
    dot_x3 = int(panel_x + size * 0.27)
    draw.ellipse(
        [dot_x3 - dot_r, dot_y - dot_r, dot_x3 + dot_r, dot_y + dot_r],
        fill=(255, 255, 255, 60)
    )

    line_y1 = int(panel_y + size * 0.22)
    line_y2 = int(panel_y + size * 0.30)
    line_y3 = int(panel_y + size * 0.38)
    line_h = int(size * 0.03)
    line_r = line_h // 2
    
    draw.rounded_rectangle(
        [int(panel_x + size * 0.09), line_y1, int(panel_x + panel_w - size * 0.09), line_y1 + line_h],
        radius=line_r,
        fill=(199, 210, 254, 255)
    )
    
    draw.rounded_rectangle(
        [int(panel_x + size * 0.09), line_y2, int(panel_x + panel_w - size * 0.18), line_y2 + line_h],
        radius=line_r,
        fill=(224, 231, 255, 255)
    )
    
    draw.rounded_rectangle(
        [int(panel_x + size * 0.09), line_y3, int(panel_x + panel_w - size * 0.25), line_y3 + line_h],
        radius=line_r,
        fill=(224, 231, 255, 255)
    )

    check_cx = int(size * 0.75)
    check_cy = int(size * 0.72)
    check_r = int(size * 0.12)
    
    draw.ellipse(
        [check_cx - check_r, check_cy - check_r, check_cx + check_r, check_cy + check_r],
        fill=(16, 185, 129, 255)
    )
    
    check_w = max(1, int(size * 0.03))
    p1 = (int(check_cx - size * 0.05), int(check_cy + size * 0.01))
    p2 = (int(check_cx - size * 0.01), int(check_cy + size * 0.05))
    p3 = (int(check_cx + size * 0.05), int(check_cy - size * 0.04))
    
    draw.line([p1, p2], fill=(255, 255, 255, 255), width=check_w)
    draw.line([p2, p3], fill=(255, 255, 255, 255), width=check_w)
    
    r = check_w
    draw.ellipse([p1[0]-r, p1[1]-r, p1[0]+r, p1[1]+r], fill=(255, 255, 255, 255))
    draw.ellipse([p2[0]-r, p2[1]-r, p2[0]+r, p2[1]+r], fill=(255, 255, 255, 255))
    draw.ellipse([p3[0]-r, p3[1]-r, p3[0]+r, p3[1]+r], fill=(255, 255, 255, 255))

    return result

sizes = [16, 32, 48, 128]

for size in sizes:
    icon = create_icon(size)
    icon.save(f'icons/icon{size}.png', 'PNG')
    print(f'Created icon{size}.png')

print('All icons created successfully!')
