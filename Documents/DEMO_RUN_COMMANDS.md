# Demo Flow — Quick Commands

## Setup (First Time)
```bash
cd automate_test
npm install
npm run install:browsers
```

## Run Tests

### All 8 acts with video
```bash
npm test demo-flow
```

### Specific act only
```bash
npm test -- --grep "ACT 1"
npm test -- --grep "ACT 2"
# ... etc
```

### Live browser (for narration)
```bash
npm run test:headed -- demo-flow
```

### With CDP screencast (JPEG frames)
```bash
ENABLE_CDP_SCREENCAST=1 npm test demo-flow
```

## Video Output

### Find videos
```bash
# Playwright WebM videos
open recordings/test-output

# Or CDP JPEG frames
open recordings/cdp-screencast
```

### Convert JPEG to MP4
```bash
cd recordings/cdp-screencast/ACT_1_*
ffmpeg -y -framerate 12 -pattern_type glob -i 'frame-*.jpg' \
  -c:v libx264 -pix_fmt yuv420p screencast.mp4
```

### Convert WebM to MP4
```bash
ffmpeg -i input.webm -c:v libx264 -crf 23 output.mp4
```

### Combine all acts
```bash
# Create filelist.txt with:
file '/path/to/ACT_1.webm'
file '/path/to/ACT_2.webm'
# ... all 8 files

ffmpeg -f concat -safe 0 -i filelist.txt -c copy demo_final.mp4
```

## Test Report
```bash
npm test demo-flow
# Then open:
open recordings/playwright-report
```

## Debugging
```bash
# Interactive debug mode
npx playwright test demo-flow --debug

# Specific test only
npx playwright test demo-flow --grep "ACT 3" --debug
```

## Environment
```bash
# No videos
PW_VIDEO=off npm test demo-flow

# Custom API URL
BASE_URL=http://localhost:3000 npm test demo-flow

# Longer timeout (seconds)
npm test -- --timeout=120000 demo-flow
```

## Settings in Test

Edit `automate_test/tests/demo-flow.spec.ts`:
- **Pause timing**: `page.waitForTimeout(3000)` = 3 seconds
- **Test accounts**: MOCK_SUPER_ADMIN, MOCK_HR_ADMIN, etc.
- **Mock data**: `buildOrgSeed()` function

## Key Accounts
- **Super Admin**: somchai@alphacorp.com / password123
- **HR Admin**: malee@alphacorp.com / password123
- **Finance**: wichai@alphacorp.com / password123
- **PM Manager**: napat@alphacorp.com / password123
- **Employee**: pim@alphacorp.com / password123

---

**Video timing**: ~16 minutes total (2 min per act, 3 min for Finance)  
**Resolution**: 1280×720 (or 1920×1080 with config change)  
**Format**: WebM (Playwright) or MP4 (after ffmpeg conversion)
