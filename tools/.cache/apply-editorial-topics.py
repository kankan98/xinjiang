from pathlib import Path
from urllib.parse import quote
import re
import json
from html import unescape, escape

ROOT=Path(__file__).resolve().parents[2]
PAGES=ROOT/'src/pages/chapters'
files={p:p.read_text(encoding='utf-8') for p in PAGES.rglob('*.vue')}
def path(name): return next(p for p in files if p.stem==name)
def replace(name,old,new,optional=False):
 p=path(name)
 if not optional: assert old in files[p],(name,old[:100])
 files[p]=files[p].replace(old,new)
def edit(name,fn):
 p=path(name);files[p]=fn(files[p])
def bounds(s,anchor,level=2):
 a=re.search(fr'<h{level}\s+id="{re.escape(anchor)}"[^>]*>',s);assert a,anchor
 b=re.search(fr'<h[1-{level}]\b|</div>\s*</template>\s*$',s[a.end():]);assert b,anchor
 return a.start(),a.end()+b.start()
def replace_section(name,anchor,body,level=2):
 p=path(name);s=files[p];a,b=bounds(s,anchor,level);end=s.index('</h',a);end=s.index('>',end)+1
 files[p]=s[:end]+'\n    '+body+'\n\n    '+s[b:]
def move(name,anchor,target,level=2):
 p=path(name);s=files[p];a,b=bounds(s,anchor,level);part=s[a:b];s=s[:a]+s[b:];i=re.search(fr'<h[23]\s+id="{re.escape(target)}"',s).start();files[p]=s[:i]+part+s[i:]
def link(name,label,anchor=''):
 return f'<a href="#/chapter/{quote(name)}'+(f'?section={quote(anchor)}' if anchor else '')+f'" data-doc="{name}.md"'+(f' data-section="{anchor}"' if anchor else '')+f'>{label}</a>'

