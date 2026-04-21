const major = Number.parseInt(process.version.slice(1).split('.')[0], 10)
if (Number.isNaN(major) || major < 18) {
  console.error('')
  console.error('[automate_test] Playwright ต้องการ Node.js 18 ขึ้นไป')
  console.error(`  ตัวที่รันอยู่: ${process.version}`)
  console.error('  แก้: nvm install 20 && nvm use   (ดู .nvmrc)')
  console.error('  แล้วรัน: npm run install:browsers')
  console.error('')
  process.exit(1)
}
