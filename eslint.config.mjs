import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

// Extend default brands from the plugin with project-specific brands
const defaultBrands = [
  "iOS", "iPadOS", "macOS", "Windows", "Android", "Linux",
  "Obsidian", "Obsidian Sync", "Obsidian Publish",
  "Google", "Gemini", "Vertex AI", "OpenAI", "GPT", "Anthropic", "Claude", "Microsoft",
  "Google Drive", "Dropbox", "OneDrive", "iCloud Drive",
  "YouTube", "Slack", "Discord", "Telegram", "WhatsApp", "Twitter", "X",
  "Readwise", "Zotero", "Excalidraw", "Mermaid",
  "Markdown", "LaTeX", "JavaScript", "TypeScript", "Node.js",
  "npm", "pnpm", "Yarn", "Git", "GitHub", "GitLab",
  "Notion", "Evernote", "Roam Research", "Logseq", "Anki", "Reddit",
  "VS Code", "Visual Studio Code", "IntelliJ IDEA", "WebStorm", "PyCharm",
  "React", "Svelte",
];

const projectBrands = ["AssemblyAI", "Deepgram", "Steno"];

export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
    },
    rules: {
      "obsidianmd/ui/sentence-case": [
        "error",
        {
          brands: [...defaultBrands, ...projectBrands],
        },
      ],
    },
  },
]);