# 应急指南：可拨打号码前置；真正的事故处理先于摄影与行程解释。
n='专题-新疆旅行应急宝典'
move(n,'1-联系卡','专题摘要',3)
replace(n,'<h3 id="1-联系卡">1. 联系卡</h3>','<h2 id="1-联系卡">应急联系，先找到能帮你的人</h2>')
hotlines='''
    <div class="emergency-contacts" role="group" aria-label="紧急联系电话">
      <a href="tel:110" aria-label="拨打110报警"><span>报警 / 道路事故</span><strong>110</strong><small>先报位置、方向和现场人数</small></a>
      <a href="tel:120" aria-label="拨打120急救"><span>医疗急救</span><strong>120</strong><small>说明伤情，按接线员指引处理</small></a>
      <a href="tel:119" aria-label="拨打119火警"><span>火警 / 车辆起火</span><strong>119</strong><small>人员先撤离车辆与危险区域</small></a>
    </div>
    <p class="article-lead">有人员受伤、火情或持续危险时立即求助，不等行程调整、拍照留证或失联等待时限。安全后再联系租车方、景区与酒店。</p>
'''
replace(n,'<h2 id="1-联系卡">应急联系，先找到能帮你的人</h2>','<h2 id="1-联系卡">应急联系，先找到能帮你的人</h2>'+hotlines)
replace(n,'无论是否进喀纳斯，均须在 16:00 前从白哈巴村停车场自驾返布尔津','留村分支在 16:00 前自驾离村；进喀纳斯分支须在 16:00 前从喀纳斯乘车返村，约 75 min 车程后另留 45 min 取行李验车，再自驾返布尔津')
replace(n,'D5 季枫 17:00 后仍未抵店，直接取消出门日落','D5 16:20 前未准备就绪则取消松树头；东岸日落另按入园、开放岸段、剩余天光和体力判断，不用登顶取消推定所有湖边活动取消')
replace(n,'预约制度与时段待最终公告确认（原引用为征求意见稿）','6-25 起实施已有 6-18/19 正式发布报道，十月是否继续预约及当天开放仍须核实')
replace(n,'遇独库段临时管制、达坂降雪、落石或长队，原路退回那拉提镇再决策：经 G218/S316/S315 绕行（高德绕行约 181 km / 3 h 03 min）或放弃唐布拉直回尼勒克；不等待、不夜穿','入山前条件不成立就执行唐布拉备线；入山后遇临时管制、降雪或落石，在合法安全位置服从交警调度，获准后再驶离。取消剩余游览，不能自行在隧道、弯道或禁掉头路段原路退回')
replace(n,'D2 固定 10 月 4 日下午游三湾','D2 条件成立才在 10 月 4 日下午游三湾')
replace(n,'边境证按 2026-04-15 起实施的电子通行证政策线上办理，最迟 2026-09-15 前完成申请，不在现场临时办理纸质证；完整规则详见《专题-景区百科》','边境凭证按本人证件类型向国家移民管理局、12367 或属地公安核实办理渠道；9 月 15 日前先查清要求，最迟 T-14 完成申请准备，不依赖景区现场受理；详见 D2')
replace(n,'火车误点或误车改签当日后续班次或城际大巴','火车误点或误车时先核当日可用班次及到达时间，其他交通另核运营与行李条件')
replace(n,'<ol><li>开危险警示灯，平稳移到官方停车区/安全带；</li><li>人员撤到护栏外或安全侧；</li><li>按道路规定放三角牌；</li><li>拍仪表、位置、车辆四角和环境；</li><li>联系租车救援；新疆高速事故/故障报警拨 110，伤员同时 120；</li><li>不拆高压系统、不接不明充电设备。</li></ol>','<ol><li>开启危险警示灯，在可控条件下平稳靠边；无法移动时立即求助。</li><li>人员撤到护栏外或安全侧，不停留在车道内。</li><li>立即拨 110；有伤员同时拨 120，有火情拨 119，按接线员指引处理。</li><li>在确保自身安全的前提下按道路规定设置警示，不冒险穿越车流。</li><li>安全后再联系租车救援、记录定位与车况；留证不延误报警。</li><li>不拆高压系统、不接不明充电设备。</li></ol>')
replace(n,'<h4 id="等待时限规则">等待时限规则</h4>','<h4 id="等待时限规则">失联后怎么判断</h4><p><strong>如已知有人受伤、迷路进入危险区域，或天气迅速恶化，立即联系 110 与景区工作人员。</strong>下面的等待安排只适用于无明确危险、约定地点安全的普通迟到；现场情况不明时可以更早求助。</p>')
replace(n,'白哈巴现场免费救援','白哈巴历史救援联络')

