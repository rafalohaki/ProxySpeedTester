# Proxy Speed Tester (Bun)

## Wymagania
- [Bun](https://bun.sh) 1.x

## Instalacja
```bash
bun install
```

## Development
```bash
bun run dev      # Vite HMR + Bun backend
```

## Build produkcyjny
```bash
bun run build    # buduje klienta (Bun.build + PostCSS/Tailwind) oraz serwer
```

## Uruchomienie produkcyjne
```bash
bun run start    # uruchamia dist/index.mjs (Bun.serve)
```

## Testy
```bash
bun test         # Bun test runner
```

## Typy / lint
```bash
bun run check    # tsc --noEmit
```
