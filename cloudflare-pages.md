# Cloudflare Pages frontend deployment

Connect GitHub repository `Tharnithan/it-unit-workspace`.

```text
Root directory: frontend
Build command: npm run build
Build output directory: dist
```

Set `VITE_API_URL` to your Render backend URL. After the first deployment, add the exact HTTPS Pages URL (without a trailing slash) to Render's `CORS_ORIGINS` variable.