# 景区百科：用观察对象、建议玩法、当日边界替代整天时间轴的重复。
n='专题-景区百科'
scenes={
 '2-白哈巴在云端一晚与双日接驳': ('白哈巴｜木屋、白桦与村落生活',
   '<p class="destination-lead">把目光从远处的山，放回一扇院门、一段木篱和炊烟升起的方向。白哈巴值得留下的，是在村里过一晚的节奏。</p>',
   '<ul><li><strong>怎么走：</strong>留村时在开放主街慢走 45—60 min，再选热茶或一处允许进入的观景点。南村的在云端并不在老村核心，先向民宿确认入口与接送。</li><li><strong>怎么看：</strong>留意木屋材料、院落和林缘的颜色；人物、院门与生活细节拍摄先征得同意。初雪与晨雾是可能遇到的天气，不能作为必看承诺。</li><li><strong>怎么选：</strong>D2 去三湾和村里慢游二选一，D3 再按昨天的完成情况安排。骑马或音乐体验须实际有合适服务，不能默认民宿已经包含。</li><li><strong>先确认：</strong>本人边境证件、社会车辆准入、村内接驳与保暖条件。办理方式及适用人群查国家移民管理局、12367 与属地公安；旧稿未附原文的“固定 3 个工作日、游客中心停办”不作保证。</li></ul><p>'+link('Day2-布尔津-白哈巴','查看白哈巴的抵达、用餐与两种玩法','今日可选项')+'</p>'),
 '3-喀纳斯d3-区间车一日': ('喀纳斯｜三湾的曲线，湖岸的留白',
   '<p class="destination-lead">三湾适合看河流与林地的形状，主湖适合停下来感受水色与远山。想收获不同画面，先把去回接驳所占的时间算进去。</p>',
   '<ul><li><strong>三湾看什么：</strong>神仙湾看浅滩和林线；月亮湾保留经典河曲与主观景台；卧龙湾看开阔滩林。没有晨雾也可以观察河岸层次，D2 下午不以晨雾为目标。</li><li><strong>步行怎么留：</strong>月亮湾—卧龙湾约 2.6 km 只在栈道开放、路面和体力允许时走；人多就改区间车，不占用返程候车余量。</li><li><strong>主湖怎么选：</strong>D3 只走可原路返回的近岸短线；D2 未成行时，月亮湾与湖岸选一个重点。观鱼台与完整三湾不再塞进这一天。</li><li><strong>接驳要分清：</strong>D2 目标 14:30 去、20:00 从喀纳斯发车返村；D3 去程不早于 09:30、返程不晚于 16:00。都是待官方确认的条件，不是公布班次。留村分支才在 16:00 前自驾离开白哈巴。</li></ul><p>景区<a href="https://www.kns.gov.cn/005/005002/20250505/1811ea4d-6459-4205-b8bd-27e2aa5dfb52.html" target="_blank" rel="noreferrer">2025 年夏季公告</a>仅提供历史运营与购票渠道参考，不能证明 2026 国庆的班次、放票或车辆准入。'+link('Day3-白哈巴-喀纳斯全天','先选 D2 / D3 的组合','两天只进一次的选择')+'。</p>'),
 '5-赛里木湖d5-傍晚日落与d6-环湖': ('赛里木湖｜一个傍晚，一个上午',
   '<p class="destination-lead">湖面的颜色会随光线和风变化。D5 从远景与日落入手，D6 再看北岸、西岸和草甸，不必用环湖里程衡量这一站。</p>',
   '<ul><li><strong>D5 二选一：</strong>松树头适合看湖泊全景；东岸慢行适合近距离看水、拍合影与休息。16:20 前准备就绪且允许南岸往返才登顶，18:30 前回停车场。</li><li><strong>D6 看不同岸段：</strong>09:00 按开放方向出发，北岸和西岸选 2—3 处合法停车点；12:30 前出湖赴伊宁。D5 未去松树头，也不在 D6 补齐整圈。</li><li><strong>十月期待：</strong>看湖色、远山和草甸的秋季层次；夏季花海、满坡鲜绿和天鹅都不保证。风大或岸线湿滑时缩短步行，别为等蓝天错过出湖时间。</li><li><strong>两天票务：</strong>先核酒店是否在检票区内、出园回店及次日再入园是否覆盖，再核自驾费、实际通行方向与南门开放。旧稿 ¥70/人、5 座及以下 ¥120/车只作预算快照，未补得原始公告前不作为确定收费。</li></ul><p>'+link('Day5-奎屯-赛里木湖','D5 傍晚怎么选','湖边慢看的替换方案')+' · '+link('Day6-赛里木湖-伊宁','D6 环湖与出湖条件','环湖路线服从当日官方单向组织')+'</p>'),
 '6-唐布拉百里画廊d7-独库环线穿越': ('唐布拉｜高山公路，或一段河谷慢行',
   '<p class="destination-lead">沿喀什河谷看草甸、林线和牧场，把一处能合法停靠的地方看细。想体验达坂公路与想在谷地散步，是两种不同的旅行重心。</p>',
   '<ul><li><strong>独库条件线：</strong>那拉提只午餐补油，开放、天气、租车权限和当期预约全部满足，14:00 前才进入那拉提—乔尔玛段。全天约 7 h 35 min 纯驾驶，以车观为主。</li><li><strong>画廊怎么停：</strong>独库线只留一处约 20 min，16:45 离开百里画廊；阿克塔斯、森林公园以车观为主，按实际回县城车程判断余量。</li><li><strong>河谷慢行线：</strong>可以在伊宁出发前主动选择；先到尼勒克补给，只选开放道路上的近端停车点，留 45—60 min 步行与休息，15:30 前折返。</li><li><strong>季节与服务：</strong>秋色、天气与牧群位置随当天而变；不预设蜂场、马队或漂流十月营业。独库开放不能由往年封路日期推断。</li></ul><p>'+link('Day7-伊宁-那拉提-唐布拉-尼勒克','查看两条路线的完整日程','独库不通时怎么走')+'；本次仍住尼勒克县城主选，蜜蜂小镇只保留原备选。</p>'),
 '1-五彩滩d1-条件日落': ('五彩滩｜沿途了解，本次不入园', '',
   '<p>彩色侵蚀岩丘、额尔齐斯河与对岸树林形成鲜明对照，适合认识布尔津的河谷地貌。本次 D1 是火车接驳后的长途日，已取消五彩滩；不在 D2 早晨或返城晚上补入，也不再为它安排购票任务。</p>'),
 '4-d4布尔津至奎屯转场': ('克拉玛依方向｜车窗里的戈壁与工业地貌','',
   '<p>D4 从布尔津经 G217、G3014 和克拉玛依方向到奎屯，静态约 456.2 km / 5 h。途中只在既定的合法休息点观察戈壁与工业地貌；午餐、补油与换手优先。铁热克提与哈巴河不在 D4 的补给动线上，不据旧文案绕行。</p>')
}
chunks=[]
for anchor,(title,lead,body) in scenes.items():
 a,b=bounds(files[path(n)],anchor,3);s=files[path(n)][a:b]
 figure=re.search(r'<figure\b.*?</figure>',s,re.S).group(0)
 chunks.append(f'<h3 id="{anchor}">{title}</h3>\n    {lead}\n    {figure}\n    {body}\n\n    ')
