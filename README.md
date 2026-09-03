# Mini Game Land

ブラウザで遊べるミニゲーム集です。Cloudflare Workers と D1 を使い、プレイヤー共通のランキングを提供します。

## 開発

```sh
pnpm install
pnpm dev
```

## 公開

```sh
pnpm deploy:check
pnpm deploy
```

Cloudflare D1 のバインディング名は `DB`、静的ファイルのバインディング名は `ASSETS` です。
