import { useState, useEffect } from "react";
import { storage } from "./storage.js";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

// ─── CONFIG ────────────────────────────────────────────────────────────────
const PLAN_START = "2026-03-04";
const PLAN_END   = "2026-06-04";
const TOTAL_DAYS = 92;
const TODAY      = new Date().toISOString().split("T")[0];

const getDayN = (d = TODAY) => {
  const diff = (new Date(d + "T00:00:00") - new Date(PLAN_START + "T00:00:00")) / 86400000;
  return Math.max(1, Math.floor(diff) + 1);
};
const isWeekendDate = (d = TODAY) => {
  const day = new Date(d + "T12:00:00").getDay();
  return day === 0 || day === 6;
};
const fmtDate = (d) => {
  try { return new Date(d + "T00:00:00").toLocaleDateString("zh-CN",{month:"short",day:"numeric",weekday:"short"}); }
  catch { return d; }
};

// ─── TASKS ────────────────────────────────────────────────────────────────
const WEEKDAY_TASKS = [
  { key:"morning_exercise", label:"晨练八段锦",       icon:"🧘", desc:"20分钟 · 空腹温和运动", cat:"health" },
  { key:"breakfast",        label:"低FODMAP早餐",      icon:"🥣", desc:"白米粥 / 蒸蛋 / 米饭",  cat:"health" },
  { key:"job_apply",        label:"投递简历",           icon:"📤", desc:"目标 5–8 份/天",        cat:"job", hasCount:true },
  { key:"ielts_study",      label:"雅思精读 / 听力",   icon:"📖", desc:"60分钟 · 剑桥真题",     cat:"ielts" },
  { key:"job_research",     label:"求职跟进",           icon:"🔍", desc:"回复HR · 研究公司 · 备战面试", cat:"job" },
  { key:"ielts_practice",   label:"雅思写作 / 口语",   icon:"✍️", desc:"45分钟 · 专项练习",     cat:"ielts" },
  { key:"exercise",         label:"运动",               icon:"💃", desc:"Just Dance / 瑜伽 / 健身环", cat:"health" },
  { key:"tidy",             label:"物品整理",           icon:"🗂️", desc:"15分钟 · 定点清理",    cat:"life" },
  { key:"creative",         label:"创意时间",           icon:"✏️", desc:"网文写作 / 小红书更新", cat:"freelance" },
  { key:"game",             label:"手游放松",           icon:"🎮", desc:"30分钟 · 不超时",      cat:"life" },
  { key:"plan_tomorrow",    label:"规划明日",           icon:"📋", desc:"10分钟 · 三件优先事",  cat:"life" },
];

const WEEKEND_TASKS = [
  { key:"morning_exercise", label:"晨练 / 轻拉伸",    icon:"🧘", desc:"八段锦或瑜伽", cat:"health" },
  { key:"breakfast",        label:"悠闲早餐",          icon:"🥣", desc:"低FODMAP · 自然醒后",  cat:"health" },
  { key:"job_review",       label:"求职周复盘",        icon:"📊", desc:"整理投递 · 复盘面试 · 调整策略", cat:"job" },
  { key:"ielts_study",      label:"雅思自选练习",      icon:"📖", desc:"轻松节奏 · 选做",     cat:"ielts" },
  { key:"exercise_long",    label:"长时运动",          icon:"💪", desc:"60分钟 · 舞蹈+力量+拉伸", cat:"health" },
  { key:"tidy_weekly",      label:"整理一箱物品",      icon:"📦", desc:"每周固定 · 扔/送/留",  cat:"life" },
  { key:"creative",         label:"创意时间",          icon:"✏️", desc:"网文 / 小红书 · 无压力", cat:"freelance" },
  { key:"game",             label:"手游放松",          icon:"🎮", desc:"30分钟",               cat:"life" },
  { key:"rest",             label:"充分休息",          icon:"😌", desc:"社交 / 影视 / 发呆都行", cat:"life" },
];

const CAT = {
  job:       { bg:"#EBF3EC", bd:"#9DC4A1", tx:"#3D6B42", label:"找工作" },
  ielts:     { bg:"#EEF0F8", bd:"#9AA8C8", tx:"#354880", label:"雅思" },
  health:    { bg:"#F5EEE6", bd:"#C49B72", tx:"#7A4520", label:"健康" },
  freelance: { bg:"#FDF3E3", bd:"#D4A850", tx:"#7A5010", label:"副业" },
  life:      { bg:"#F4F2EE", bd:"#C0BAB0", tx:"#6B6860", label:"生活" },
};

// ─── SCHEDULES ─────────────────────────────────────────────────────────────
const PERIODS = [
  { key:"morning",   label:"上午",  range:"07:00–12:00", icon:"🌤️" },
  { key:"afternoon", label:"下午",  range:"12:00–18:00", icon:"☀️"  },
  { key:"evening",   label:"夜间",  range:"18:00–22:30", icon:"🌙" },
];
const PERIOD_STYLE = {
  morning:   { bg:"#FFF8EF", hdbg:"#FFF0DC", hdc:"#8B5E3C", bd:"#F0DCC8" },
  afternoon: { bg:"#F2FAF2", hdbg:"#E2F5E3", hdc:"#2E6B35", bd:"#C2E2C5" },
  evening:   { bg:"#F2F4FB", hdbg:"#E4E8F8", hdc:"#3A4DA0", bd:"#C4CCE8" },
};

const WD_SCHED = [
  // ── 上午 ──
  { t:"07:00", lbl:"起床 · 喝温水",                       tag:"生活",   period:"morning" },
  { t:"07:15", lbl:"低FODMAP早餐",                         tag:"饮食",   period:"morning", dur:"30 min", taskKey:"breakfast" },
  { t:"—",     lbl:"🚽 如厕（早间）",                      tag:"缓冲",   period:"morning", dur:"~20 min", buf:true, float:true, floatKey:"wc_am1" },
  { t:"08:10", lbl:"八段锦晨练",                           tag:"运动",   period:"morning", dur:"20 min", taskKey:"morning_exercise" },
  { t:"08:30", lbl:"求职 · 搜索 + 投递",                   tag:"找工作", period:"morning", dur:"90 min", taskKey:"job_apply", hasCount:true },
  { t:"—",     lbl:"🚽 如厕（上午中段）",                  tag:"缓冲",   period:"morning", dur:"~20 min", buf:true, float:true, floatKey:"wc_am2" },
  { t:"10:20", lbl:"雅思精读 / 听力",                      tag:"雅思",   period:"morning", dur:"60 min", taskKey:"ielts_study" },
  { t:"11:20", lbl:"求职跟进 · 回复 HR + 公司研究",         tag:"找工作", period:"morning", dur:"40 min", taskKey:"job_research" },
  // ── 下午 ──
  { t:"12:00", lbl:"做午饭",                               tag:"饮食",   period:"afternoon", dur:"30 min" },
  { t:"12:30", lbl:"吃午饭",                               tag:"饮食",   period:"afternoon", dur:"30 min" },
  { t:"13:00", lbl:"消食 · 手游 / 散步 🎮",                tag:"生活",   period:"afternoon", dur:"30 min", taskKey:"game" },
  { t:"—",     lbl:"🚽 如厕（午后）+ 午休",                tag:"缓冲",   period:"afternoon", dur:"~30 min", buf:true, float:true, floatKey:"wc_pm" },
  { t:"14:00", lbl:"求职 · 面试备战 + 补充投递",            tag:"找工作", period:"afternoon", dur:"75 min", taskKey:"job_research" },
  { t:"15:15", lbl:"雅思写作 / 口语练习",                   tag:"雅思",   period:"afternoon", dur:"45 min", taskKey:"ielts_practice" },
  { t:"16:00", lbl:"运动（舞蹈 / 瑜伽 / 健身环）",          tag:"运动",   period:"afternoon", dur:"45 min", taskKey:"exercise" },
  { t:"16:45", lbl:"物品整理",                              tag:"生活",   period:"afternoon", dur:"15 min", taskKey:"tidy" },
  { t:"17:00", lbl:"晚饭准备 + 吃饭",                       tag:"饮食",   period:"afternoon", dur:"75 min" },
  // ── 夜间 ──
  { t:"18:15", lbl:"自由职业接单（弹性）",                   tag:"副业",   period:"evening", dur:"弹性" },
  { t:"19:00", lbl:"创意时间 · 网文 / 小红书",              tag:"副业",   period:"evening", dur:"60 min", taskKey:"creative" },
  { t:"—",     lbl:"🚽 如厕（晚间）",                      tag:"缓冲",   period:"evening", dur:"~20 min", buf:true, float:true, floatKey:"wc_ev" },
  { t:"20:10", lbl:"规划明日 · 三件优先事",                  tag:"生活",   period:"evening", dur:"10 min", taskKey:"plan_tomorrow" },
  { t:"20:20", lbl:"洗澡",                                  tag:"生活",   period:"evening", dur:"30 min" },
  { t:"20:50", lbl:"雅思泛听（背景音频）",                   tag:"雅思",   period:"evening", dur:"30 min" },
  { t:"21:20", lbl:"放松 · 阅读 / 冥想",                    tag:"生活",   period:"evening", dur:"25 min" },
  { t:"21:45", lbl:"睡前整理 · 关屏准备",                   tag:"生活",   period:"evening", dur:"15 min" },
  { t:"22:00", lbl:"就寝 😴",                              tag:"生活",   period:"evening" },
];