text=files[path(n)];a,_=bounds(text,'关键结论');b=text.index('<h2 id="操作清单">')
files[path(n)]=text[:a]+'<h2 id="关键结论">四处风景，按路线读</h2>\n    '+''.join(chunks[:4])+'<h2 id="沿途了解">沿途了解</h2>\n    '+''.join(chunks[4:])+text[b:]
edit(n,lambda s:re.sub(r'<div class="callout is-note">.*?</div>','<p class="article-lead">白哈巴的村落、喀纳斯的河湾、赛里木湖的光线与唐布拉的山谷，各留一个记忆点。这章讲到现场看什么；每天的出发、接驳和收线时刻由对应日程承接。</p>',s,count=1,flags=re.S))

# 美食：份量卡前置；完整餐厅快照只在目录区集中备查。
n='专题-美食指南'
food_start,food_end=bounds(files[path(n)],'2-到了这些地方怎么点更合适',3)
food_aliases=re.findall(r'<h4\s+id="([^"]+)"',files[path(n)][food_start:food_end])
replace_section(n,'2-到了这些地方怎么点更合适','<p>先按当天住宿与真实余量选择片区，再找能确认营业和出餐时间的店。大盘鸡、熟制冷水鱼、抓饭与烤肉错开安排；具体份量看上方点餐卡。白哈巴去三湾的日子备路餐，D3 晚到先问厨房是否仍接单，D6 写真后就近吃热食。</p><p>以下店名、评分、人均与营业时间保留 <strong>2026-09-04 高德快照</strong>。评分帮助筛选，不证明当天在营、还有菜或出餐快；按菜单与实际服务选择。</p>',3)
replace(n,'<h3 id="2-到了这些地方怎么点更合适">',''.join(f'<span id="{a}" class="anchor-alias" aria-hidden="true"></span>' for a in food_aliases)+'<h3 id="2-到了这些地方怎么点更合适">')
p=path(n);s=files[p];a,b=bounds(s,'四人点餐卡');part=s[a:b]
table=re.search(r'<div class="table-scroll.*?</table></div>',part,re.S).group(0)
rows=re.findall(r'<tr>(.*?)</tr>',table,re.S)[1:];cards=[]
dishes=['大盘鸡与皮带面','一条熟制冷水鱼','热汤与蔬菜换口味','抓饭，或烤包子配汤','一碗拌面补足力气','最后一顿烤肉']
for idx,row in enumerate(rows):
 cells=[unescape(re.sub('<[^>]+>','',x)) for x in re.findall(r'<t[hd]\b[^>]*>(.*?)</t[hd]>',row,re.S)]
 day,order,adjust,budget=cells
 cards.append(f'<article class="order-note"><span class="order-note__day">{escape(day)}</span><h4>{dishes[idx]}</h4><p class="order-note__dish">{escape(order)}</p><p>{escape(adjust)}</p><footer>{escape(budget)}</footer></article>')
