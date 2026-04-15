/*  kes-config.js  —  API Keys 配置文件
 *  ⚠️  请填入你的真实 API keys
 *  
 *  Supabase: Dashboard → Settings → API → Project API keys → anon public
 *  Stripe:   Dashboard → Developers → API keys → Publishable key
 */

var KES_CONFIG = {
  // Supabase
  SUPABASE_URL: 'https://dftwrhgtcplcuywvtkcd.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmdHdyaGd0Y3BsY3V5d3Z0a2NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4Nzk0NjcsImV4cCI6MjA5MTQ1NTQ2N30.WeuZi0TxdlHU7Z-LllUEniWxvEIQmjrj5nw2nfK3EO8',

  // Stripe
  STRIPE_PUBLISHABLE_KEY: 'pk_live_51TL0bI5tISGwngzcgh9EWYF7cFlJdUatfbAvCDQ4HnuLVBJgaSKYdERtxFLuve0fjLcewdgBlQdO3CM7YKcEL3ME00qsZ1iDd3',
  STRIPE_PRICING_TABLE_ID: 'prctbl_1TL0nU5tISGwngzcss0E2RA1',
  STRIPE_PRICE_ID: '',

  // Stripe Payment Link — 在Stripe Dashboard创建
  // Dashboard → Products → Payment Links → Create → 设置Success URL为:
  //   https://keyofelements.com/index.html?payment=success (中文)
  //   https://keyofelements.com/en.html?payment=success (英文)
  // 然后把链接粘贴到这里
  STRIPE_PAYMENT_LINK: 'https://buy.stripe.com/9B6dR27778ye0NZfxm5c400',

  // 报告价格（仅展示用 — 实际付款金额在 Stripe Payment Link 里）
  // 全站统一 USD，中英文版都展示 $9.99
  REPORT_PRICE: '$9.99',
  REPORT_PRICE_EN: '$9.99',

  // 邀请码
  VALID_CODES: ['KESVIP'],

  // Terms & Privacy 版本号 — 每次更新条款时 bump，会触发已登录用户重新同意
  CURRENT_TERMS_VERSION: 'tos-2026-04'
};
