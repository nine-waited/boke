Source artwork for **OS icons** (window / taskbar / exe / installer): `public/chestnut-transparent.png`.

To refresh after changing that file:

```bash
cd apps/desktop
pnpm logo:os
```

(`logo:os` pads the cutout to a square `chestnut-os-icon.png`, then runs `tauri icon`.)

For re-processing from a cream-background photo first, use `pnpm logo:process`. In-app toolbar keeps the **Chestnut** text brand; do not use these files for in-app UI.
