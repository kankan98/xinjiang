import json
import os
from functools import lru_cache
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/assets/images/travel-line.png'
RUNTIME = json.loads((ROOT / 'src/data/roadbook-runtime.json').read_text(encoding='utf-8'))
META_BY_DAY = {item['meta']['day']: item['meta'] for item in RUNTIME['itinerary']}
SUMMARY = RUNTIME['summary']
MANIFEST = json.loads((ROOT / 'src/data/roadbook.manifest.json').read_text(encoding='utf-8'))
VERSION = MANIFEST['homepageCopy']['version'].split(' · ')[0]
W, H = 2560, 1440
BG, PANEL, CARD = '#0b1115', '#10181d', '#151e24'
TEXT, MUTED, GRID = '#f4efe2', '#a9b5bc', '#53636d'
BLUE, ORANGE, GREEN, VIOLET = '#3987e5', '#d95926', '#199e70', '#9085e9'
FONT_CANDIDATES = [
    os.environ.get('ROADBOOK_FONT'),
    r'C:/Windows/Fonts/NotoSansSC-VF.ttf',
    '/System/Library/Fonts/STHeiti Medium.ttc',
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
]
FONT = next((Path(path) for path in FONT_CANDIDATES if path and Path(path).is_file()), None)
if FONT is None:
    raise RuntimeError('Set ROADBOOK_FONT to an installed Chinese font path')

@lru_cache(maxsize=24)
def font(size):
    result = ImageFont.truetype(str(FONT), size)
    try:
        result.set_variation_by_axes([500 if size < 40 else 600])
    except OSError:
        pass  # Static system fonts do not expose variable font axes.
    return result

def line(draw, points, fill, width=8):
    draw.line(points, fill=fill, width=width, joint='curve')
    r = width // 2
    for x, y in (points[0], points[-1]):
        draw.ellipse((x-r, y-r, x+r, y+r), fill=fill)

def dashed(draw, points, fill, width=8, dash=16, gap=14):
    for (x1,y1),(x2,y2) in zip(points, points[1:]):
        dx,dy=x2-x1,y2-y1
        length=(dx*dx+dy*dy)**0.5
        if not length: continue
        ux,uy=dx/length,dy/length
        pos=0
        while pos<length:
            end=min(pos+dash,length)
            draw.line((x1+ux*pos,y1+uy*pos,x1+ux*end,y1+uy*end),fill=fill,width=width)
            pos=end+gap

def text(draw, xy, value, size, fill=TEXT, anchor=None):
    draw.text(xy, value, font=font(size), fill=fill, anchor=anchor)

def wrapped_text(draw, xy, value, size, max_width, fill=TEXT):
    lines, current = [], ''
    for character in value:
        if draw.textlength(current + character, font=font(size)) > max_width:
            lines.append(current)
            current = character
        else:
            current += character
    lines.append(current)
    for index, label in enumerate(lines):
        text(draw, (xy[0], xy[1] + index * (size + 9)), label, size, fill)

img=Image.new('RGB',(W,H),BG)
d=ImageDraw.Draw(img)
d.rectangle((0,250,820,H),fill=PANEL)
for y in range(360,1261,180): d.line((80,y,760,y),fill=GRID,width=1)
for x in range(160,641,160): d.line((x,280,x,1300),fill=GRID,width=1)
text(d,(78,66),'ROADBOOK / AUTUMN 2026',24,'#8ea0aa')
text(d,(78,112),f'北疆十日路线 · {VERSION}',54)
text(d,(78,182),(f"全程里程待核 · 已测分段{SUMMARY['plannedDrivingDistanceKm']:,}km" if SUMMARY.get('isPartial') else f"计划自驾 {SUMMARY['plannedDrivingDistanceKm']:,} km · 含条件段与估算"),25,MUTED)

