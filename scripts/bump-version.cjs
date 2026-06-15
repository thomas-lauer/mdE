const fs = require('node:fs');

const packagePath = 'package.json';
const lockPath = 'package-lock.json';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function nextMajorVersion(version) {
  const major = Number.parseInt(String(version).split('.')[0], 10);

  if (!Number.isFinite(major)) {
    throw new Error(`Invalid package version: ${version}`);
  }

  return `${major + 1}.0.0`;
}

const packageJson = readJson(packagePath);
const nextVersion = nextMajorVersion(packageJson.version);
packageJson.version = nextVersion;
writeJson(packagePath, packageJson);

if (fs.existsSync(lockPath)) {
  const packageLock = readJson(lockPath);
  packageLock.version = nextVersion;

  if (packageLock.packages?.['']) {
    packageLock.packages[''].version = nextVersion;
  }

  writeJson(lockPath, packageLock);
}

console.log(nextVersion);