const WE_SCHED = [
  { t:"08:00", lbl:"自然醒 · 无闹钟",                     tag:"生活",   period:"morning" },
  { t:"08:30", lbl:"悠闲低FODMAP早餐",                     tag:"饮食",   period:"morning", dur:"45 min", taskKey:"breakfast" },
  { t:"—",     lbl:"🚽 如厕（早间）",                      tag:"缓冲",   period:"morning", dur:"~25 min", buf:true, float:true, floatKey:"wc_we_am" },
  { t:"09:40", lbl:"八段锦 / 轻拉伸",                      tag:"运动",   period:"morning", dur:"25 min", taskKey:"morning_exercise" },
  { t:"10:05", lbl:"雅思轻松练习（选做）",                  tag:"雅思",   period:"morning", dur:"60 min", taskKey:"ielts_study" },
  { t:"11:05", lbl:"求职周复盘 · 整理投递 + 调整策略",       tag:"找工作", period:"morning", dur:"55 min", taskKey:"job_review" },
  { t:"12:00", lbl:"做午饭 + 吃饭",                        tag:"饮食",   period:"afternoon", dur:"60 min" },
  { t:"—",     lbl:"🚽 如厕（午后）+ 午休",                tag:"缓冲",   period:"afternoon", dur:"~30 min", buf:true, float:true, floatKey:"wc_we_pm" },
  { t:"13:30", lbl:"长时运动（舞蹈 + 力量 + 拉伸）",        tag:"运动",   period:"afternoon", dur:"60 min", taskKey:"exercise_long" },
  { t:"14:30", lbl:"手游放松 🎮",                         tag:"生活",   period:"afternoon", dur:"30 min", taskKey:"game" },
  { t:"15:00", lbl:"📦 整理一箱物品",                      tag:"生活",   period:"afternoon", dur:"30 min", taskKey:"tidy_weekly" },
  { t:"15:30", lbl:"创意时间 · 网文 / 小红书",              tag:"副业",   period:"afternoon", dur:"60 min", taskKey:"creative" },
  { t:"16:30", lbl:"自由时间 · 社交 / 出门",               tag:"生活",   period:"afternoon", taskKey:"rest" },
  { t:"18:00", lbl:"晚饭",                                tag:"饮食",   period:"evening", dur:"60 min" },
  { t:"—",     lbl:"🚽 如厕（晚间）",                      tag:"缓冲",   period:"evening", dur:"~20 min", buf:true, float:true, floatKey:"wc_we_ev" },
  { t:"21:00", lbl:"洗澡",                                tag:"生活",   period:"evening", dur:"30 min" },
  { t:"21:30", lbl:"放松 · 冥想 / 散步",                   tag:"生活",   period:"evening" },
  { t:"22:30", lbl:"就寝 😴",                             tag:"生活",   period:"evening" },
];

// ─── MILESTONES ────────────────────────────────────────────────────────────
const MILESTONES = [
  { date:"2026-03-11", day:8,  label:"简历更新完毕 · 投递系统建立", check:"投递≥30份" },
  { date:"2026-03-31", day:28, label:"第一阶段结束", check:"累计投递≥100份 · 面试≥3次" },
  { date:"2026-04-15", day:43, label:"面试高峰期", check:"终面≥2家 · 小红书≥6篇" },
  { date:"2026-05-01", day:59, label:"🎓 雅思考试", check:"报名4月初 · 目标7分" },
  { date:"2026-05-18", day:76, label:"✅ 确认offer", check:"薪资≥18k · 签合同" },
  { date:"2026-06-01", day:90, label:"📦 搬家准备完成", check:"物品精简50% · 新住址确认" },
];

// ─── TARGET COMPANIES ──────────────────────────────────────────────────────
const TARGET_COS = [
  { name:"快手",         tier:"A", reason:"短视频/创作者生态，直接对口你的字节创作者运营经验" },
  { name:"小红书",       tier:"A", reason:"社区+内容安全，与你UGC内容安全背景高度匹配" },
  { name:"哔哩哔哩",     tier:"A", reason:"UP主运营、弹幕/举报产品，与抖音举报人审经验对口" },
  { name:"美团",         tier:"A", reason:"TO C平台运营，体量大薪资高，北京总部" },
  { name:"字节（回流）", tier:"A", reason:"离职满1年后可投，内推直接联系前同事" },
  { name:"京东",         tier:"B", reason:"内容电商/直播运营，百度电商经验加分" },
  { name:"腾讯（北京）", tier:"B", reason:"视频号/内容生态，运营岗对口" },
  { name:"爱奇艺",       tier:"B", reason:"内容运营/创作者中台，北京总部" },
  { name:"得物",         tier:"B", reason:"UGC社区运营，内容安全产品" },
  { name:"网易",         tier:"B", reason:"游戏/云音乐内容运营，北京有岗" },
  { name:"滴滴",         tier:"C", reason:"平台运营（司机端/用户端），产品运营通用" },
  { name:"理想汽车",     tier:"C", reason:"用户社区运营，新能源热门赛道" },
  { name:"货拉拉",       tier:"C", reason:"运营岗缺口大，薪资给到位" },
  { name:"BOSS直聘",     tier:"C", reason:"HR产品侧运营，对口你的产品运营背景" },
  { name:"猫眼/大麦",   tier:"C", reason:"内容/票务平台运营" },
];

const JOB_STATUSES = ["已投递","已读","电话沟通","面试邀约","面试中","终面","已offer","已拒","已放弃"];
const STATUS_COLOR = {
  "已投递":"#A8A49C","已读":"#6B9B72","电话沟通":"#6B9B72",
  "面试邀约":"#B8972A","面试中":"#B8972A","终面":"#9B6B42",
  "已offer":"#3D6B42","已拒":"#C4614A","已放弃":"#C8C3BA"
};
const PLATFORMS = ["BOSS直聘","猎聘","领英","智联招聘","拉勾","内推","其他"];

