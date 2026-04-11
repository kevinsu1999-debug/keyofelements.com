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
  STRIPE_PRICE_ID: '',  // not needed with pricing table

  // 报告价格（仅展示用）
  REPORT_PRICE: '¥29.9',
  REPORT_PRICE_EN: '$4.99',

  // 邀请码
  VALID_CODES: ['KESVIP']
};