s=s.replace(table,'<div class="order-grid" aria-label="四人点餐建议">'+'\n'.join(cards)+'</div>');files[p]=s
move(n,'四人点餐卡','四人的味觉节奏')
replace(n,'本輪','本轮',optional=True)
replace(n,'午餐烧烤+大盘鸡（首推奎城味到、俭寨亚特店）','午餐选一家店吃大盘鸡或烧烤')
replace(n,'托托服务区只休息，13:30—14:15 精河服务区按当地午餐时段吃热食正餐','托托服务区休息，精河服务区计划 13:30—14:15 午餐；饿了可提前吃')
replace(n,'不因排队推到 21:30 后','20:40 离开餐饮片区，排队就换快出的热食')
replace(n,'庭院式出餐快','庭院式，出餐速度到店确认')
replace(n,'中盘配皮带面够四人','先核中盘份量，再配皮带面')
replace(n,'烤狗鱼/五道黑，晚到也营业','烤狗鱼/五道黑，晚到先确认厨房接单')
replace(n,'看完日落回来点餐也赶趟，营业到凌晨 1 点','到店前确认厨房接单时间；营业记录不代表全天供应所有菜')
replace(n,'拌面出餐最快，压得住 13:00—13:45 时间盒','先问拌面出餐时间，按 13:00—13:45 用餐窗口点单')
replace(n,'<strong>县域口径：</strong>那拉提镇与尼勒克县城高分店少于城市，按"热食、出餐快、营业晚"选择，不追求评分；尼勒克喀什河出产的虹鳟"天山三文鱼"是当地特色，按当季供应与计价现场确认。','<strong>选择原则：</strong>县城与镇上优先选择顺路、能确认营业和供餐的店。尼勒克虹鳟按当季供应与实际计价选择，采用熟制做法；不根据“天山三文鱼”商品名称判断可以生食。')
replace(n,'未冷藏的肉馅熟食不留到次日下午','需要冷藏的肉馅熟食按包装或商家要求保存，没有冷藏条件就现买现吃')
replace(n,'<h3 id="3-食品与驾驶安全">','<h3 id="3-食品与驾驶安全">',optional=True)
replace(n,'每日按约 2 L/人准备饮水','每日按约 2 L/人准备基础饮水，结合个人需要、活动量与沿途补给调整')
replace(n,'<h2 id="操作清单">','<p class="meal-note"><strong>D2 的下午别空着肚子：</strong>去三湾时，从停车场午餐到返村相隔较久。利用月亮湾原有停留，在允许用餐的休息处补一点馕、密封零食与热饮；不新增停车点，也不把 21:30 后的民宿简餐当作唯一补给。</p>\n    <h2 id="操作清单">')

# 住宿和预算：先读主选与已有金额，再看备选及体验额度。
n='专题-酒店指南'
move(n,'两家住宿备选','操作清单')
replace(n,'这类"店名蹭景区"的命名在旅游线路上很常见，导航请使用完整地址或 POI，不要只搜"喀纳斯"','导航请使用订单完整地址与门店定位，不要只搜“喀纳斯”')
replace(n,'D5 傍晚日落 + D6 上午环湖极为便利','便于衔接 D5 傍晚与 D6 上午；入园与再次入园规则另核')
replace(n,'确认停车与当晚最晚 19:30 到达','确认停车和 19:30 目标到达；途中延误及时通知保房')
replace(n,'确认停车与最晚 19:30 到达','确认停车、19:30 目标到达与晚到保房')
replace(n,'17:54 火车票已购或候补','17:54 火车票已实际出票；候补未成功不能当作有票')
replace(n,'停车仍是硬条件','仅自驾住宿日需要确认停车；D0 和 D8 打车接驳核上车点与行李空间')
replace(n,'D1 10:30 前进站从容','D1 按 10:30 前进站倒推退房和步行时间')