// ─── CSS ───────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=IBM+Plex+Mono:wght@300;400;500&display=swap');
:root{
  --bg:#F2EDE4;--sf:#F8F4EE;--sf2:#FFFFFF;--bd:#DDD7CC;--bd2:#EDE8E0;
  --sg:#6B9B72;--sgl:#9DC4A1;--sgd:#3D6B42;
  --ea:#9B6B42;--eal:#C49B72;--rd:#C4614A;--gd:#B8972A;
  --ch:#252520;--md:#6B6860;--st:#A8A49C;--bdd:#C8C3BA;
  --phbg:#EBF3EC;--nav:#2A3F2C;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);font-family:'IBM Plex Mono','Noto Serif SC',monospace;color:var(--ch);min-height:100vh;font-size:13px;}
.app{max-width:960px;margin:0 auto;padding:0 16px 96px;}
.header{padding:24px 0 0;margin-bottom:18px;}
.hrow{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--bd);}
.logo{font-family:'Lora',serif;font-size:22px;font-weight:500;color:var(--sgd);letter-spacing:-0.3px;line-height:1;}
.logo em{font-style:italic;color:var(--ea);}
.logo .sub{font-size:11px;color:var(--st);font-family:'IBM Plex Mono',monospace;font-style:normal;margin-top:4px;letter-spacing:.5px;}
.dinf{text-align:right;}
.dbig{font-family:'Lora',serif;font-size:17px;color:var(--ch);}
.dsub{font-size:10px;color:var(--st);letter-spacing:.8px;margin-top:2px;}
.dday{font-size:11px;color:var(--sgd);font-weight:500;margin-top:3px;}
.nav{display:flex;gap:4px;margin-top:12px;flex-wrap:wrap;}
.nbtn{padding:6px 14px;font-size:11px;letter-spacing:.7px;text-transform:uppercase;font-family:'IBM Plex Mono',monospace;border:1px solid var(--bd);background:transparent;color:var(--st);border-radius:20px;cursor:pointer;transition:all .18s;white-space:nowrap;}
.nbtn:hover{border-color:var(--sgl);color:var(--sgd);background:var(--phbg);}
.nbtn.active{background:var(--nav);border-color:var(--nav);color:white;}
.card{background:var(--sf);border:1px solid var(--bd);border-radius:12px;padding:18px 20px;margin-bottom:14px;}
.ct{font-family:'Lora',serif;font-size:15px;color:var(--sgd);margin-bottom:14px;display:flex;align-items:center;gap:7px;}
.ct .ico{font-size:16px;}
.csub{font-size:10px;color:var(--st);letter-spacing:.5px;margin-left:auto;}
.seh{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.set{font-family:'Lora',serif;font-size:18px;color:var(--ch);}
.btn{padding:8px 16px;border-radius:8px;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.4px;cursor:pointer;border:none;transition:all .18s;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;}
.bprim{background:var(--sgd);color:white;}
.bprim:hover{background:var(--sg);}
.bprim:disabled{background:var(--bdd);cursor:default;}
.bearth{background:var(--ea);color:white;}
.bearth:hover{background:var(--eal);}
.boutl{background:transparent;border:1px solid var(--bd);color:var(--md);}
.boutl:hover{border-color:var(--sgl);color:var(--sgd);}
.bsm{padding:5px 12px;font-size:10px;}
.toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--nav);color:white;padding:9px 20px;border-radius:20px;font-size:11px;z-index:999;animation:tia .3s ease;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.2);}
@keyframes tia{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
/* Checkin */
.task-grid{display:flex;flex-direction:column;gap:8px;}
.task-item{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:10px;border:1px solid var(--bd);background:var(--sf2);cursor:pointer;transition:all .18s;user-select:none;}
.task-item:hover{border-color:var(--bdd);}
.task-item.done{opacity:.6;}
.task-item.done .task-label{text-decoration:line-through;color:var(--st);}
.task-check{width:20px;height:20px;border-radius:6px;border:1.5px solid var(--bdd);display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;transition:all .18s;color:white;}
.task-check.checked{background:var(--sgd);border-color:var(--sgd);}
.task-icon{font-size:16px;flex-shrink:0;}
.task-info{flex:1;}
.task-label{font-size:12px;font-weight:500;color:var(--ch);}
.task-desc{font-size:10px;color:var(--st);margin-top:1px;}
.task-cat{font-size:9px;padding:2px 7px;border-radius:20px;flex-shrink:0;letter-spacing:.5px;}
.count-input{width:52px;padding:4px 8px;border:1px solid var(--bd);border-radius:6px;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--ch);background:var(--bg);text-align:center;outline:none;}
.count-input:focus{border-color:var(--sg);}
.prog-bar-wrap{background:var(--bd2);height:7px;border-radius:4px;overflow:hidden;margin-bottom:4px;}
.prog-fill{height:100%;border-radius:4px;transition:width .6s ease;}
.day-badge{background:var(--nav);color:white;font-family:'Lora',serif;font-size:11px;font-style:italic;padding:3px 10px;border-radius:20px;}
/* Schedule / Timeline */
.period-section{border-radius:10px;overflow:hidden;margin-bottom:12px;border:1px solid var(--bd);}
.period-hd{display:flex;align-items:center;gap:8px;padding:8px 14px;font-size:10px;letter-spacing:1px;text-transform:uppercase;font-weight:500;user-select:none;}
.period-hd .ph-range{font-weight:400;opacity:.7;letter-spacing:.3px;}
.tl-row{display:flex;align-items:flex-start;gap:10px;padding:9px 14px;border-bottom:1px solid rgba(0,0,0,.04);transition:background .12s;}
.tl-row:last-child{border-bottom:none;}
.tl-row:hover:not(.tl-buf){filter:brightness(.97);}
.tl-buf{border-left:3px solid #D4A850 !important;opacity:.85;}
.tl-time{min-width:44px;font-size:10px;color:var(--md);font-weight:600;padding-top:3px;letter-spacing:.3px;flex-shrink:0;}
.tl-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:5px;}
.tl-body{flex:1;min-width:0;}
.tl-lbl{font-size:12px;color:var(--ch);line-height:1.35;}
.tl-lbl.done{text-decoration:line-through;color:var(--st);}
.tl-buf .tl-lbl{color:#7A5010;}
.tl-meta{display:flex;gap:5px;align-items:center;margin-top:3px;flex-wrap:wrap;}
.tl-tag{font-size:9px;padding:1px 7px;border-radius:20px;letter-spacing:.3px;flex-shrink:0;}
.tl-dur{font-size:10px;color:var(--md);font-weight:500;}
.tl-right{display:flex;align-items:center;gap:5px;flex-shrink:0;margin-left:6px;}
.tl-check{width:20px;height:20px;border-radius:5px;border:1.5px solid var(--bdd);display:flex;align-items:center;justify-content:center;font-size:10px;cursor:pointer;flex-shrink:0;transition:all .15s;color:white;user-select:none;}
.tl-check:hover:not(.done){border-color:var(--sg);background:var(--phbg);}
.tl-check.done{background:var(--sgd);border-color:var(--sgd);}
.tl-note-wrap{padding:8px 14px 10px 72px;border-top:1px dashed rgba(0,0,0,.07);animation:nfade .15s ease;}
@keyframes nfade{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
.tl-note-inp{width:100%;background:rgba(255,255,255,.7);border:1px solid var(--bd);border-radius:7px;padding:7px 10px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ch);outline:none;resize:none;line-height:1.6;}
.tl-note-inp:focus{border-color:var(--sg);background:white;}
.tl-note-hint{font-size:9px;color:var(--st);margin-top:4px;letter-spacing:.3px;}
.tl-has-note{width:6px;height:6px;border-radius:50%;background:var(--ea);flex-shrink:0;margin-top:6px;}
/* Toilet move buttons */
.wc-move-btns{display:flex;flex-direction:column;gap:2px;flex-shrink:0;}
.wc-move-btn{width:18px;height:16px;border:1px solid #D4A850;border-radius:3px;background:rgba(212,168,80,.1);cursor:pointer;font-size:9px;line-height:1;display:flex;align-items:center;justify-content:center;color:#B8972A;transition:all .12s;padding:0;}
.wc-move-btn:hover:not(:disabled){background:rgba(212,168,80,.3);border-color:#B8972A;}
.wc-move-btn:disabled{opacity:.2;cursor:default;}
.sched-row{display:flex;align-items:flex-start;gap:12px;padding:8px 0;border-bottom:1px dashed var(--bd2);}
.sched-row:last-child{border-bottom:none;}
.sched-time{min-width:50px;font-size:11px;color:var(--md);font-weight:500;padding-top:1px;}
.sched-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px;}
.sched-body{flex:1;}
.sched-lbl{font-size:12px;color:var(--ch);}
.sched-meta{display:flex;gap:6px;align-items:center;margin-top:2px;}
.sched-tag{font-size:9px;padding:1px 7px;border-radius:20px;letter-spacing:.5px;}
.sched-dur{font-size:10px;color:var(--md);font-weight:500;}
.sched-buf{background:#FFF8EE;border:1px dashed #D4A850;border-radius:8px;padding:7px 10px;}
.sched-buf .sched-lbl{color:#7A5010;}
/* Progress */
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:14px;}
.stat-box{background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:14px 12px;text-align:center;}
.stat-v{font-family:'Lora',serif;font-size:28px;color:var(--sgd);line-height:1;}
.stat-v.warn{color:var(--rd);}
.stat-l{font-size:9px;letter-spacing:.8px;text-transform:uppercase;color:var(--st);margin-top:4px;}
.milestone-item{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--bd2);}
.milestone-item:last-child{border-bottom:none;}
.ms-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:4px;}
.ms-dot.done{background:var(--sg);}
.ms-dot.cur{background:var(--gd);box-shadow:0 0 0 3px rgba(184,151,42,.25);}
.ms-dot.future{background:var(--bdd);}
.ms-day{font-size:10px;color:var(--sgd);font-weight:500;min-width:40px;}
.ms-label{font-size:12px;color:var(--ch);}
.ms-check{font-size:10px;color:var(--st);margin-top:2px;}
.ms-date{font-size:10px;color:var(--st);}
/* Job tracker */
.job-table{width:100%;border-collapse:collapse;font-size:11px;}
.job-table th{text-align:left;padding:6px 10px;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--st);border-bottom:1px solid var(--bd);font-weight:400;}
.job-table td{padding:9px 10px;border-bottom:1px solid var(--bd2);vertical-align:top;}
.job-table tr:last-child td{border-bottom:none;}
.job-table tr:hover td{background:var(--bg);}
.status-badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:9px;cursor:pointer;letter-spacing:.3px;}
.status-select{font-size:10px;border:1px solid var(--bd);border-radius:6px;padding:2px 6px;background:var(--bg);font-family:'IBM Plex Mono',monospace;color:var(--ch);outline:none;cursor:pointer;}
.add-job-form{background:var(--phbg);border:1px solid var(--sgl);border-radius:10px;padding:14px 16px;margin-bottom:14px;}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;}
.form-row.full{grid-template-columns:1fr;}
.fl-form label{font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--st);display:block;margin-bottom:4px;}
.fl-form input,.fl-form select{width:100%;background:var(--sf2);border:1px solid var(--bd);border-radius:7px;padding:7px 10px;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--ch);outline:none;}
.fl-form input:focus,.fl-form select:focus{border-color:var(--sg);}
.co-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;}
.co-card{background:var(--sf2);border:1px solid var(--bd);border-radius:9px;padding:11px 13px;}
.co-tier{font-size:9px;padding:2px 8px;border-radius:20px;display:inline-block;margin-bottom:5px;letter-spacing:.5px;}
.tier-A{background:#EBF3EC;color:#3D6B42;border:1px solid #9DC4A1;}
.tier-B{background:#EEF0F8;color:#354880;border:1px solid #9AA8C8;}
.tier-C{background:#F4F2EE;color:#6B6860;border:1px solid #C0BAB0;}
.co-name{font-size:12px;font-weight:500;color:var(--ch);margin-bottom:3px;}
.co-reason{font-size:10px;color:var(--st);line-height:1.5;}
.empty-state{text-align:center;padding:36px 20px;color:var(--st);}
.empty-state .eico{font-size:28px;margin-bottom:8px;}
.empty-state .etxt{font-size:12px;line-height:1.6;}
.tab-pills{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;}
.tab-pill{padding:5px 14px;border-radius:20px;font-size:11px;font-family:'IBM Plex Mono',monospace;border:1px solid var(--bd);background:transparent;color:var(--md);cursor:pointer;transition:all .15s;}
.tab-pill.active{background:var(--sgd);border-color:var(--sgd);color:white;}
.tab-pill:hover:not(.active){border-color:var(--sgl);color:var(--sgd);}
.notes-area{width:100%;background:var(--bg);border:1px solid var(--bd);border-radius:8px;padding:9px 12px;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--ch);outline:none;resize:vertical;}
.notes-area:focus{border-color:var(--sg);}
.custom-task{background:var(--bg)!important;border-style:dashed!important;border-color:var(--bdd)!important;}
.custom-task:hover{border-color:var(--st)!important;}
.custom-task.done{opacity:.5;}
.custom-checked{background:var(--ea)!important;border-color:var(--ea)!important;}
.custom-task-inp{flex:1;background:var(--bg);border:1px solid var(--bd);border-radius:8px;padding:7px 11px;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--ch);outline:none;}
.custom-task-inp:focus{border-color:var(--sg);}
.mood-row{display:flex;gap:8px;margin-bottom:14px;}
.mood-btn{flex:1;padding:8px 4px;border-radius:8px;border:1px solid var(--bd);background:var(--bg);cursor:pointer;text-align:center;font-size:18px;transition:all .15s;}
.mood-btn.sel{border:2px solid var(--sgd);background:var(--phbg);}
.mood-btn:hover:not(.sel){border-color:var(--bdd);}
::-webkit-scrollbar{width:5px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--bdd);border-radius:3px;}
.cwrap{height:200px;}
`;

// ─── APP ───────────────────────────────────────────────────────────────────
export default function LifePlanner() {
  const [tab, setTab]           = useState("checkin");
  const [checkins, setCheckins] = useState({});
  const [jobs, setJobs]         = useState([]);
  const [toast, setToast]       = useState("");
  const [schedMode, setSchedMode] = useState(isWeekendDate() ? "weekend" : "weekday");
  const [showAddJob, setShowAddJob] = useState(false);
  const [newJob, setNewJob]     = useState({ company:"", position:"", platform:"BOSS直聘", notes:"" });
  const [coTab, setCoTab]       = useState("A");
  const [progressTab, setProgressTab] = useState("overview");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInput, setCustomInput]         = useState("");
  const [expandedNote, setExpandedNote]       = useState(null);

  const todayKey = `planner:${TODAY}`;
  const todayCI  = checkins[todayKey] || { tasks:{}, jobCount:0, mood:0, notes:"" };
  const todayTasks = isWeekendDate() ? WEEKEND_TASKS : WEEKDAY_TASKS;

  // ── Storage load
  useEffect(() => {
    async function load() {
      try {
        const cks = await storage.list("planner:");
        const cd  = {};
        if (cks?.keys) for (const k of cks.keys) {
          if (!k.includes("jobs")) {
            try { const r = await storage.get(k); if(r) cd[k] = JSON.parse(r.value); } catch{}
          }
        }
        setCheckins(cd);
        try { const r = await storage.get("planner:jobs"); if(r) setJobs(JSON.parse(r.value)); } catch{}
      } catch {}
    }
    load();
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""), 2400); };

  const saveTodayCI = async (ci) => {
    const next = { ...checkins, [todayKey]: ci };
    setCheckins(next);
    await storage.set(todayKey, JSON.stringify(ci));
  };

  const toggleTask = (key) => {
    const cur = todayCI.tasks?.[key] ?? false;
    const updated = { ...todayCI, tasks: { ...todayCI.tasks, [key]: !cur } };
    saveTodayCI(updated);
    if (!cur) showToast("✓ 完成！");
  };

  const setJobCount = (v) => saveTodayCI({ ...todayCI, jobCount: Math.max(0, v) });
  const setMood     = (v) => saveTodayCI({ ...todayCI, mood: v });
  const setNotes    = (v) => saveTodayCI({ ...todayCI, notes: v });

  const addCustomTask = () => {
    const val = customInput.trim();
    if (!val) return;
    const existing = todayCI.customTasks || [];
    const newTask = { id: Date.now(), label: val, done: false };
    saveTodayCI({ ...todayCI, customTasks: [...existing, newTask] });
    setCustomInput("");
    setShowCustomInput(false);
    showToast("✓ 临时任务已添加");
  };

  const toggleCustomTask = (id) => {
    const updated = (todayCI.customTasks || []).map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    );
    const wasUndone = !(todayCI.customTasks || []).find(t => t.id === id)?.done;
    saveTodayCI({ ...todayCI, customTasks: updated });
    if (wasUndone) showToast("✓ 完成！");
  };

  const removeCustomTask = (id) => {
    saveTodayCI({ ...todayCI, customTasks: (todayCI.customTasks || []).filter(t => t.id !== id) });
  };

  // ── Toilet position helpers ──────────────────────────────────────
  const buildDayList = () => {
    const sched  = isWeekendDate() ? WE_SCHED : WD_SCHED;
    const fixed  = sched.filter(r => !r.float);
    const floats = sched.filter(r => r.float);
    const positions = todayCI.toiletPositions || {};

    const defaultPos = (fr) => sched.slice(0, sched.indexOf(fr)).filter(r => !r.float).length;

    const placed = floats.map(fr => ({
      row: fr,
      pos: positions[fr.floatKey] !== undefined ? positions[fr.floatKey] : defaultPos(fr),
    })).sort((a, b) => a.pos - b.pos || a.row.floatKey.localeCompare(b.row.floatKey));

    const result = [];
    let fi = 0;
    fixed.forEach((row, i) => {
      while (fi < placed.length && placed[fi].pos <= i) result.push(placed[fi++].row);
      result.push(row);
    });
    while (fi < placed.length) result.push(placed[fi++].row);
    return result;
  };

  const fixedBefore = (list, i) => list.slice(0, i).filter(r => !r.float).length;

  const moveToilet = (list, floatKey, dir) => {
    const idx = list.findIndex(r => r.floatKey === floatKey);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= list.length) return;
    // Swap with neighbour
    const next = [...list];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    // Recompute position = fixedBefore for each float
    const newPositions = { ...(todayCI.toiletPositions || {}) };
    next.forEach((r, i) => { if (r.float) newPositions[r.floatKey] = fixedBefore(next, i); });
    saveTodayCI({ ...todayCI, toiletPositions: newPositions });
  };

  const setTaskNote = (key, text) => {
    const notes = { ...(todayCI.taskNotes || {}), [key]: text };
    saveTodayCI({ ...todayCI, taskNotes: notes });
  };
  const getTaskNote = (key) => todayCI.taskNotes?.[key] || "";

  const saveJobs = async (jbs) => {
    setJobs(jbs);
    await storage.set("planner:jobs", JSON.stringify(jbs));
  };

  const addJob = () => {
    if (!newJob.company || !newJob.position) { showToast("请填写公司和职位"); return; }
    const j = { ...newJob, id: Date.now(), date: TODAY, status: "已投递" };
    saveJobs([j, ...jobs]);
    setNewJob({ company:"", position:"", platform:"BOSS直聘", notes:"" });
    setShowAddJob(false);
    showToast("✓ 投递记录已添加");
  };

  const updateJobStatus = (id, status) => {
    saveJobs(jobs.map(j => j.id === id ? { ...j, status } : j));
  };

  const deleteJob = (id) => {
    saveJobs(jobs.filter(j => j.id !== id));
    showToast("已删除");
  };

  // ── Stats
  const dayN        = getDayN();
  const totalDays   = TOTAL_DAYS;
  const pctDone     = Math.round((dayN / totalDays) * 100);
  const allCIs      = Object.entries(checkins).filter(([k]) => k.startsWith("planner:") && !k.includes("jobs"));
  const daysLogged  = allCIs.length;
  const totalApplied= jobs.length;
  const interviews  = jobs.filter(j => ["面试邀约","面试中","终面","已offer"].includes(j.status)).length;
  const offers      = jobs.filter(j => j.status === "已offer").length;
  const exerciseDays= allCIs.filter(([,v])=> v.tasks?.exercise || v.tasks?.morning_exercise || v.tasks?.exercise_long).length;
  const ieltsdays   = allCIs.filter(([,v])=> v.tasks?.ielts_study || v.tasks?.ielts_practice).length;

  // Task completion % today
  const doneCount   = todayTasks.filter(t => todayCI.tasks?.[t.key]).length;
  const totalCount  = todayTasks.length;
  const pctToday    = Math.round((doneCount / totalCount) * 100);

  // Weekly bar chart data (last 7 days)
  const weekData = Array.from({length:7},(_,i)=>{
    const d = new Date(TODAY + "T00:00:00");
    d.setDate(d.getDate() - (6-i));
    const ds = d.toISOString().split("T")[0];
    const k  = `planner:${ds}`;
    const ci = checkins[k];
    const tasks = isWeekendDate(ds) ? WEEKEND_TASKS : WEEKDAY_TASKS;
    const done = ci ? tasks.filter(t=>ci.tasks?.[t.key]).length : 0;
    const dayJs = jobs.filter(j=>j.date===ds).length;
    return {
      day: ["日","一","二","三","四","五","六"][d.getDay()],
      完成: done,
      投递: dayJs,
    };
  });

  // Sched tag colors
  const TAG_COLOR = {
    "找工作":{ bg:"#EBF3EC", c:"#3D6B42" },
    "雅思":  { bg:"#EEF0F8", c:"#354880" },
    "运动":  { bg:"#F5EEE6", c:"#7A4520" },
    "副业":  { bg:"#FDF3E3", c:"#7A5010" },
    "饮食":  { bg:"#F2F9F2", c:"#3D6B42" },
    "生活":  { bg:"#F4F2EE", c:"#6B6860" },
    "缓冲":  { bg:"#FFF8EE", c:"#7A5010" },
  };
  const getTagStyle = (tag) => {
    const s = TAG_COLOR[tag] || { bg:"#F4F2EE", c:"#6B6860" };
    return { background: s.bg, color: s.c };
  };
  const getDotColor = (tag) => {
    const m = { "找工作":"#6B9B72","雅思":"#6888C0","运动":"#C49B72","副业":"#D4A850","饮食":"#9DC4A1","生活":"#C0BAB0","缓冲":"#D4A850" };
    return m[tag] || "#C0BAB0";
  };

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {/* HEADER */}
        <header className="header">
          <div className="hrow">
            <div>
              <div className="logo">
                Life<em>Plan</em>
                <div className="sub">三个月冲刺规划 · 2026.03–06</div>
              </div>
            </div>
            <div className="dinf">
              <div className="dbig">{new Date().toLocaleDateString("zh-CN",{month:"short",day:"numeric"})}</div>
              <div className="dsub">{new Date().toLocaleDateString("zh-CN",{weekday:"long"})}</div>
              <div className="dday">Day {dayN} / {totalDays}</div>
            </div>
          </div>
          <nav className="nav">
            {[["checkin","✅ 今日"],["progress","📊 总进度"],["jobs","📤 求职追踪"],["companies","🏢 目标公司"],["tips","💡 执行要点"]].map(([id,lb])=>(
              <button key={id} className={`nbtn${tab===id?" active":""}`} onClick={()=>setTab(id)}>{lb}</button>
            ))}
          </nav>
        </header>

        {/* ═══ 今日（打卡 + 时间轴合并） ═══ */}
        {tab==="checkin" && (
          <div>
            <div className="seh">
              <h2 className="set">今日</h2>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span className="day-badge">Day {dayN}</span>
                <span style={{fontSize:10,color:"var(--st)"}}>{isWeekendDate()?"周末版":"工作日版"}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="card" style={{padding:"14px 18px",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
                <span style={{fontSize:11,color:"var(--md)"}}>今日完成进度</span>
                <span style={{fontSize:12,fontWeight:600,color:pctToday>=80?"var(--sgd)":pctToday>=50?"var(--gd)":"var(--md)"}}>{doneCount}/{totalCount} · {pctToday}%</span>
              </div>
              <div className="prog-bar-wrap" style={{marginBottom:0}}>
                <div className="prog-fill" style={{width:`${pctToday}%`,background:pctToday>=80?"var(--sgd)":pctToday>=50?"var(--gd)":"var(--ea)"}}/>
              </div>
            </div>

            {/* Mood */}
            <div className="card" style={{padding:"12px 18px",marginBottom:12}}>
              <div style={{fontSize:10,letterSpacing:"1px",textTransform:"uppercase",color:"var(--st)",marginBottom:8}}>今日状态</div>
              <div className="mood-row">
                {[["😩","很差"],["😕","较差"],["😐","一般"],["🙂","不错"],["😄","很好"]].map(([e,l],i)=>(
                  <button key={i} className={`mood-btn${todayCI.mood===i+1?" sel":""}`} onClick={()=>setMood(i+1)}>
                    {e}<div style={{fontSize:9,color:"var(--st)",marginTop:2}}>{l}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── TIMELINE (flat, toilet rows draggable) ── */}
            {(() => {
              const list = buildDayList();
              // Pre-compute period header visibility
              const items = list.map((row, i) => ({
                ...row,
                _i: i,
                _showHeader: i === 0 || list[i-1].period !== row.period,
              }));

              return (
                <div style={{marginBottom:12}}>
                  {items.map((row, idx) => {
                    const ps       = PERIOD_STYLE[row.period] || PERIOD_STYLE.morning;
                    const noteKey  = row.floatKey || row.taskKey || `flat__${row.t}__${idx}`;
                    const done     = (row.taskKey||row.floatKey) ? !!todayCI.tasks?.[row.floatKey||row.taskKey] : false;
                    const isCountRow = row.hasCount;
                    const isExpanded = expandedNote === noteKey;
                    const noteVal  = getTaskNote(noteKey);
                    const hasNote  = noteVal.trim().length > 0;
                    const canUp  = row.float && idx > 0;
                    const canDown = row.float && idx < list.length - 1;

                    return (
                      <div key={noteKey}>
                        {row._showHeader && (
                          <div className="period-hd" style={{background: ps.hdbg, color: ps.hdc,
                            borderRadius: idx===0?"10px 10px 0 0":"0",
                            borderTop: idx>0?"1px solid "+ps.bd:"none",
                            marginTop: idx>0?8:0}}>
                            <span>{PERIODS.find(p=>p.key===row.period)?.icon}</span>
                            <span>{PERIODS.find(p=>p.key===row.period)?.label}</span>
                            <span className="ph-range">{PERIODS.find(p=>p.key===row.period)?.range}</span>
                          </div>
                        )}

                        <div
                          className={`tl-row${row.buf?" tl-buf":""}`}
                          style={{background: row.buf?"#FFF9F0":ps.bg, borderBottom:"none",
                            cursor: row.float?"default":"pointer",
                            borderLeft: row.float?"3px solid #D4A850":"none"}}
                          onClick={()=>{ if(!row.float) setExpandedNote(isExpanded?null:noteKey); }}
                        >
                          {row.float ? (
                            <div className="wc-move-btns" onClick={e=>e.stopPropagation()}>
                              <button className="wc-move-btn" disabled={!canUp}
                                onClick={()=>moveToilet(list,row.floatKey,-1)}>▲</button>
                              <button className="wc-move-btn" disabled={!canDown}
                                onClick={()=>moveToilet(list,row.floatKey,+1)}>▼</button>
                            </div>
                          ) : (
                            <span className="tl-time">{row.t}</span>
                          )}

                          <div className="tl-dot" style={{background: getDotColor(row.tag)}}/>
                          <div className="tl-body">
                            <div className={`tl-lbl${done?" done":""}`}>{row.lbl}</div>
                            <div className="tl-meta">
                              <span className="tl-tag" style={getTagStyle(row.tag)}>{row.tag}</span>
                              {row.dur && <span className="tl-dur">{row.dur}</span>}
                              {row.float && <span style={{fontSize:9,color:"#B8972A",letterSpacing:".3px"}}>随时 · ▲▼移位</span>}
                              {hasNote && !isExpanded && !row.float && (
                                <span style={{fontSize:9,color:"var(--ea)",letterSpacing:".3px"}}>✎ 有备注</span>
                              )}
                            </div>
                          </div>

                          <div className="tl-right" onClick={e=>e.stopPropagation()}>
                            {hasNote && !row.float && <div className="tl-has-note" title="有备注"/>}
                            {row.float ? (
                              <div style={{display:"flex",alignItems:"center",gap:5}}>
                                <div className={`tl-check${done?" done":""}`}
                                  style={done?{background:"#B8972A",borderColor:"#B8972A"}:{borderColor:"#D4A850"}}
                                  title="完成打卡"
                                  onClick={()=>toggleTask(row.floatKey)}
                                >{done?"✓":""}</div>
                                <span style={{fontSize:14,color:isExpanded?"var(--sgd)":"var(--bdd)",cursor:"pointer",transition:"color .15s",lineHeight:1}}
                                  title="写备注"
                                  onClick={()=>setExpandedNote(isExpanded?null:noteKey)}
                                >✎</span>
                              </div>
                            ) : isCountRow ? (
                              <>
                                <button className="btn boutl bsm" onClick={()=>{const v=Math.max(0,(todayCI.jobCount||0)-1);setJobCount(v);}}>−</button>
                                <span style={{fontSize:13,fontWeight:600,color:"var(--sgd)",minWidth:22,textAlign:"center"}}>{todayCI.jobCount||0}</span>
                                <button className="btn bprim bsm" onClick={()=>{const v=(todayCI.jobCount||0)+1;setJobCount(v);if(!done)toggleTask(row.taskKey);}}>＋</button>
                                <span style={{fontSize:10,color:"var(--st)"}}>份</span>
                              </>
                            ) : row.taskKey ? (
                              <div className={`tl-check${done?" done":""}`}
                                onClick={()=>toggleTask(row.taskKey)}>{done?"✓":""}</div>
                            ) : (
                              <div className={`tl-check${!!todayCI.tasks?.[noteKey]?" done":""}`}
                                onClick={()=>toggleTask(noteKey)}>
                                {todayCI.tasks?.[noteKey]?"✓":""}
                              </div>
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="tl-note-wrap" style={{background: row.buf?"#FFF9F0":ps.bg}}>
                            <textarea className="tl-note-inp" rows={2} autoFocus
                              placeholder={row.float?"记录本次如厕情况、感受…":"备注完成情况、感受或备忘…"}
                              value={noteVal}
                              onChange={e=>setTaskNote(noteKey,e.target.value)}
                              onKeyDown={e=>{if(e.key==="Escape")setExpandedNote(null);}}
                              onClick={e=>e.stopPropagation()}
                            />
                            <div className="tl-note-hint">Esc 收起 · 自动保存</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* ── Custom tasks ── */}
            <div className="card" style={{marginTop:4}}>
              <div style={{fontSize:10,letterSpacing:"1px",textTransform:"uppercase",color:"var(--st)",marginBottom:10}}>📌 临时事项</div>

              {(todayCI.customTasks||[]).length > 0 && (
                <div className="task-grid" style={{marginBottom:10}}>
                  {(todayCI.customTasks||[]).map(t => (
                    <div key={t.id} className={`task-item custom-task${t.done?" done":""}`} onClick={()=>toggleCustomTask(t.id)}>
                      <div className={`task-check${t.done?" checked custom-checked":""}`}>{t.done?"✓":""}</div>
                      <span className="task-icon">📌</span>
                      <div className="task-info"><div className="task-label">{t.label}</div></div>
                      <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--bdd)",fontSize:13,padding:"2px 4px",lineHeight:1,flexShrink:0}}
                        onClick={e=>{e.stopPropagation();removeCustomTask(t.id);}}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {showCustomInput ? (
                <div style={{display:"flex",gap:7,alignItems:"center"}}>
                  <input type="text" className="custom-task-inp" placeholder="输入临时事项…" autoFocus
                    value={customInput} onChange={e=>setCustomInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addCustomTask();}if(e.key==="Escape"){setShowCustomInput(false);setCustomInput("");}}}/>
                  <button className="btn bprim bsm" style={{flexShrink:0}} onClick={addCustomTask}>添加</button>
                  <button className="btn boutl bsm" style={{flexShrink:0}} onClick={()=>{setShowCustomInput(false);setCustomInput("");}}>取消</button>
                </div>
              ) : (
                <button style={{background:"none",border:"1px dashed var(--bdd)",borderRadius:20,padding:"3px 12px",fontSize:10,color:"var(--st)",cursor:"pointer",letterSpacing:".5px",transition:"all .15s"}}
                  onClick={()=>setShowCustomInput(true)}
                  onMouseEnter={e=>{e.target.style.borderColor="var(--sgl)";e.target.style.color="var(--sgd)";}}
                  onMouseLeave={e=>{e.target.style.borderColor="var(--bdd)";e.target.style.color="var(--st)";}}>
                  ＋ 添加临时事项
                </button>
              )}
            </div>

            {/* Notes */}
            <div className="card">
              <div className="ct"><span className="ico">📝</span>今日备注</div>
              <textarea className="notes-area" rows={3}
                placeholder="面试感受、身体状况、临时安排…"
                value={todayCI.notes||""} onChange={e=>setNotes(e.target.value)}/>
            </div>

            {/* Quick stats */}
            <div className="stat-grid">
              <div className="stat-box"><div className="stat-v">{todayCI.jobCount||0}</div><div className="stat-l">今日投递</div></div>
              <div className="stat-box"><div className="stat-v">{totalApplied}</div><div className="stat-l">累计投递</div></div>
              <div className="stat-box"><div className="stat-v">{interviews}</div><div className="stat-l">面试邀约</div></div>
              <div className="stat-box"><div className="stat-v">{daysLogged}</div><div className="stat-l">已打卡天数</div></div>
            </div>
          </div>
        )}

        {/* ═══ 执行要点 ═══ */}
        {tab==="tips" && (
          <div>
            <div className="seh"><h2 className="set">执行要点</h2></div>
            <div className="card" style={{background:"linear-gradient(135deg,#EBF3EC,#F5EEE6)",border:"1px solid var(--sgl)",marginBottom:14}}>
              <div style={{fontSize:12,color:"var(--md)",lineHeight:1.8}}>
                ⏱ 每日已计入：如厕缓冲 ~60min · 手游 30min · 三餐 2.5h · 洗澡 30min
              </div>
            </div>
            <div className="card">
              <div className="ct"><span className="ico">💡</span>日常执行规则</div>
              {[
                ["找工作分三段","上午投递+跟进，下午备战面试，合计 3–3.5h，不连续以保证状态"],
                ["缓冲时间","预留约60分钟如厕缓冲，不是浪费，是SIBO管理的一部分，已内嵌时间轴"],
                ["弹性处理","面试/签证/临时事项→直接替换对应时间段，当日优先级最高"],
                ["手游底线","30分钟不超时，设闹钟结束，放在运动后作为犒劳更容易坚持"],
                ["就寝时间","22:30固定，保证7–8小时睡眠，消化系统修复期间睡眠质量很重要"],
                ["周末节奏","允许晚起至8:00，不强制雅思，侧重运动·复盘·创意，充分恢复"],
                ["临时事项","在「今日」页下方「添加临时事项」，当日完成即可勾除"],
              ].map(([t,d])=>(
                <div key={t} style={{marginBottom:10,paddingBottom:10,borderBottom:"1px dashed var(--bd2)"}}>
                  <div style={{fontSize:11,fontWeight:500,color:"var(--sgd)",marginBottom:2}}>{t}</div>
                  <div style={{fontSize:11,color:"var(--md)",lineHeight:1.65}}>{d}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{background:"var(--bg)"}}>
              <div className="ct"><span className="ico">🎨</span>时间轴图例</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[
                  {bg:"#FFF8EF",bd:"#F0DCC8",lbl:"🌤️ 上午段（07:00–12:00）"},
                  {bg:"#F2FAF2",bd:"#C2E2C5",lbl:"☀️ 下午段（12:00–18:00）"},
                  {bg:"#F2F4FB",bd:"#C4CCE8",lbl:"🌙 夜间段（18:00–22:30）"},
                  {bg:"#FFF9F0",bd:"#D4A850",lbl:"🚽 缓冲段（如厕/午休，虚线左边框）",dashed:true},
                ].map(p=>(
                  <div key={p.lbl} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 12px",borderRadius:8,background:p.bg,border:`1px ${p.dashed?"dashed":"solid"} ${p.bd}`}}>
                    <span style={{fontSize:11,color:"var(--md)"}}>{p.lbl}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ 总进度 ═══ */}
        {tab==="progress" && (
          <div>
            <div className="seh"><h2 className="set">三个月总进度</h2></div>

            <div className="stat-grid">
              <div className="stat-box">
                <div className="stat-v" style={{fontSize:22}}>Day {dayN}</div>
                <div style={{fontSize:9,color:"var(--sgd)",marginBottom:4}}>{pctDone}%</div>
                <div className="stat-l">总进度</div>
              </div>
              <div className="stat-box"><div className="stat-v">{totalApplied}</div><div className="stat-l">累计投递</div></div>
              <div className="stat-box"><div className={`stat-v${interviews===0?" warn":""}`}>{interviews}</div><div className="stat-l">面试邀约</div></div>
              <div className="stat-box"><div className={`stat-v${offers>0?"":""}`} style={{color:offers>0?"var(--sgd)":"var(--ch)"}}>{offers}</div><div className="stat-l">Offer数</div></div>
              <div className="stat-box"><div className="stat-v">{exerciseDays}</div><div className="stat-l">运动天数</div></div>
              <div className="stat-box"><div className="stat-v">{ieltsdays}</div><div className="stat-l">雅思学习天</div></div>
              <div className="stat-box"><div className="stat-v">{daysLogged}</div><div className="stat-l">打卡天数</div></div>
            </div>

            {/* Overall progress bar */}
            <div className="card">
              <div className="ct"><span className="ico">🗓️</span>三个月进度</div>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                <div className="prog-bar-wrap" style={{flex:1}}>
                  <div className="prog-fill" style={{width:`${pctDone}%`,background:"var(--sgd)"}}/>
                </div>
                <span style={{fontSize:11,color:"var(--sgd)",minWidth:50}}>{dayN}/{totalDays}天</span>
              </div>
              <div style={{display:"flex",gap:10,fontSize:10,color:"var(--st)"}}>
                <span style={{color:"var(--sgd)"}}>开始 3月4日</span>
                <span style={{flex:1,textAlign:"center",color:"var(--gd)"}}>·</span>
                <span>目标 6月4日</span>
              </div>
            </div>

            {/* Weekly chart */}
            {daysLogged > 0 && (
              <div className="card">
                <div className="ct"><span className="ico">📈</span>近7日完成情况</div>
                <div className="cwrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekData} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#DDD7CC"/>
                      <XAxis dataKey="day" tick={{fontSize:10,fill:"#A8A49C"}}/>
                      <YAxis tick={{fontSize:9,fill:"#A8A49C"}}/>
                      <Tooltip contentStyle={{fontFamily:"IBM Plex Mono,monospace",fontSize:11,background:"#F8F4EE",border:"1px solid #DDD7CC"}}/>
                      <Bar dataKey="完成" fill="#9DC4A1" name="打卡完成" radius={[3,3,0,0]}/>
                      <Bar dataKey="投递" fill="#C49B72" name="简历投递" radius={[3,3,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Milestones */}
            <div className="card">
              <div className="ct"><span className="ico">🎯</span>里程碑</div>
              {MILESTONES.map((m,i) => {
                const passed = TODAY > m.date;
                const isCur  = !passed && getDayN() <= m.day && (i===0 || TODAY > MILESTONES[i-1].date);
                return (
                  <div key={i} className="milestone-item">
                    <div className={`ms-dot ${passed?"done":isCur?"cur":"future"}`}/>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                        <span className="ms-day">Day {m.day}</span>
                        <span className="ms-label" style={{color:passed?"var(--st)":isCur?"var(--ch)":"var(--md)"}}>{m.label}</span>
                        {passed && <span style={{fontSize:9,color:"var(--sg)"}}>✓ 已过</span>}
                        {isCur && <span style={{fontSize:9,background:"var(--gd)",color:"white",padding:"1px 6px",borderRadius:10}}>当前</span>}
                      </div>
                      <div className="ms-check">{m.check} · {fmtDate(m.date)}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Job conversion funnel */}
            {totalApplied > 0 && (
              <div className="card">
                <div className="ct"><span className="ico">🔽</span>求职转化漏斗</div>
                {[
                  ["简历投递",totalApplied,1],
                  ["获得回复",jobs.filter(j=>j.status!=="已投递").length,totalApplied],
                  ["面试邀约",interviews,totalApplied],
                  ["终面",jobs.filter(j=>["终面","已offer"].includes(j.status)).length,totalApplied],
                  ["获得Offer",offers,totalApplied],
                ].map(([l,v,base])=>(
                  <div key={l} style={{marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:11,color:"var(--md)"}}>{l}</span>
                      <span style={{fontSize:11,color:"var(--ch)",fontWeight:500}}>{v}
                        {base>0&&base!==v&&<span style={{fontSize:9,color:"var(--st)",marginLeft:4}}>{Math.round(v/base*100)}%</span>}
                      </span>
                    </div>
                    <div className="prog-bar-wrap">
                      <div className="prog-fill" style={{width:`${base?Math.round(v/base*100):0}%`,background:"var(--sg)"}}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ 求职追踪 ═══ */}
        {tab==="jobs" && (
          <div>
            <div className="seh">
              <h2 className="set">求职追踪</h2>
              <button className="btn bprim" onClick={()=>setShowAddJob(p=>!p)}>
                {showAddJob ? "✕ 取消" : "＋ 添加投递"}
              </button>
            </div>

            {showAddJob && (
              <div className="add-job-form">
                <div style={{fontSize:12,fontWeight:500,color:"var(--sgd)",marginBottom:12}}>新增投递记录</div>
                <div className="form-row">
                  <div className="fl-form">
                    <label>公司名称 *</label>
                    <input type="text" placeholder="如：快手" value={newJob.company} onChange={e=>setNewJob(p=>({...p,company:e.target.value}))}/>
                  </div>
                  <div className="fl-form">
                    <label>投递岗位 *</label>
                    <input type="text" placeholder="如：产品运营" value={newJob.position} onChange={e=>setNewJob(p=>({...p,position:e.target.value}))}/>
                  </div>
                </div>
                <div className="form-row">
                  <div className="fl-form">
                    <label>投递平台</label>
                    <select value={newJob.platform} onChange={e=>setNewJob(p=>({...p,platform:e.target.value}))}>
                      {PLATFORMS.map(pl=><option key={pl}>{pl}</option>)}
                    </select>
                  </div>
                  <div className="fl-form">
                    <label>备注</label>
                    <input type="text" placeholder="如：内推/JD链接" value={newJob.notes} onChange={e=>setNewJob(p=>({...p,notes:e.target.value}))}/>
                  </div>
                </div>
                <button className="btn bprim" onClick={addJob}>确认添加</button>
              </div>
            )}

            {/* Stats row */}
            <div className="stat-grid" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
              {[
                ["总投递",totalApplied],
                ["面试",interviews],
                ["Offer",offers],
                ["成功率",totalApplied?`${Math.round(interviews/totalApplied*100)}%`:"—"],
              ].map(([l,v])=>(
                <div key={l} className="stat-box"><div className="stat-v" style={{fontSize:22}}>{v}</div><div className="stat-l">{l}</div></div>
              ))}
            </div>

            {jobs.length === 0 ? (
              <div className="card"><div className="empty-state"><div className="eico">📤</div><div className="etxt">还没有投递记录<br/>点右上角「＋ 添加投递」开始记录</div></div></div>
            ) : (
              <div className="card" style={{overflowX:"auto"}}>
                <table className="job-table">
                  <thead>
                    <tr>
                      <th>公司</th><th>岗位</th><th>平台</th><th>日期</th><th>状态</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(j=>(
                      <tr key={j.id}>
                        <td style={{fontWeight:500,color:"var(--ch)"}}>{j.company}</td>
                        <td style={{color:"var(--md)"}}>{j.position}</td>
                        <td style={{color:"var(--st)",fontSize:10}}>{j.platform}</td>
                        <td style={{color:"var(--st)",fontSize:10,whiteSpace:"nowrap"}}>{j.date?.slice(5)}</td>
                        <td>
                          <select className="status-select"
                            value={j.status}
                            style={{color: STATUS_COLOR[j.status]||"#6B6860"}}
                            onChange={e=>updateJobStatus(j.id,e.target.value)}
                          >
                            {JOB_STATUSES.map(s=><option key={s}>{s}</option>)}
                          </select>
                        </td>
                        <td>
                          <button className="btn boutl bsm" onClick={()=>deleteJob(j.id)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Advice card */}
            <div className="card" style={{background:"var(--bg)"}}>
              <div className="ct"><span className="ico">💡</span>投递策略提示</div>
              {[
                ["谈薪技巧","先收offer再谈，被问期望薪资说「20k左右，综合考虑package」，永远不第一个报数"],
                ["背调准备","字节1年+百度半年→gap 1年，话术：「在探索自由职业和个人项目，已完成求职辅导、备考雅思」"],
                ["简历关键词","内容安全/UGC/用户产品/创作者运营/产品运营/需求跟进——对应JD里的关键词"],
                ["BOSS主动出击","看了你简历不打招呼的HR，可以主动发「您好，我对贵司XX岗位很感兴趣，已投递」"],
                ["Gap期资产","求职辅导（实战经验）+ 雅思7分（英语能力）+ SIBO调理（自律）都可以讲成故事"],
              ].map(([t,d])=>(
                <div key={t} style={{marginBottom:10,paddingBottom:10,borderBottom:"1px dashed var(--bd2)"}}>
                  <div style={{fontSize:11,fontWeight:500,color:"var(--sgd)",marginBottom:2}}>{t}</div>
                  <div style={{fontSize:11,color:"var(--md)",lineHeight:1.6}}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ 目标公司 ═══ */}
        {tab==="companies" && (
          <div>
            <div className="seh"><h2 className="set">目标公司清单</h2></div>

            <div className="card" style={{background:"linear-gradient(135deg,#EBF3EC,#F5EEE6)",border:"1px solid var(--sgl)",marginBottom:14}}>
              <div style={{fontSize:12,color:"var(--md)",lineHeight:1.8}}>
                <strong style={{color:"var(--sgd)"}}>你的核心竞争力：</strong>字节3年（海外内容安全产品运营→抖音举报人审产品运营）+ 百度数字人直播脚本产品运营。
                目标岗位：<strong>产品运营 / 创作者运营 / 内容安全运营 / 平台生态运营</strong>，薪资区间 18–25k。
              </div>
            </div>

            <div className="tab-pills">
              {["A","B","C"].map(t=>(
                <button key={t} className={`tab-pill${coTab===t?" active":""}`} onClick={()=>setCoTab(t)}>
                  {t==="A"?"🎯 优先冲刺":t==="B"?"📌 重点关注":"📎 备选"}
                </button>
              ))}
            </div>

            <div className="co-grid">
              {TARGET_COS.filter(c=>c.tier===coTab).map(c=>(
                <div key={c.name} className="co-card">
                  <span className={`co-tier tier-${c.tier}`}>{c.tier==="A"?"优先冲刺":c.tier==="B"?"重点关注":"备选"}</span>
                  <div className="co-name">{c.name}</div>
                  <div className="co-reason">{c.reason}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{marginTop:14}}>
              <div className="ct"><span className="ico">📋</span>投递节奏建议</div>
              {[
                ["第1–2周（3月4–15日）","先投A级公司，BOSS直聘+猎聘主战场，领英同步激活，目标累计≥40份"],
                ["第3–4周（3月16–31日）","B级公司全面铺开，同步跟进A级回复，目标累计≥100份"],
                ["第5–8周（4月）","进入终面阶段，精力向面试倾斜，降低新投递量，重点准备有意向的"],
                ["字节回流","2026年2月离职，1年冷静期2027年2月到期。但现在可通过内推绕过规则，联系前同事问能否内推"],
                ["天津方向","天津也有快手·字节·京东等研发中心，薪资略低但生活成本小，可作为备选选项"],
              ].map(([t,d])=>(
                <div key={t} style={{marginBottom:10,paddingBottom:10,borderBottom:"1px dashed var(--bd2)"}}>
                  <div style={{fontSize:11,fontWeight:500,color:"var(--sgd)",marginBottom:2}}>{t}</div>
                  <div style={{fontSize:11,color:"var(--md)",lineHeight:1.6}}>{d}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{background:"var(--bg)"}}>
              <div className="ct"><span className="ico">✨</span>简历话术参考 · Gap 处理</div>
              <div style={{background:"var(--sf)",border:"1px solid var(--sgl)",borderRadius:8,padding:"12px 14px",fontSize:11,lineHeight:1.9,color:"var(--ch)"}}>
                <strong style={{color:"var(--sgd)"}}>离职原因（百度）：</strong>"入职时沟通的工作内容与实际分工差异较大，试用期主动选择离开，认为对彼此都负责。"
                <br/><br/>
                <strong style={{color:"var(--sgd)"}}>Gap期内容：</strong>"这段时间我做了两件事：一是做求职辅导的自由职业，帮助了X位求职者成功拿到offer，深化了对招聘市场的理解；二是系统备考雅思，目标7分，为后续的国际化机会做准备。"
                <br/><br/>
                <strong style={{color:"var(--sgd)"}}>薪资目标：</strong>"我期望在20k左右，当然也会综合考虑平台、成长空间和团队氛围，不会只看数字。"
              </div>
            </div>
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
