# ifc-loader

Projeto React + TypeScript + Vite + Tailwind CSS + ESLint.

## Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) (bundler / dev server)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [ESLint v10](https://eslint.org/) com `typescript-eslint`, `react-hooks` e `react-refresh`

## Scripts

```bash
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção (tsc -b && vite build)
npm run preview  # serve o build localmente
npm run lint     # roda o ESLint em todo o projeto
```

## Estrutura

```
ifc-loader/
├── eslint.config.js   # configuração do ESLint (flat config)
├── index.html
├── package.json
├── src/
│   ├── App.tsx
│   ├── index.css      # importa o Tailwind
│   └── main.tsx
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```