n='专题-预算规划'
move(n,'体验额度','操作清单')
replace(n,'现行路线不设住宿二选一；此前路线产生的订单状态待核','主选继续保留；精河为本书单列备选，采用时按 D4/D5 分支和退改记录调整。此前路线产生的订单状态待核')
replace(n,'果子沟大桥停车；六星街写真拍摄','果子沟大桥车观；六星街写真拍摄')
replace(n,'五彩滩票价待国庆公告','五彩滩本次不安排，不计门票')
replace(n,'2026-08-28 调价，全国最低价区','原稿所记 2026-08-28 参考价，调价依据待原文补证')
replace(n,'自驾服务费自 2026-08-20 起按车收费（5 座及以下 120 元/车）','自驾服务费原记 5 座及以下 120 元/车，计价方式与生效日须补核原始公告')
replace(n,'提前锁定的支出，其他费用都挂在这条骨架上','已有金额的支出；交通、餐饮和游览再按实际补齐')
replace(n,'住宿是全程唯一每天都会发生、且','住宿是全程主要的、')
replace(n,'最终公开版使用','结算时使用')
replace(n,'须在离港后 28 日内申请。','须在对应香港离境航段离港后 28 日内申请；本行程对应 10 月 2 日 HB862，不从返港日重新起算。')
replace(n,'出租/网约车预估 ¥40—60/车；排队超 30 分钟改网约车','原预估 ¥40—60/普通车仅供参考；四人与行李可能需大车或两车，按车型与实际订单另计')
replace(n,'电子边境管理区通行证按官方要求办理','边境管理区凭证按各人适用的官方渠道办理')

