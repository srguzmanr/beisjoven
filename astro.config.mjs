import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://beisjoven.com',
  output: 'static',
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
  redirects: {
    '/post/[...slug]': '/articulo/[...slug]',
    '/noticias/[...slug]': '/articulo/[...slug]',
    '/beisjoven/[...slug]': '/articulo/[...slug]',
  },
});
