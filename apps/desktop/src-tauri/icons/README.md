Run after installing dependencies (or when the app icon artwork changes):

```bash
cd apps/desktop
pnpm tauri icon public/app-icon-source.png
Copy-Item src-tauri/icons/128x128.png public/favicon.png -Force
```

Source artwork: `public/app-icon-source.png` (1024×1024, cropped chestnut on cream background).
In-app toolbar keeps the **Chestnut** text brand; this icon is for window/taskbar/installer only.