# L7：删除车型能力与固定阈值的保证式措辞，实车手册优先。
n='专题-理想L7新疆自驾指南'
move(n,'0-参数速查','附录a沿线能源节点清单')
replace(n,'发车前把第一段导航设为南环西路 → G3014 奎阿高速入口，确认走出奎屯城区再交给辅助驾驶','发车前把第一段导航设为南环西路 → G3014 奎阿高速入口。仅在手册允许且环境适合时使用辅助功能，驾驶员持续观察并负责控制车辆')
replace(n,'13:15 火车抵奎屯、午餐后 15:30 取车发车，状态远好于红眼取车；但末段约 2 h 为夜间高速，取到车不等于可以松懈','13:15 火车抵奎屯、午餐后 15:30 取车，留 30 min 验车后约 16:00 发车；末段可能夜行并包含 G217 普通公路，取到车后仍需评估驾驶员状态')
replace(n,'13:15 火车抵奎屯、午餐后 15:30 发车','13:15 火车抵奎屯，15:30 取车并验车，约 16:00 发车')
replace(n,'19:43 日落后的约 2 h 夜间段保持轮换','布尔津天文日落约 19:49；夜间段按实时到达时间评估，保持轮换')
replace(n,'17:40—18:10 克拉玛依方向服务区补油换手','约 18:00—18:20 在合法服务区休息换手，补油按实际油量安排')
replace(n,'末段夜间高速','末段夜行（含 G217 普通公路）')
replace(n,'按官方班次实际执行，最晚在 16:00 前从白哈巴发车回布尔津鸿宇福瑞','留村分支在 16:00 前从白哈巴自驾回布尔津；进喀纳斯分支为 16:00 前从喀纳斯乘车返村，约 75 min 接驳后另留 45 min 取行李验车，再开往鸿宇福瑞')
replace(n,'住宿落点固定为奎屯，不再执行西进分支','主选住宿仍为奎屯；精河备选只有确认换住并按 D4/D5 分支重排后才适用')
replace(n,'65 L 满箱即 500 km 以上燃油保障','实际可达距离按油量、能耗、天气与绕行余量估算，不把满油等同于固定续航保证')
replace(n,'只要油箱有油，增程器持续供电；<strong>低油才是真风险</strong>','燃油与系统状态正常时可由增程器供电；低温、持续大负荷、低电或故障仍可能限制动力')
replace(n,'低油低电叠加时立即进入救援流程','低油低电叠加时停止深入，无法安全到达补给点就联系救援')
replace(n,'CLTC 225 km 足够覆盖市内与周边','按实车电量与实际续航判断能否覆盖当天短途')
replace(n,'配合平稳车速油耗最低','配合平稳驾驶管理油电，实际能耗随工况变化')
replace(n,'比平时再加大一半车距','显著增大车距，不把固定倍数当作冰雪路面的安全保证')
replace(n,'理想L7 快充 30%→80% 半小时内，服务区充电通常“一次休息”即可补足','快充耗时受电池温度、桩功率和排队影响，不把“一次休息必能补足”作为前提')
replace(n,'<strong>高速充电性价比低：</strong>电价＋服务费约 1.7 元/度，快充 30%→80% 半小时','<strong>按需补电：</strong>充电费用与耗时以当站价格、车机估时和实况为准')
replace(n,'高速充电并不更划算','是否充电按当站价格、实际耗时和休息需要决定')
replace(n,'酒店慢充一晚（约 5.6 h 从低电量充满）即可恢复满电','酒店慢充能补多少取决于设备功率、初始电量、温度和停车时长')
replace(n,'市区 NOA 不适用本车','具体辅助功能以交付硬件、软件版本、订阅权限和手册为准')
replace(n,'电量降至约 20% 才启动增程器，尽量用电池行驶','优先使用电池行驶；增程器介入取决于实车软件、温度与工况，不写死为 20%')
replace(n,'进山、连续爬坡前把电量保在 50% 以上，达坂段建议 70%','进山前保留电池余量；目标与可设置范围按实车手册和车机，不将固定百分比当作通行条件')
replace(n,'（建议 50% 以上）','（按实车支持的设置）')
replace(n,'再把保电目标提到 70%','按实车手册选择合适的能量设置')
replace(n,'进山前把保电目标提到 70%','进山前按实车手册保留足够电池余量')
replace(n,'进山前用保电模式把电量留在 50%—70%','进山前按实车手册与车机评估电量余量')
replace(n,'17:00—17:45 到店','16:45—17:30 到店')
replace(n,'D7 独库预约（那拉提入口 14:00—16:00 时段）已成功并截图','D7 独库当期若需预约，已取得匹配那拉提入口与行程的凭证；若取消预约，已保存官方依据')
replace(n,'已购或候补','已实际出票；候补未成功不能当作有票')
replace(n,'空调由电驱动，增程器可随时补电，不需要为空调单独“省电”；','空调会消耗能源，增程器可能自动启动；不得在封闭车库或通风不良处长时间怠速休整或睡在车内。')

# 总目录补齐 22 章的真实链接，把阅读方法放在版本历史之前。
n='00-总目录'
edit(n,lambda s:re.sub(r'<div class="callout is-note"><strong>本轮更新.*?</div>','',s,count=1,flags=re.S))
edit(n,lambda s:re.sub(r'<div class="callout is-note"><strong>9 月 10 日新增.*?</div>','',s,count=1,flags=re.S))
replace(n,'HB862 与 HX457 日期时刻不变','HB862 10 月 2 日 19:25 起飞（到达时刻须核更新客票）；HX457 10 月 11 日 02:15 起飞，均按实际客票核对')
edit(n,lambda s:re.sub(r'<div class="callout is-note"><p><strong>当地作息基准.*?</div>','<p class="article-lead"><strong>全书只用北京时间。</strong>新疆地处中国西部，日照与常见用餐节奏相对偏晚；预约班车、酒店与摄影时，说清日期和北京时间。饭点可以按饥饿程度调整，列车、航班与已确认接驳按实际时刻执行。</p>',s,count=1,flags=re.S))
manifest=json.loads((ROOT/'src/data/roadbook.manifest.json').read_text(encoding='utf-8'))
directory=[]
for group,title in [('days','按天出发'),('topics','随手查专题'),('overview','行前与来源')]:
 items=[d for d in manifest['documents'] if d['group']==group and not d['file'].startswith('00-')]
 anchor={'days':'卷二日程','topics':'卷三专题','overview':'卷一总览'}[group]
 directory.append(f'<section class="book-directory__group"><h3 id="{anchor}">'+title+'</h3><ul>'+''.join('<li>'+link(d['file'][:-3],d['title'])+'</li>' for d in items)+'</ul></section>')
