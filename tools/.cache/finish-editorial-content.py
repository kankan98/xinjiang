from pathlib import Path
from datetime import date
from html import escape
import json,re,sys
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
from tools.sun_times import solar_events,fmt,SITES

def update(p,fn):
 p=ROOT/p;s=p.read_text(encoding='utf-8');new=fn(s)
 if s!=new:p.write_text(new,encoding='utf-8')
nia='https://s.nia.gov.cn/mps/bszy/dzbjtxz/blzy/202604/t20260414_1001.html'
permit=f'''<div class="alert-banner is-warning"><strong>边境证件：按身份选择网上或现场申请</strong><p>国家移民管理局<a href="{nia}" target="_blank" rel="noreferrer">电子边境管理区通行证服务指南</a>已核读：自 2026-04-15 起启用电子证，免费办理。年满 16 周岁的内地居民，可通过“移民局 12367”APP 或微信、支付宝小程序申请有效期三个月以内的电子证；网上受理后 <strong>3 个工作日内作出是否批准的决定</strong>，不等于保证获批。</p><p>港澳台居民、华侨、外国人，以及偕行未满 16 周岁子女或申请一年有效期的内地居民，须到县级以上公安出入境机构或指定派出所现场申请。材料齐全且符合法定形式可当场签发；需进一步调查的，受理后 10 个工作日内决定。9 月 15 日前先核各人渠道，最迟 T-14 启动申请，需现场调查时再提前。</p><p>获批后保存电子证或打印件，与有效身份证件同时使用。办理地点和白哈巴现场验核方式提前确认；本次没有取得“喀纳斯游客中心已停办”的当期公告，不能依赖游客中心临时受理。</p></div>'''
update('src/pages/chapters/days/Day2-布尔津-白哈巴.vue',lambda s:re.sub(r'<div class="alert-banner is-warning"><strong>边境证件提前办.*?</div>',lambda _:permit,s,count=1,flags=re.S).replace('月亮湾为主机位，保留约 45—50 min；排队从短栈道时间中扣除','月亮湾为主机位，保留约 45—50 min；在允许用餐的休息处补路餐与热饮，排队从短栈道时间中扣除'))
update('src/pages/chapters/topics/专题-景区百科.vue',lambda s:s.replace('办理方式及适用人群查国家移民管理局、12367 与属地公安；旧稿未附原文的“固定 3 个工作日、游客中心停办”不作保证',f'官方电子证指南明确区分网上与现场申请；网上受理后 3 个工作日内作批准与否决定，不是保证获批。具体适用身份与材料见 {"<a href=\""+nia+"\" target=\"_blank\" rel=\"noreferrer\">国家移民管理局指南</a>"}'))

# 图注和替代文字直接跟随已登记图片，修复白哈巴更换图片后的旧署名。
images=json.loads((ROOT/'src/data/images.manifest.json').read_text(encoding='utf-8'))['images']
def sync_figures(s):
 def replace_figure(m):
  asset=m.group(1);body=m.group(0);data=images[asset]
  body=re.sub(r'(<img\b[^>]*\balt=")[^"]*(")',lambda a:a[1]+escape(data['alt'],quote=True)+a[2],body,count=1)
  caption=f'<figcaption><strong>{escape(data["place"])}</strong><span>{escape(data["caption"])}</span><small>{escape(data["author"])} · <a href="{data["licenseUrl"]}" target="_blank" rel="noreferrer">{escape(data["license"])}</a> · <button type="button" class="credit-link" data-action="open-credit" data-asset="{asset}">许可详情</button></small></figcaption>'
  return re.sub(r'<figcaption>.*?</figcaption>',lambda _:caption,body,flags=re.S)
 return re.sub(r'<figure\b[^>]*data-asset="([^"]+)".*?</figure>',replace_figure,s,flags=re.S)
update('src/pages/chapters/topics/专题-景区百科.vue',sync_figures)

# 光线参考只展示可复算的太阳事件；摄影停留与地形遮光分开说明。
records=[]
for name,lat,lon,dates in SITES:
 for ds in dates:
  values=solar_events(lat,lon,date.fromisoformat(ds));records.append({'date':ds,'place':name,'lat':lat,'lon':lon,**{k:fmt(v) for k,v in values.items()}})
