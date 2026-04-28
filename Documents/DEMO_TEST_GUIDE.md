# ERP Demo Flow — Playwright Test Guide

## Overview

The demo test script (`automate_test/tests/demo-flow.spec.ts`) automates the 8-act demonstration flow described in `DEMO_FLOW.md`. It includes:

- **8 comprehensive test cases** covering each act of the demo
- **Mock API responses** for HR, Finance, and PM modules  
- **Video recording** via Playwright and CDP Screencast (JPEG sequence → MP4)
- **Role-based scenarios** with proper user authentication

## Quick Start

### 1. Install dependencies
```bash
cd automate_test
npm install
npm run install:browsers
```

### 2. Run demo test with video recording

**Option A: Standard Playwright video (WebM)**
```bash
# Run all demo tests
npm test -- demo-flow

# Or run specific act
npm test demo-flow -- --grep "ACT 1"

# Run with browser visible
npm run test:headed -- demo-flow
```

Videos will be saved to: `recordings/test-output/<test-name>/`

**Option B: CDP Screencast (JPEG frames → MP4)**
```bash
# Enable CDP screencast and record JPEG frames
ENABLE_CDP_SCREENCAST=1 npm test demo-flow
```

JPEG sequences will be in: `recordings/cdp-screencast/<test-name>/`

### 3. Convert JPEG frames to MP4 (with ffmpeg)

```bash
# Single act
cd recordings/cdp-screencast/ACT_1_*
ffmpeg -y -framerate 12 -pattern_type glob -i 'frame-*.jpg' \
  -c:v libx264 -pix_fmt yuv420p screencast.mp4

# Or use the convenience command in STITCH.txt
cat STITCH.txt
# Copy & run the ffmpeg command
```

### 4. Combine all acts into single demo video

```bash
# After running all 8 acts and converting JPEG → MP4:

ffmpeg -f concat -safe 0 -i filelist.txt -c copy demo_final.mp4

# filelist.txt format:
# file '/path/to/ACT_1_*.webm'
# file '/path/to/ACT_2_*.webm'
# ... (all 8 acts)
```

## Test Structure

### Test Accounts
| Role | Email | Password |
|------|-------|----------|
| super_admin | somchai@alphacorp.com | password123 |
| hr_admin | malee@alphacorp.com | password123 |
| finance_manager | wichai@alphacorp.com | password123 |
| pm_manager | napat@alphacorp.com | password123 |
| employee | pim@alphacorp.com | password123* |

*First login requires password change (mustChangePassword=true)

### Acts & Timing

| Act | Duration | Focus |
|-----|----------|-------|
| ACT 1 | ~2 min | Settings: Roles & Users |
| ACT 2 | ~2 min | HR Organization |
| ACT 3 | ~2 min | Employee Onboarding |
| ACT 4 | ~2 min | Leave Management |
| ACT 5 | ~2 min | Payroll Processing |
| ACT 6 | ~3 min | Finance: AR, AP, Reports |
| ACT 7 | ~2 min | Project Management |
| ACT 8 | ~1 min | Executive Dashboard |

**Total: ~16 minutes**

## Debugging

### View test in browser
```bash
npm run test:headed -- demo-flow
```

### Debug mode
```bash
npx playwright test demo-flow --debug
```

### View test report
```bash
npm test demo-flow
# Then open: recordings/playwright-report/index.html
```

## Customization

### Adjust timing
Edit `automate_test/tests/demo-flow.spec.ts` and modify `page.waitForTimeout()` values:
- `1000` = 1 second
- `2000` = 2 seconds
- `3000` = 3 seconds (key moments to highlight)

### Add/modify mock data
The seed data is in `buildOrgSeed()` function. Update:
- Department names/codes
- Position names/levels
- Employee information

### Adjust video quality
In `playwright.config.ts`:
```typescript
video: {
  mode: 'on',
  size: { width: 1920, height: 1080 },  // or 1280x720
}
```

## Output Structure

```
recordings/
├── test-output/               # Playwright WebM videos
│   ├── ACT 1 - Settings/
│   ├── ACT 2 - HR Organization/
│   └── ... (8 act folders)
├── cdp-screencast/            # JPEG sequences (if ENABLE_CDP_SCREENCAST=1)
│   ├── ACT_1_*.jpg sequences/
│   ├── ACT_2_*.jpg sequences/
│   └── ...
└── playwright-report/         # HTML report
```

## Video Processing Workflow

### Recommended: Use Playwright WebM (simpler)
1. Run: `npm test demo-flow`
2. WebM files auto-saved to `recordings/test-output/`
3. Convert with HandBrake or ffmpeg:
   ```bash
   ffmpeg -i input.webm -c:v libx264 -crf 23 output.mp4
   ```

### Alternative: Use CDP Screencast (JPEG frames)
1. Run: `ENABLE_CDP_SCREENCAST=1 npm test demo-flow`
2. Convert each act:
   ```bash
   cd recordings/cdp-screencast/ACT_X_*
   ffmpeg -y -framerate 12 -pattern_type glob -i 'frame-*.jpg' \
     -c:v libx264 -pix_fmt yuv420p screencast.mp4
   ```
3. Concatenate all MP4s

## Environment Variables

```bash
# Run with these env vars:

# Disable/enable videos
PW_VIDEO=off npm test      # No videos
PW_VIDEO=on npm test       # Record videos

# Enable CDP screencast (JPEG frames)
ENABLE_CDP_SCREENCAST=1 npm test

# Custom base URL
BASE_URL=http://localhost:3000 npm test

# Run against CI
CI=true npm test
```

## Tips for Demo

### Pre-demo checklist
- [ ] Run test once locally to verify all flows work
- [ ] Generate final video files
- [ ] Test video playback quality
- [ ] Have backup of test data/fixtures

### During demo
- Use `--headed` mode for live narration:
  ```bash
  npm run test:headed -- demo-flow
  ```
- Use browser DevTools for explaining UI
- Pause video at key moments (marked with ⭐ in DEMO_FLOW.md)

### Post-demo
- Save final video output to shared drive
- Create clip timestamps for team
- Gather feedback on flow and timing

## Troubleshooting

### Timeouts
- Increase `--timeout` if tests fail:
  ```bash
  npm test -- --timeout=60000  # 60 seconds per test
  ```

### API mock not working
- Check that all routes are properly mocked
- Verify `apiUrlGlob()` patterns match actual API calls
- Use `--debug` to inspect network tab

### Video quality poor
- Increase resolution in `playwright.config.ts`
- Adjust CDP screencast quality (0-100)
- Use MP4 codec instead of WebM

### Missing dependencies
```bash
# Reinstall browsers
npm run install:browsers

# Install ffmpeg (for JPEG → MP4)
# macOS:
brew install ffmpeg

# Ubuntu:
sudo apt-get install ffmpeg

# Windows:
choco install ffmpeg
```

## Related Files

- **Demo Flow Script**: `Documents/DEMO_FLOW.md`
- **Test File**: `automate_test/tests/demo-flow.spec.ts`
- **Config**: `automate_test/playwright.config.ts`
- **Fixtures**: `automate_test/fixtures/cdp-screencast.ts`
- **Helpers**: `automate_test/tests/helpers/`

## Support

For issues or questions:
1. Check test output: `recordings/playwright-report/`
2. Review test code and mock setup
3. Check browser console for JS errors
4. Run with `--debug` for interactive debugging