replace_section(n,'卷册目录','<div class="book-directory">'+''.join(directory)+'</div>')
replace(n,'<h2 id="单线定位">','<div class="reading-guide"><p><strong>出发前</strong>读路线推导，核对订单与七项准备。</p><p><strong>每天前一晚</strong>打开次日章节，看时间轴与调整条件。</p><p><strong>旅途中</strong>需要吃住、拍摄或帮助时，直接查对应专题。</p></div>\n    <h2 id="单线定位">')

n='02-路线推导'
replace(n,'13:30 后才到白哈巴停车场也取消三湾','13:20 仍未离开白哈巴停车场就取消三湾')
replace(n,'那拉提—乔尔玛段为官方口径估算','那拉提—乔尔玛段为原历史资料估算')
replace(n,'<h3 id="今年秋色如何期待">','<h2 id="今年秋色如何期待">')
replace(n,'今年的秋色，按实况期待</h3>','今年的秋色，按实况期待</h2>')

# 普通手册标题说清用途，数字由正文层级与目录统一承担，锚点保持不变。
titles={
 '专题-景区百科': ('四段风景，四种看法',None,'入园前逐项确认','开放、票务与资料日期'),
 '专题-美食指南': ('先把每一顿吃舒服','沿途餐厅与点单备查','出发前的餐饮准备','价格与营业说明'),
 '专题-酒店指南': ('八晚落脚，一次返程休整','逐店入住与接驳','联系酒店，照着问','订单与服务说明'),
 '专题-预算规划': ('先看已有金额，再补齐全程','费用基线与明细','按真实账单回填','报价与支出的边界'),
 '专题-新疆摄影地图': ('按风景和光线拍，按时收工','每天的机位与拍法','器材与收线准备','光线与现场条件'),
 '专题-新疆旅行应急宝典': ('遇到状况，先照顾人','按路段处理异常','四人分工与离线准备','号码来源与有效性')
}
for n,labels in titles.items():
 for anchor,label in zip(['专题摘要','关键结论','操作清单','动态信息提醒'],labels):
  if label:edit(n,lambda s,a=anchor,l=label:re.sub(fr'(<h2 id="{a}">).*?(</h2>)',lambda m:m[1]+l+m[2],s,count=1))
for p,s in list(files.items()):
 if p.parent.name!='topics':continue
 s=re.sub(r'(<h[234]\b[^>]*>)\d+(?:\.\d+)*(?:\.\s*|\s+)',r'\1',s)
 s=s.replace('>0. 理想L7','>理想L7')
 s=s.replace('>版本：v3.9 奎屯站起止｜', '>资料日期：')
 # 明确餐厅长表；在手机逐行列出标签，不把店名挤成逐字窄列。
 def annotate(m):
  block=m.group(0)
  if any(x in block for x in ['评分 / 人均','全线店铺','餐饮节奏','本次用途']):
   block=block.replace('class="table-scroll ', 'class="table-scroll table-scroll--directory ',1)
  return block
 s=re.sub(r'<div class="table-scroll\b.*?</table>\s*</div>',annotate,s,flags=re.S)
 files[p]=s

for p,s in files.items():
 if p.read_text(encoding='utf-8')!=s:p.write_text(s,encoding='utf-8')
print('Reorganized destination, food, stay, budget, emergency and vehicle articles; stable anchors retained.')
