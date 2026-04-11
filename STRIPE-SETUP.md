# KES 商品 Stripe 设置指南

## 架构总览

```
用户浏览商品 → 加入购物袋 → 结算
                                ↓
                    /api/create-checkout (Vercel serverless)
                                ↓
                    Stripe Checkout 支付页面
                                ↓
                    支付成功 → 跳回网站
                                ↓
                    /api/stripe-webhook (记录订单)
```

## 第一步：Vercel 环境变量

进入 Vercel Dashboard → 你的项目 → Settings → Environment Variables，添加：

| Key | Value | 说明 |
|-----|-------|------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe → Developers → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | 第四步创建 webhook 后获得 |

⚠️ Secret key 绝对不能放在前端代码里！

## 第二步：在 Stripe 创建产品

进入 Stripe Dashboard → Products → Add Product

每个产品填写：
- **Name**: 英文名（如 "Navy Blue A-Line Dress"）
- **Description**: 英文描述
- **Price**: 设置价格和货币
- **Images**: 上传产品图片

### 关键：设置 Metadata

在每个产品的 **Metadata** 区域添加以下字段：

| Key | Value | 说明 |
|-----|-------|------|
| `name_zh` | `藏蓝简约连衣裙` | 中文名 |
| `element` | `水` | 五行属性 |
| `element_class` | `shui` | CSS class (jin/mu/shui/huo/tu) |
| `element_desc` | `藏蓝色属水元素，有助于...` | 五行说明 |
| `category` | `clothing` | 分类 (clothing/accessory/service) |
| `sizes` | `XS,S,M,L,XL` | 可选尺码，逗号分隔 |
| `sort_order` | `1` | 排序（数字越小越靠前） |

## 第三步：推送代码到 Vercel

```powershell
cd C:\Users\kevin\Desktop\keyofelements.com
git add api/ package.json kes-shop.js
git commit -m "添加Stripe商品API和购物车"
git push
```

推送后 Vercel 会自动安装 stripe 依赖并部署 serverless functions。

## 第四步：设置 Stripe Webhook

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://keyofelements.com/api/stripe-webhook`
3. Events: 选择 `checkout.session.completed`
4. 点击创建，复制 webhook signing secret (`whsec_...`)
5. 把这个 secret 填入 Vercel 环境变量的 `STRIPE_WEBHOOK_SECRET`

## 第五步：测试

1. 在 Stripe 创建一个测试产品
2. 访问 `https://keyofelements.com/api/products` 确认能看到产品列表
3. 尝试添加商品到购物袋并结算

## 产品管理

以后添加新产品：只需在 Stripe 后台添加，网站自动显示。
修改价格/描述：在 Stripe 后台改，网站自动更新。
下架产品：在 Stripe 把产品设为 inactive。

## 文件说明

| 文件 | 作用 |
|------|------|
| `api/create-checkout.js` | 服务端：创建 Stripe Checkout Session |
| `api/stripe-webhook.js` | 服务端：处理支付成功回调 |
| `api/products.js` | 服务端：从 Stripe 拉取产品列表 |
| `kes-shop.js` | 客户端：购物车 + 结算逻辑 |
| `kes-config.js` | 客户端：API keys 配置 |
| `package.json` | Vercel serverless 依赖 |
