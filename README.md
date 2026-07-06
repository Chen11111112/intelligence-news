npm install @google/genai

# 首次：安裝 Python 依賴
npm run crawl:setup

# 從 The Conversation (US) 更新新聞（依 Profile 標籤或 data/crawl-config.json）
npm run crawl

# 啟動開發伺服器
npm run dev

npm install mongodb @auth/mongodb-adapter
npm install @auth/mongodb-adapter mongodb@^6.13.0

No explanation, code only.


SSR 要求：Server HTML + Client 初次 render 必須完全一致 否則會觸發 Hydration Error
比如說 Server端沒有Localstorage 但Client端有，就會觸發。
再比如說Browser的extension會改變body，可以在body標籤寫suppressHydrationWarninge

Server action只能回傳純字串JSON給前端

