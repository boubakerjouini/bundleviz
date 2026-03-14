export interface Alternative {
  name: string
  gzip: number
  description: string
}

export const alternatives: Record<string, Alternative[]> = {
  moment: [
    { name: "date-fns", gzip: 13000, description: "Modular, tree-shakeable" },
    { name: "dayjs", gzip: 2600, description: "Moment-compatible API, 2kb" },
  ],
  lodash: [{ name: "radash", gzip: 4000, description: "Modern functional utils" }],
  "lodash-es": [{ name: "radash", gzip: 4000, description: "Modern functional utils" }],
  axios: [{ name: "ky", gzip: 4000, description: "Fetch-based, smaller" }],
  uuid: [{ name: "nanoid", gzip: 1000, description: "Smaller, URL-safe" }],
  classnames: [{ name: "clsx", gzip: 300, description: "Same API, 0.3kb" }],
  "react-router": [{ name: "next/navigation", gzip: 0, description: "Built into Next.js" }],
  "react-router-dom": [{ name: "next/navigation", gzip: 0, description: "Built into Next.js" }],
  "styled-components": [{ name: "tailwindcss", gzip: 0, description: "Zero runtime CSS" }],
  "@emotion/react": [{ name: "tailwindcss", gzip: 0, description: "Zero runtime CSS" }],
  "@emotion/styled": [{ name: "tailwindcss", gzip: 0, description: "Zero runtime CSS" }],
  "query-string": [{ name: "URLSearchParams", gzip: 0, description: "Native browser API" }],
  "left-pad": [{ name: "String.padStart()", gzip: 0, description: "Native JS" }],
  "is-array": [{ name: "Array.isArray()", gzip: 0, description: "Native JS" }],
  jquery: [{ name: "vanilla JS", gzip: 0, description: "You Might Not Need jQuery" }],
  underscore: [{ name: "radash", gzip: 4000, description: "Modern functional utils" }],
  "request": [{ name: "fetch()", gzip: 0, description: "Native browser API" }],
  "node-fetch": [{ name: "fetch()", gzip: 0, description: "Native in Node 18+" }],
  bluebird: [{ name: "native Promise", gzip: 0, description: "Native JS" }],
  chalk: [{ name: "picocolors", gzip: 400, description: "3x smaller terminal colors" }],
}
