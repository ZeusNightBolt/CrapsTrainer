import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Set base to "/<repo-name>/" if deploying to GitHub Pages under a project path.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
