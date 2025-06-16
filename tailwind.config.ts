import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ここでfontFamilyを拡張する
      fontFamily: {
        // 'sans' に先ほど定義したCSS変数を設定
        sans: ["var(--font-noto-sans-jp)", "sans-serif"], // フォールバックを指定するとより安全
      },
    },
  },
  plugins: [],
};
export default config;
