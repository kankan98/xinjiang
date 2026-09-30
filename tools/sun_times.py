# -*- coding: utf-8 -*-
"""NOAA 太阳事件计算：输出行程各锚点的日出/日落/民用晨昏光（北京时间 UTC+8）。

用法：python tools/sun_times.py
算法：NOAA General Solar Position Calculations（精度 ±1—2 分钟，满足路书口径）。
"""
import math
from datetime import date, timedelta

TZ = 8  # 北京时间

# 仅列当前旅行实际日期；近似坐标用于天文参考，不作机位导航。
SITES = [
    ("香港机场", 22.309, 113.915, ["2026-10-02", "2026-10-11"]),
    ("乌鲁木齐机场", 43.907, 87.475, ["2026-10-03"]),
    ("布尔津县城", 47.703, 86.877, ["2026-10-03", "2026-10-04"]),
    ("白哈巴村", 48.694, 86.788, ["2026-10-04", "2026-10-05"]),
    ("喀纳斯换乘中心", 48.693, 87.031, ["2026-10-05"]),
    ("奎屯", 44.424, 84.907, ["2026-10-06"]),
    ("赛里木湖东门", 44.619, 81.391, ["2026-10-07", "2026-10-08"]),
    ("果子沟大桥", 44.476, 81.140, ["2026-10-08"]),
    ("伊宁六星街", 43.940, 81.320, ["2026-10-08"]),
    ("唐布拉百里画廊", 43.718, 83.920, ["2026-10-09"]),
    ("尼勒克县城", 43.794, 82.483, ["2026-10-10"]),
]


def solar_events(lat, lon, d):
    n = (d - date(d.year, 1, 1)).days + 1
    events = {}
    for label, zenith in (("sunrise", 90.833), ("sunset", 90.833), ("dawn", 96.0), ("dusk", 96.0)):
        rising = label in ("sunrise", "dawn")
        lng_hour = lon / 15.0
        t = n + ((6 - lng_hour) / 24 if rising else (18 - lng_hour) / 24)
        m = (0.9856 * t) - 3.289
        l = m + (1.916 * math.sin(math.radians(m))) + (0.020 * math.sin(math.radians(2 * m))) + 282.634
        l %= 360
        ra = math.degrees(math.atan(0.91764 * math.tan(math.radians(l)))) % 360
        ra += (math.floor(l / 90) * 90) - (math.floor(ra / 90) * 90)
        ra /= 15.0
        sin_dec = 0.39782 * math.sin(math.radians(l))
        cos_dec = math.cos(math.asin(sin_dec))
        cos_h = (math.cos(math.radians(zenith)) - (sin_dec * math.sin(math.radians(lat)))) / (
            cos_dec * math.cos(math.radians(lat)))
        if cos_h > 1 or cos_h < -1:
            events[label] = None
            continue
        h = (360 - math.degrees(math.acos(cos_h))) if rising else math.degrees(math.acos(cos_h))
        h /= 15.0
        t_local = h + ra - (0.06571 * t) - 6.622
        ut = (t_local - lng_hour) % 24
        local = (ut + TZ) % 24
        events[label] = local
    return events


def fmt(hours):
    if hours is None:
        return "--:--"
    total = round(hours * 60)
    return f"{(total // 60) % 24:02d}:{total % 60:02d}"


if __name__ == "__main__":
    print(f"{'地点':<10} {'日期':<12} {'民用晨光':<6} {'日出':<6} {'日落':<6} {'民用暮光':<6}")
    for name, lat, lon, dates in SITES:
        for ds in dates:
            y, m, dd = map(int, ds.split("-"))
            ev = solar_events(lat, lon, date(y, m, dd))
            print(f"{name:<10} {ds:<12} {fmt(ev['dawn']):<8} {fmt(ev['sunrise']):<7} {fmt(ev['sunset']):<7} {fmt(ev['dusk']):<8}")
