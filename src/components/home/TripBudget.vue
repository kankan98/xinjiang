<script setup>
import { computed, ref, watch } from 'vue'
import SectionHeading from '../ui/SectionHeading.vue'
import { tripProfile } from '../../data/travel-experience.js'
import { calculateStayPlan, normalizeStayChoices, stayAlternatives } from '../../data/accommodation.js'
import { budgetDefaults, budgetFields, calculateBudget, normalizeBudget } from '../../lib/travel.js'
import { readPlannerState, writePlannerState } from '../../lib/storage.js'

defineEmits(['navigate'])
const values = ref(normalizeBudget(readPlannerState('budget', budgetDefaults)))
const stayChoices = ref(normalizeStayChoices(readPlannerState('stay-comparison', null)))
const stayPlan = computed(() => calculateStayPlan(stayChoices.value))
const budget = computed(() => calculateBudget(values.value, { ...tripProfile, hotels: stayPlan.value.total }))
const money = (value) => new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)
watch(values, (value) => writePlannerState('budget', normalizeBudget(value)), { deep: true })
watch(stayChoices, (value) => writePlannerState('stay-comparison', normalizeStayChoices(value)), { deep: true })
function reset() {
  values.value = { ...budgetDefaults }
  stayChoices.value = normalizeStayChoices(null)
}
</script>

<template>
  <section id="tripBudget" class="trip-budget experience-section" aria-labelledby="tripBudgetTitle">
    <SectionHeading eyebrow="04 / THE TRIP BUDGET" title="把预算算好，把心思留给旅行。" description="四人共享一份预算试算。这里只改变本机数字，所有正式费用仍按订单和实际结算。" heading-id="tripBudgetTitle">
      <template #actions><button type="button" class="quiet-link" @click="$emit('navigate', '专题-预算规划.md')">查看订单与费用明细 <span aria-hidden="true">↗</span></button></template>
    </SectionHeading>
    <div class="budget-console" @change="values = normalizeBudget(values)">
      <div class="budget-baseline">
        <span class="eyebrow">机票与所选住宿 · 4 人</span>
        <strong><small>¥</small>{{ money(budget.fixed) }}</strong>
        <dl><div><dt>往返机票</dt><dd>¥{{ money(tripProfile.flights) }}</dd></div><div><dt>两间房 × 8 晚</dt><dd data-testid="overnight-total">¥{{ money(stayPlan.total) }}</dd></div><div><dt>两间钟点房 · 3 小时</dt><dd>¥{{ money(budget.room) }}</dd></div></dl>
        <p>按已有金额计算：机票 ¥10,000，八晚住宿已纳入 9 月 30 日补充的新源汉庭订单；返程钟点房为 20:30—23:30，两间合计 ¥198，预订状态待确认。餐饮、门票与接驳另计。</p>
      </div>
      <div class="budget-estimates">
        <h3>先给吃饭和油电留一个余量</h3>
        <div class="budget-input-grid">
          <label><span>餐饮 · 元 / 人 / 天</span><input v-model="values.mealPerPersonDay" type="number" min="0" max="1000000" step="10" inputmode="decimal" aria-label="每日人均餐饮预算"></label>
          <label><span>油费＋电费 · 全车合计（元）</span><input v-model="values.energyTotal" type="number" min="0" max="1000000" step="50" inputmode="decimal" aria-label="全程油电预算"></label>
        </div>
        <p class="budget-assumption">餐饮按 4 人 × 10 天预留；油电沿用全程合计 ¥1,500 的规划额度，可按实际账单修改。D7 进镇施工导行尚待复核，完整里程未定，改线时也要重新检查油电额度。</p>
        <p class="budget-assumption">原合同租车 ¥4,489、钟点房 ¥198 已填入，延长还车的费用另补。已有自定义油电总额会保留，恢复默认可回到 ¥1,500；油电、租车和钟点房填 0 表示不使用，清空则恢复预填值。其余费用留空表示待确认。</p>
        <details class="budget-other">
          <summary>补入租车、票务和其他费用 <span>{{ budget.missing.length ? `${budget.missing.length} 项未填` : '已填写' }}</span></summary>
          <div class="budget-input-grid"><label v-for="field in budgetFields" :key="field.key"><span>{{ field.label }} · 元</span><input v-model="values[field.key]" type="number" min="0" max="1000000" step="1" inputmode="decimal" placeholder="待填（全员合计）" :aria-label="field.label"></label></div>
        </details>
      </div>
      <div class="budget-stay-options" aria-labelledby="stayComparisonTitle">
        <h3 id="stayComparisonTitle">精河备选，连着前后两天一起选</h3>
        <p>试算只替换对应一晚的计划入住成本。未取消的备用订单可能仍会扣费，须另核取消期限与凭证；已确认的退改损失补入其他费用。网页行程与地图仍显示主选，额外油路费和早餐差价按实际补入。</p>
        <div class="budget-stay-grid">
          <div v-for="option in stayAlternatives" :key="option.id" class="budget-stay-choice">
            <label :for="`stay-${option.day}`">{{ option.dateLabel }}住宿方案</label>
            <select :id="`stay-${option.day}`" v-model="stayChoices[option.day]">
              <option value="primary">主选 · {{ option.primaryName }} · ¥{{ money(option.primaryCents / 100) }}</option>
              <option :value="option.id">备选 · {{ option.name }} · ¥{{ money(option.cents / 100) }}</option>
            </select>
            <p class="budget-stay-picked" aria-live="polite"><span>{{ stayChoices[option.day] === option.id ? option.name : option.primaryName }}</span><strong>两间合计 ¥{{ money((stayChoices[option.day] === option.id ? option.cents : option.primaryCents) / 100) }}</strong></p>
            <p>换住备选时：{{ option.note }}</p>
            <button type="button" class="quiet-link" @click="$emit('navigate', option.file, option.section)">查看{{ option.dateLabel }}换住安排 <span aria-hidden="true">↗</span></button>
          </div>
        </div>
        <p class="budget-stay-saving" aria-live="polite">{{ stayPlan.savings ? `所选方案比主选房费少 ¥${money(stayPlan.savings)}，尚未扣除退改及交通差价；没有变更任何订单。` : `当前按主选住宿计算：八晚 ¥${money(stayPlan.total)}；加填写的钟点房金额后，住宿共 ¥${money(budget.fixed - tripProfile.flights)}。` }}</p>
      </div>
      <div class="budget-result" aria-live="polite" aria-atomic="true">
        <div><span>当前试算小计</span><strong data-testid="budget-total">¥{{ money(budget.total) }}</strong></div>
        <div><span>人均试算</span><strong>¥{{ money(budget.perPerson) }}</strong></div>
        <p>包含餐饮约 ¥{{ money(budget.meals) }}、油电约 ¥{{ money(budget.energy) }}。{{ budget.missing.length ? `还有 ${budget.missing.length} 项未填，这不是最终总预算。` : '已纳入填写的费用，最终以实际账单为准。' }}未填数量仅统计上方费用栏；备用订单、港币交通、退税退款和应急金仍须分别核对，港币未做自动汇率换算。</p>
        <button type="button" class="quiet-link" @click="reset">恢复试算默认值</button>
      </div>
    </div>
  </section>
</template>
