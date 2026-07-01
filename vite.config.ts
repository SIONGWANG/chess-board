import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const chessDataPath = path.resolve(__dirname, './chess_data');

export default defineConfig({
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    traeBadgePlugin({
      variant: 'dark',
      position: 'bottom-right',
      prodOnly: true,
      clickable: true,
      clickUrl: 'https://www.trae.ai/solo?showJoin=1',
      autoTheme: true,
      autoThemeTarget: '#root'
    }), 
    tsconfigPaths(),
    {
      name: 'copy-chess-data',
      writeBundle: async (options) => {
        const outDir = options.dir || 'dist';
        const destPath = path.resolve(outDir, 'chess_data');
        
        if (fs.existsSync(chessDataPath) && !fs.existsSync(destPath)) {
          try {
            fs.cpSync(chessDataPath, destPath, { recursive: true });
            console.log(`Copied chess_data to ${destPath}`);
          } catch (err) {
            console.warn(`Failed to copy chess_data: ${err}`);
          }
        }
      },
    },
  ],
  server: {
    fs: {
      allow: [__dirname, chessDataPath],
    },
  },
})