records.sort(key=lambda r:r['date'])
solar={'computedAt':'2026-09-11','timezone':'Asia/Shanghai (UTC+8)','method':'tools/sun_times.py; 近似坐标与理想地平线，不含地形遮挡、云层和天气','events':records}
(ROOT/'docs/editorial-solar-reference-20260911.json').write_text(json.dumps(solar,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
head=['日期 / 地点','民用晨光始','日出','日落','民用暮光止']
rows=[]
for r in records:
 cells=''.join(f'<td data-th="{label}">{r[key]}</td>' for label,key in zip(head[1:],['dawn','sunrise','sunset','dusk']))
 rows.append(f'<tr><th scope="row">{r["date"][5:]} · {r["place"]}</th>{cells}</tr>')
table='<div class="table-scroll table-scroll--wide table-scroll--solar" tabindex="0" role="region" aria-label="太阳事件参考，全部为北京时间"><table><thead><tr>'+''.join(f'<th scope="col">{x}</th>' for x in head)+'</tr></thead><tbody>'+'\n'.join(rows)+'</tbody></table></div>'
def photography(s):
 start=s.index('<h4 id="逐日太阳事件校验表北京时间-utc8">')
 end=s.index('<h3 id="5-器材与低温">',start)
 replacement='<h4 id="逐日太阳事件校验表北京时间-utc8">太阳事件参考 · 北京时间 UTC+8</h4><p>以本书各地点的近似坐标统一复算；时间取整到分钟，地形、建筑和云层可能提前遮光。晨昏光不等于日出前后都有直射光，不据此延长收线。D5 仍按原 19:25 起湖岸停留、18:30 松树头下撤安排，日落天文参考约 20:05；D6 写真仍 20:00 收工。</p>'+table+'<p>下表用于安排保暖与观察光线，不代表天气、景区开放或车辆通行。D1—D4 的途中天色按实际路段判断；D7 不为日落延长山路行车。相关复算记入来源日志。</p>'
 s=s[:start]+replacement+s[end:]
 s=re.sub(r'(<h4 id="五彩滩d1-条件日落">).*?(?=<h4 id="白哈巴">)',r'\1五彩滩（本次不安排）</h4><p>本次不设五彩滩机位与购票任务，也不挪到 D2 清晨或 D3 晚间补拍。额尔齐斯河景只在布尔津原有停留、且实际有余裕时记录。</p>\n    ',s,count=1,flags=re.S)
 s=s.replace('经铁热克提、克拉玛依到奎屯','从布尔津经 G217、G3014 和克拉玛依方向到奎屯')
 s=s.replace('5.2 km 景观段，赛里木湖隧道穿出后进入大桥段，桥面高悬峡谷之上。只在 G30 官方服务区或指定景观停车区停车，不在路肩、桥面或隧道口拍摄','本次 D6 按南门出湖后的 312 国道谷底路线车观，不把桥面路线的旧机位说明套到当天行程。由乘员在不影响驾驶时观察，主线不设专门停车点；不在国道弯道、桥下引道、路肩或隧道口拍摄')
 s=s.replace('08:41 日出（北岸东向机位接金色尾段）','约 08:40 日出，09:00 发车后按实际光线选开放停车点')
 s=s.replace('写真 17:30 后到店改室内两小时','写真 17:30 后到店与影棚协商缩短室内项目或取消，20:00 收工')
 s=s.replace('D7 独库预约成功并按窗口 14:00 进入','D7 当期预约要求（如实施）、开放与车辆权限均确认，14:00 前可进入')
 s=s.replace('温度基线表（10 月上旬夜间最低温参考）','保暖准备范围（装备预案，非天气预报）')
 s=s.replace('这些温度只是<strong>历史气候参考，不是预报；出发前一周按逐日预报复核</strong>','这些温度沿用原稿作为<strong>装备准备范围，未列气象站与统计期，不当作气候统计或逐日预报；出发前按短期预报调整</strong>')
 s=s.replace('这套分层用于覆盖 -10~10 ℃ 的全程跨度——十月的北疆，一天之内经历四季不是修辞','从城市到山地都要方便增减衣物；更低气温、大风或降雪时，按实际预报增加保暖或缩短户外停留')
 return s
update('src/pages/chapters/topics/专题-新疆摄影地图.vue',photography)

# 统一主线文字，历史日志保留原值并由新审查条目说明更正。
for p in (ROOT/'src/pages/chapters').rglob('*.vue'):
 if p.name.startswith('04-'):continue
 s=p.read_text(encoding='utf-8')
 s=s.replace('16:25 起沿回程方向依次择停百里画廊、阿克塔斯、唐布拉国家森林公园','16:25—16:45 只在百里画廊选一处合法点停留；阿克塔斯与森林公园以车观为主')
 s=s.replace('16:25 起沿返程方向依次择停百里画廊、阿克塔斯、唐布拉国家森林公园','16:25—16:45 在百里画廊选一处合法点停留；阿克塔斯与森林公园以车观为主')
 s=s.replace('资料日期：核查日：','资料参考日：').replace('资料日期：金额回填日：','金额回填日：').replace('资料日期：餐厅快照：','餐厅快照：')
 p.write_text(s,encoding='utf-8')

# 十日摘要保留路线与数值，把封面留给旅行内容。
manifest_path=ROOT/'src/data/roadbook.manifest.json'
m=json.loads(manifest_path.read_text(encoding='utf-8'))
summaries={
 'Day0':'从深圳湾出发，经香港飞往乌鲁木齐。凌晨直达车站旁的酒店，睡好这一觉，明天再开启自驾。',
 'Day1':'在火车上补眠，在奎屯吃第一顿新疆饭，再一路北上布尔津。午餐留给滋味，驾驶留足休息。',
 'Day2':'沿铁贾公路通道进入白哈巴。木屋、秋林与村里的一杯热茶是主角，喀纳斯三湾按班车与接驳条件选择。',
 'Day3':'湖岸与河湾不必全收。按昨天的体验选择一次重点游览，或在白哈巴慢慢吃早餐、早点回布尔津。',
 'Day4':'从布尔津经克拉玛依方向到奎屯。让戈壁从车窗经过，入住后用热饭、淋浴和休整恢复体力。',
 'Day5':'抵达赛里木湖后，松树头全景与东岸慢行二选一。给远山、湖色和一场日落留出从容的时间。',
 'Day6':'上午走赛湖北岸与西岸，出湖后车观果子沟，下午进入伊宁。六星街写真、列巴与热茶，各按同行人的偏好安排。',
 'Day7':'独库看达坂，唐布拉看河谷。出发前按开放条件与旅行重心选好路线，晚上回尼勒克休息。',
 'Day8':'从尼勒克回奎屯还车，吃一顿收官饭，再乘火车回乌鲁木齐。钟点房休息与机场手续衔接，把余量留给返程。',
 'Day9':'机上补眠，抵港后吃热早餐，再从机场衔接返深交通。带着秋色回家，照片和账单等休息好再整理。',
 '00-总目录.md':'从行前准备到每天的时间轴，再到吃住、拍摄和应急，按你现在需要的信息翻阅。',
 '01-研究底稿.md':'主线距离、接驳与住点的资料底稿。看清静态地图能支持什么，哪些仍需出发前确认。',
 '02-路线推导.md':'这条环线为什么这样走，哪些风景值得慢下来，以及现有分支各自的时间与体力代价。',
 '03-全书一致性与政策时效性复核.md':'把车票、取还车、景区与住宿连成一条时间链。七项准备逐一确认，现场变化按分支处理。',
 '04-来源与复核日志.md':'保留订单回填、资料日期和每次修订依据。最新审查在前，历史快照按当时的证据状态阅读。',
 '专题-景区百科.md':'白哈巴看村落，喀纳斯看河湾，赛湖看光线，唐布拉看山谷。到现场看什么、怎样停留，这里说清。',
 '专题-美食指南.md':'大盘鸡、熟制冷水鱼、抓饭、列巴与烤肉沿途错开。先看四人份量，再按当日路线查餐厅。',
 '专题-酒店指南.md':'八晚主选与一次钟点房休整。先核到店、供暖、停车和接驳，再比较已有两家备选。',
 '专题-预算规划.md':'机票与含钟点房住宿已有金额 ¥16,543.95；其余费用按真实订单补齐，备选与退款各算各的。',
 '专题-新疆摄影地图.md':'一处风景不只有一个机位。按日期看光线、按体力选镜头，合影与收线同样值得安排。',
 '专题-新疆旅行应急宝典.md':'先找应急电话，再按路段处理天气、车辆、失联与交通异常。把能离线使用的信息带在身边。',
 '专题-理想L7新疆自驾指南.md':'取车验车、油电补给与山区驾驶，围绕实车和当日道路作判断。固定阈值与宣传续航不代替车机提示。'
}
for d in m['documents']:
 key=d['file'].split('-')[0] if d['group']=='days' else d['file']
 d['summary']=summaries[key]
 if key=='Day4':d['tags']=['Day4','布尔津','克拉玛依','奎屯']
 if key=='Day1':d['tags']=['Day1','火车','奎屯站','取车','夜行']
m['homepageCopy']['policy-baseline']='编辑审查 2026-09-11 · 订单金额沿用 9 月 10 日回填 · 各资料保留原查询日期'
m['homepageCopy']['version']='v3.9 · 2026.09.11 全书审查与阅读优化'
manifest_path.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

gpath=ROOT/'src/data/daily-guides.json';g=json.loads(gpath.read_text(encoding='utf-8'))
for day in g:
 if day['day']=='D2':
  for c in day['categories']:
   c['actions']=[a.replace('电子边境通行证可通过“移民局 12367”申请，建议至少提前 3 个工作日办理并与身份证同时携带。','电子边境证区分网上和现场渠道：符合条件的内地成人可用“移民局 12367”；网上受理后 3 个工作日内决定是否批准，其他身份或带未满 16 岁子女须现场申请。') for a in c['actions']]
  for e in day['evidence']:
   if e['url']==nia:e.update(note='2026-09-11 核读：免费；符合条件的内地成人可网上申请，3 个工作日内决定；其他适用情形须现场申请，电子证或打印件与有效证件同时使用。',reviewedAt='2026-09-11',status='reviewed-publication')
 if day['day']=='D3':day['hardStop']='去程不早于 09:30、返程不晚于 16:00 且接驳确认才进喀纳斯。16:00 指喀纳斯发车；约 75 min 返村后再留 45 min 取车。留村分支才在 16:00 前自驾返布尔津。'
 if day['day']=='D6':
  day['hardStop']='08:55 前完成退房准备、09:00 发车，12:30 前出湖；方向或南门不成立时按开放出口重算转场。15:40 起准备，影棚妆造另核，20:00 写真收工不后移。'
  for c in day['categories']:
   c['summary']=c['summary'].replace('08:55 前退房出发','08:55 前准备好，09:00 出发')
   c['actions']=[a.replace('08:55 前完成装车退房','08:55 前完成装车退房准备，09:00 发车') for a in c['actions']]
gpath.write_text(json.dumps(g,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
update('src/data/reading-focus.js',lambda s:s.replace("key('班次窗口', '返程不晚于 16:00', '官方去程须不早于 09:30；去回两程都满足才进喀纳斯。'","key('班次窗口', '≤16:00 喀纳斯发车', '去程须不早于 09:30；返村约 75 分钟，另留 45 分钟取车。'")
 .replace('前夜补油并检查车况','出发前补油并检查车况')
 .replace("key('喀纳斯取舍', '三湾与湖岸分两天', 'D2 条件三湾；D3 班次合适才走湖岸短线，不重复赶景点。'","key('喀纳斯取舍', '两天择一处重点', '按班次与偏好选择三湾或湖岸；原条件双日仍保留，观鱼台不加回。'")
 .replace("key('最近调研', '先看 09.10 体验增补', '九条实读来源、季节预期与体验取舍，再查历史记录。', '20260910体验调研')","key('最新审查', '09.11 · 全书复核', '时间口径、边境证件、图片署名与阅读结构的本次更正。', '20260911全盘审查')"))
update('src/data/travel-experience.js',lambda s:s.replace("D8: { title: '把返程留得宽裕一点'","D8: { title: '衔接好最后一程'").replace("G4: '喀纳斯双日班次与回程'","G4: '喀纳斯游览日班次与回程'"))

# 最新审查条目区分外部核读、书内复算与仍待确认的资料。
entry=f'''<h2 id="20260911全盘审查">2026-09-11：全书内容与阅读结构审查</h2>
    <p>本次审查覆盖 22 章与首页速查，主行程、交通时刻、八晚住点、原备选和预算计算保留。下面分别记录纠错、实读来源与待确认项；旧日志中的历史时间或表述不再直接作为现行执行指引。</p>
    <ul>
      <li><strong>时间与路线：</strong>D1 统一 15:30 取车、16:00 前后发车，夜行包含 G217 普通公路；D3 区分 16:00 从喀纳斯乘车返村与留村分支的 16:00 自驾离村；D6 不预设 D5 已完成松树头，果子沟坚持谷底车观。</li>
      <li><strong>餐饮与休整：</strong>D0 机场用餐不跨过 18:20 到口目标；D2 既有停留内增加路餐补给提醒；D6 酒店准备与影棚妆造分开确认；D8 保留原安排，同时明确约 12 min 交通机动与 15 min 还车只是计划，延误先缩短餐饮和钟点房。</li>
      <li><strong>边境证件实读：</strong><a href="{nia}" target="_blank" rel="noreferrer">国家移民管理局电子边境通行证服务指南</a>于 9 月 11 日核读，确认 4 月 15 日启用、免费、网上与现场渠道及适用人群。网上受理后 3 个工作日内决定批准与否；现场需进一步调查的为 10 个工作日内。未取得游客中心“停止现场受理”的当期公告，不继续用作确定规则。</li>
      <li><strong>景区历史公告实读：</strong><a href="https://www.kns.gov.cn/005/005002/20250505/1811ea4d-6459-4205-b8bd-27e2aa5dfb52.html" target="_blank" rel="noreferrer">喀纳斯 2025 夏季公告</a>页面信息时间为 2025-04-30、正文落款 4 月 29 日，提供历史运营时间与购票渠道；不能证明 2026 年“每天 10:00、提前 7 天”放票，也不能支持“现场基本无票”的保证式判断。</li>
      <li><strong>票价与收费：</strong>原景区报价保留为预算快照；本次未补得赛湖 2026-08-20 按车收费原始公告，不据旧描述宣称当日已省 ¥180。自驾名额、收费方式、双日票和再入园以实际官方页面确认。</li>
      <li><strong>光线：</strong>按原太阳事件工具和近似坐标统一复算，去掉无法与原算法对应的金色时段表。布尔津 10-03 日落约 19:49；D5 赛湖约 20:05；D6 伊宁约 20:04。地形与云层另计，既定交通和收线时刻不因此后移。</li>
      <li><strong>图片与结构：</strong>白哈巴秋林图的旧木屋说明和旧署名已按图片登记资料更正。每日导读与时间轴前置；应急电话前置并支持拨号；四人点餐卡与手机餐厅表重新排版；专题标题按实际用途命名。</li>
    </ul>
    <p><strong>仍待临行确认：</strong>2026 国庆班次与准入、独库 10-09 开放及当期预约、影棚服务、餐厅营业、钟点房预订和实际订单状态。本次没有联系商家、订票、改订或支付。外部搜索未取得相关结果的内容没有作为新证据。</p>

    '''
update('src/pages/chapters/overview/04-来源与复核日志.vue',lambda s:s.replace('<div class="chapter-content">','<div class="chapter-content">\n    '+entry,1).replace('本条为本轮最新回填','本条为 9 月 10 日订单与报价回填').replace('<h2 id="20260904政策快照">2026-09-04 政策快照（T-28 复核）</h2>','<h2 id="20260904政策快照">2026-09-04 政策快照（历史记录）</h2><p>以下保留当时记录；边境证件、放票与赛湖收费的适用边界以本页 9 月 11 日审查为准，历史“当前口径”不代表今天再次核验。</p>'))
update('src/pages/chapters/overview/01-研究底稿.vue',lambda s:s.replace('版本：v3.9 奎屯站起止｜路线基线复核：2026-09-06｜政策复核：2026-09-06','主行程 v3.9｜原地图记录至 2026-09-06｜订单金额 2026-09-10 回填｜内容校审 2026-09-11；政策各按来源日志记录阅读'))
update('src/pages/chapters/overview/03-全书一致性与政策时效性复核.vue',lambda s:s.replace('八晚住宿与航班记录沿用原资料','八晚住宿与航班采用 9 月 10 日用户回填；9 月 11 日统一文章与条件表述'))
update('src/data/trip-intelligence.js',lambda s:s.replace("const reviewedAt = '2026-09-10'","const reviewedAt = '2026-09-11'").replace('十月班次、放行和营业仍须临行确认。','9 月 11 日完成文章与时间口径审查并核读电子边境证指南；十月班次、放行和营业仍须临行确认。').replace('04-来源与复核日志 · 9 月 10 日体验调研','04-来源与复核日志 · 9 月 11 日全书审查'))
print('Completed source verification, metadata sync, photo credits and solar references.')
