# AgriTech Remotion Project

This is the Remotion project for creating the AgriTech promotional video.

## Project Structure

```
agritech-remotion/
├── src/
│   ├── Root.tsx                    # Entry point with compositions
│   ├── index.ts                    # Remotion registration
│   ├── compositions/
│   │   ├── PromotionalVideo.tsx    # Main video composition
│   │   ├── scenes/                 # Individual video scenes
│   │   │   ├── IntroScene.tsx
│   │   │   ├── HeroScene.tsx
│   │   │   ├── ParcelManagementScene.tsx
│   │   │   ├── TaskPlanningScene.tsx
│   │   │   ├── AccountingScene.tsx
│   │   │   ├── SatelliteScene.tsx
│   │   │   ├── MultiOrgScene.tsx
│   │   │   └── OutroScene.tsx
│   │   └── components/
│   │       └── AnimatedNumber.tsx
│   ├── assets/
│   │   ├── audio/                  # Background music
│   │   └── images/                 # Static images
│   └── data/
│       └── mock-data.ts            # Mock data for video
├── public/
│   └── fonts/                      # Custom fonts
├── out/                            # Rendered video output
├── remotion.config.ts              # Remotion configuration
├── tsconfig.json                   # TypeScript configuration
└── package.json                    # Dependencies and scripts
```

## Video Specifications

- **Resolution**: 1920x1080 (Full HD)
- **Frame Rate**: 24 fps
- **Duration**: 75 seconds (1800 frames)
- **Codec**: H.264
- **Target File Size**: <15 MB

## Development

### Start Remotion Studio

```bash
# From monorepo root
pnpm dev:video

# Or directly in the remotion project
cd agritech-remotion
pnpm dev
```

This will open the Remotion Studio at `http://localhost:3000` where you can:
- Preview all scenes
- Edit compositions in real-time
- Test animations and timing

### Build Video

```bash
# From monorepo root
pnpm build:video

# Or directly in the remotion project
cd agritech-remotion
pnpm build
```

This will:
1. Render the video to `agritech-remotion/out/promotional-video.mp4`
2. Copy it to `project/public/assets/agritech-promo.mp4` for use in the landing page

## Video Timeline

| Scene | Time | Frames | Description |
|-------|------|--------|-------------|
| Intro | 0:00-0:05 | 0-120 | Logo + Tagline |
| Hero | 0:05-0:15 | 120-360 | Main CTA |
| Parcel Management | 0:15-0:25 | 360-600 | Map visualization |
| Task Planning | 0:25-0:35 | 600-840 | Team assignments |
| Accounting | 0:35-0:45 | 840-1080 | Invoices + revenue |
| Satellite Analytics | 0:45-0:55 | 1080-1320 | NDVI heat map |
| Multi-org/Security | 0:55-0:65 | 1320-1560 | Org switcher |
| Outro | 0:65-0:75 | 1560-1800 | CTA + Pricing |

## Customization

### Modify Scene Duration

Edit `src/Root.tsx` to adjust composition duration:

```typescript
<Composition
  id="PromotionalVideo"
  component={PromotionalVideo}
  durationInFrames={1800}  // Change this
  fps={24}
  width={1920}
  height={1080}
/>
```

### Modify Scene Content

Each scene is located in `src/compositions/scenes/`. Edit the corresponding `.tsx` file to modify:
- Text content
- Animations
- Colors
- Layout

### Add Background Music

1. Place your audio file in `src/assets/audio/background-music.mp3`
2. Import and use it in `PromotionalVideo.tsx`:

```typescript
import { Audio } from "remotion";
import backgroundMusic from "../assets/audio/background-music.mp3";

// In your component:
<Audio src={backgroundMusic} />
```

## Integration with Landing Page

After building the video, it's automatically copied to the main project's public folder and referenced in `LandingPage.tsx`:

```tsx
<video
  autoPlay
  muted
  loop
  playsInline
  className="w-full h-full object-cover"
  poster="/assets/video-poster.jpg"
>
  <source src="/assets/agritech-promo.mp4" type="video/mp4" />
</video>
```

## Additional Resources

- [Remotion Documentation](https://www.remotion.dev/docs)
- [Remotion Gallery](https://www.remotion.dev/gallery)
- [Remotion CLI](https://www.remotion.dev/docs/cli)