ox,oy=60,260
nodes=[
    ('乌鲁木齐',292,990,18,-5),
    ('布尔津',294,205,18,-18),
    ('铁热克提',365,105,-133,-8),
    ('白哈巴',380,55,18,-26),
    ('克拉玛依',248,510,18,-18),
    ('奎屯',250,635,18,-18),
    ('赛里木湖',124,784,18,-18),
    ('伊宁',105,930,-40,30),
    ('新源',280,935,-64,-30),
    ('唐布拉',300,862,-30,-30),
    ('乔尔玛',415,825,14,-30),
    ('库尔德宁',245,1010,-70,15),
]
line(d,[(ox+x,oy+y) for x,y in [(250,635),(248,510),(270,360),(294,205)]],BLUE)
dashed(d,[(ox+x,oy+y) for x,y in [(292,990),(270,860),(230,700),(250,635)]],BLUE,dash=10,gap=10)
line(d,[(ox+x,oy+y) for x,y in [(294,205),(365,105),(380,55)]],ORANGE)
dashed(d,[(ox+x,oy+y) for x,y in [(380,55),(430,95),(470,120)]],VIOLET)
line(d,[(ox+x,oy+y) for x,y in [(380,55),(365,105),(294,205),(248,510),(250,635),(124,784),(105,930)]],GREEN)
dashed(d,[(ox+x,oy+y) for x,y in [(105,930),(245,1010)]],ORANGE)
line(d,[(ox+x,oy+y) for x,y in [(245,1010),(280,935)]],GREEN)
dashed(d,[(ox+x,oy+y) for x,y in [(280,935),(300,862),(415,825),(250,635)]],ORANGE)
line(d,[(ox+x,oy+y) for x,y in [(415,825),(250,635)]],GREEN)
dashed(d,[(ox+x,oy+y) for x,y in [(280,935),(200,905),(250,635)]],ORANGE,width=4,dash=8,gap=9)
for name,x,y,dx,dy in nodes:
    x,y=ox+x,oy+y
    d.ellipse((x-10,y-10,x+10,y+10),fill='#11191f',outline=TEXT,width=4)
    text(d,(x+dx,y+dy),name,25)

legend=[(BLUE,'干线 / 火车接驳'),(GREEN,'返回 / 伊犁段'),(VIOLET,'条件区间车'),(ORANGE,'独库条件段 / 高速备线')]
for i,(color,label) in enumerate(legend):
    x,y=84+(i%2)*345,1286+(i//2)*60
    d.line((x,y+19,x+45,y+19),fill=color,width=8)
    text(d,(x+60,y),label,20,'#c4cdd2')

text(d,(900,66),'DAILY LEDGER / CURRENT ITINERARY',24,'#8ea0aa')
text(d,(900,112),'日期—地点—里程统一台账',54)
route_labels={
'D1':'火车至奎屯 → 取车 → 布尔津',
'D2':'布尔津 → 白哈巴 → 观鱼台',
'D3':'白哈巴 → 喀纳斯三湾 → 布尔津',
'D4':'布尔津 → 克拉玛依 → 奎屯',
'D5':'奎屯 → 赛里木湖 · 含松树头往返',
'D6':'赛里木湖 → 伊宁',
'D7':'伊宁 → 库尔德宁 → 新源',
'D8':'新源 → 独库北段 → 奎屯服务点',
}
rows=[]
for day in (f'D{index}' for index in range(1, 9)):
    meta=META_BY_DAY[day]
    month, date_of_month = (int(value) for value in meta['date'].replace('月', '').replace('日', '').split())
    date=f'{month:02}.{date_of_month:02}'
    distance_prefix='自驾 ' if day == 'D3' else ''
    rows.append((date,day,route_labels[day],f"{distance_prefix}{meta['distance']} km · {meta['driveTime']}" if not meta.get('isPartial') else f"已测{meta['distance']}km / {meta['driveTime']}，进镇未计"))
colors=[BLUE,ORANGE,VIOLET,GREEN]
for index,(date,day,title,meta) in enumerate(rows):
    col,row=index%2,index//2
    x,y=900+col*650,210+row*245
    d.rounded_rectangle((x,y,x+610,y+205),radius=18,fill=CARD,outline='#3e4d56',width=2)
    d.rounded_rectangle((x,y,x+8,y+205),radius=4,fill=colors[row])
    text(d,(x+32,y+24),date,31)
    text(d,(x+150,y+30),day,20,'#8ea0aa')
    title_size=24 if len(title)>18 else 27
    wrapped_text(d,(x+32,y+74),title,title_size,550)
    text(d,(x+32,y+163),meta,22,MUTED)
text(d,(900,1295),'地图按节点相对方位示意，不替代当日导航；所有通行、开放与班次以临行官方信息为准。',25,MUTED)
text(d,(2460,1360),f"执行校审 {SUMMARY['editorialRevision']} · 班次与放行临行再核",18,'#8ea0aa',anchor='ra')
img.save(OUT,optimize=True)
print(f'Route map generated: {OUT}')
