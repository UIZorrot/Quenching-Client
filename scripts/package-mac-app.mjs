/**
 * Package a macOS .app from Windows.
 *
 * electron-builder refuses darwin targets on Windows. @electron/packager can
 * target darwin, but it skips the platform when the host cannot create
 * symlinks (needs Administrator or Developer Mode). This script downloads the
 * official Electron darwin zip, materializes zip symlinks as file copies,
 * then assembles QMClient.app without requiring NTFS symlinks.
 *
 * Usage:
 *   node scripts/package-mac-app.mjs           # arm64 (Apple Silicon)
 *   node scripts/package-mac-app.mjs --x64     # Intel
 */
import { spawnSync } from 'child_process';
import archiver from 'archiver';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const yauzl = require('yauzl');
const asar = require('@electron/asar');
const plist = require('plist');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = require('../package.json');
const electronPkg = require('electron/package.json');

const arch = process.argv.includes('--x64') ? 'x64' : 'arm64';
const appName = 'QMClient';
const bundleId = 'com.quenching.mod.client';
const outDir = path.join(root, '__Bin');
const finalAppDir = path.join(outDir, `${appName}-darwin-${arch}`);
const finalAppPath = path.join(finalAppDir, `${appName}.app`);

const S_IFMT = 0o170000;
const S_IFLNK = 0o120000;
const S_IFDIR = 0o040000;

function downloadElectronZip(version, targetArch) {
	const filename = `electron-v${version}-darwin-${targetArch}.zip`;
	const cacheDir = path.join(os.homedir(), '.electron');
	fs.mkdirSync(cacheDir, { recursive: true });
	const dest = path.join(cacheDir, filename);
	if (fs.existsSync(dest) && fs.statSync(dest).size > 1024 * 1024) {
		console.log(`[package-mac-app] using cached ${dest}`);
		return dest;
	}

	const urls = [
		`https://npmmirror.com/mirrors/electron/v${version}/${filename}`,
		`https://cdn.npmmirror.com/binaries/electron/v${version}/${filename}`,
		`https://github.com/electron/electron/releases/download/v${version}/${filename}`,
	];

	for (const url of urls) {
		console.log(`[package-mac-app] downloading ${url}`);
		const result = spawnSync('curl.exe', ['-L', '--retry', '3', '--progress-bar', '-o', dest, url], {
			stdio: 'inherit',
			windowsHide: true,
		});
		if (result.status === 0 && fs.existsSync(dest) && fs.statSync(dest).size > 1024 * 1024) {
			return dest;
		}
		console.warn(`[package-mac-app] download failed from ${url}`);
	}

	throw new Error(`Failed to download ${filename}`);
}

function unixMode(entry) {
	return (entry.externalFileAttributes >>> 16) & 0xffff;
}

function openZip(zipPath) {
	return new Promise((resolve, reject) => {
		yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
			if (err) reject(err);
			else resolve(zipfile);
		});
	});
}

function readEntryBuffer(zipfile, entry) {
	return new Promise((resolve, reject) => {
		zipfile.openReadStream(entry, (err, stream) => {
			if (err) return reject(err);
			const chunks = [];
			stream.on('data', (c) => chunks.push(c));
			stream.on('error', reject);
			stream.on('end', () => resolve(Buffer.concat(chunks)));
		});
	});
}

function saveEntryFile(zipfile, entry, destPath) {
	return new Promise((resolve, reject) => {
		fs.mkdirSync(path.dirname(destPath), { recursive: true });
		zipfile.openReadStream(entry, (err, stream) => {
			if (err) return reject(err);
			const out = fs.createWriteStream(destPath);
			stream.pipe(out);
			out.on('finish', resolve);
			out.on('error', reject);
			stream.on('error', reject);
		});
	});
}

async function extractZipMaterializingSymlinks(zipPath, dest) {
	await fs.emptyDir(dest);
	const zipfile = await openZip(zipPath);
	const symlinks = [];

	await new Promise((resolve, reject) => {
		zipfile.on('error', reject);
		zipfile.on('end', resolve);
		zipfile.on('entry', async (entry) => {
			try {
				const name = entry.fileName.replace(/\\/g, '/');
				if (name.includes('..')) {
					zipfile.readEntry();
					return;
				}
				const mode = unixMode(entry);
				const destPath = path.join(dest, ...name.split('/').filter(Boolean));
				if (name.endsWith('/') || (mode & S_IFMT) === S_IFDIR) {
					fs.mkdirSync(destPath, { recursive: true });
				} else if ((mode & S_IFMT) === S_IFLNK) {
					const target = (await readEntryBuffer(zipfile, entry)).toString('utf8').trim();
					symlinks.push({ name, target });
				} else {
					await saveEntryFile(zipfile, entry, destPath);
				}
				zipfile.readEntry();
			} catch (error) {
				reject(error);
			}
		});
		zipfile.readEntry();
	});

	let remaining = [...symlinks];
	for (let pass = 0; pass < 12 && remaining.length; pass += 1) {
		const next = [];
		for (const link of remaining) {
			const destPath = path.join(dest, ...link.name.split('/').filter(Boolean));
			const sourcePath = path.resolve(path.dirname(destPath), link.target);
			if (!fs.existsSync(sourcePath)) {
				next.push(link);
				continue;
			}
			fs.mkdirSync(path.dirname(destPath), { recursive: true });
			const st = fs.statSync(sourcePath);
			if (st.isDirectory()) fs.copySync(sourcePath, destPath);
			else fs.copyFileSync(sourcePath, destPath);
		}
		remaining = next;
	}

	if (remaining.length) {
		throw new Error(
			`Failed to materialize ${remaining.length} zip symlink(s), e.g. ${remaining[0].name} -> ${remaining[0].target}`,
		);
	}

	console.log(`[package-mac-app] extracted Electron zip (${symlinks.length} symlinks copied as files)`);
}

function listProductionTopLevelIds() {
	const result = spawnSync('npm', ['ls', '--omit=dev', '--all', '--parseable'], {
		cwd: root,
		encoding: 'utf8',
		shell: true,
	});
	const nm = path.join(root, 'node_modules');
	const ids = new Set();
	for (const line of (result.stdout || '').split(/\r?\n/)) {
		const abs = line.trim();
		if (!abs.startsWith(nm)) continue;
		const rel = path.relative(nm, abs).replace(/\\/g, '/');
		if (!rel || rel.startsWith('..')) continue;
		const parts = rel.split('/').filter(Boolean);
		if (parts[0].startsWith('@')) {
			if (parts.length >= 2) ids.add(`${parts[0]}/${parts[1]}`);
		} else {
			ids.add(parts[0]);
		}
	}
	ids.delete('.bin');
	ids.delete('.cache');
	return ids;
}

function copyAppSources(stagingDir) {
	fs.emptyDirSync(stagingDir);
	fs.writeJsonSync(path.join(stagingDir, 'package.json'), {
		name: pkg.name,
		productName: appName,
		version: pkg.version,
		main: pkg.main,
		type: pkg.type,
		license: pkg.license,
		dependencies: pkg.dependencies,
	}, { spaces: 2 });

	fs.copySync(path.join(root, 'dist'), path.join(stagingDir, 'dist'), {
		filter: (src) => {
			const rel = path.relative(path.join(root, 'dist'), src).replace(/\\/g, '/');
			if (!rel) return true;
			if (rel === 'statics' || rel.startsWith('statics/')) return false;
			if (rel.endsWith('.map')) return false;
			return true;
		},
	});

	const nmSrc = path.join(root, 'node_modules');
	const nmDest = path.join(stagingDir, 'node_modules');
	fs.mkdirSync(nmDest, { recursive: true });
	const copyFilter = (src) => {
		const base = path.basename(src);
		if (base === '.bin' || base === 'test' || base === 'tests' || base === '__tests__') return false;
		if (src.endsWith('.map')) return false;
		return true;
	};
	const ids = listProductionTopLevelIds();
	let copied = 0;
	for (const id of ids) {
		const from = path.join(nmSrc, ...id.split('/'));
		if (!fs.existsSync(from)) continue;
		fs.copySync(from, path.join(nmDest, ...id.split('/')), {
			dereference: true,
			filter: copyFilter,
		});
		copied += 1;
	}
	console.log(`[package-mac-app] copied ${copied} production node_modules packages`);
}

function updatePlist(plistPath, updates) {
	const parsed = plist.parse(fs.readFileSync(plistPath, 'utf8'));
	Object.assign(parsed, updates);
	fs.writeFileSync(plistPath, plist.build(parsed));
}

function renameBundle(appPath, fromBase, toBase) {
	const macOSDir = path.join(appPath, 'Contents', 'MacOS');
	const fromExec = path.join(macOSDir, fromBase);
	const toExec = path.join(macOSDir, toBase);
	if (fs.existsSync(fromExec) && fromExec !== toExec) {
		fs.moveSync(fromExec, toExec, { overwrite: true });
	}
	updatePlist(path.join(appPath, 'Contents', 'Info.plist'), {
		CFBundleExecutable: toBase,
		CFBundleName: toBase,
		CFBundleDisplayName: toBase,
	});
}

function customizeMacApp(appPath) {
	updatePlist(path.join(appPath, 'Contents', 'Info.plist'), {
		CFBundleIdentifier: bundleId,
		CFBundleName: appName,
		CFBundleDisplayName: appName,
		CFBundleExecutable: appName,
		CFBundleShortVersionString: pkg.version,
		CFBundleVersion: pkg.version,
		LSApplicationCategoryType: 'public.app-category.games',
		NSRequiresAquaSystemAppearance: false,
	});
	renameBundle(appPath, 'Electron', appName);

	const frameworks = path.join(appPath, 'Contents', 'Frameworks');
	const helperSuffixes = [
		' Helper',
		' Helper EH',
		' Helper NP',
		' Helper (Renderer)',
		' Helper (Plugin)',
		' Helper (GPU)',
	];
	for (const suffix of helperSuffixes) {
		const fromName = `Electron${suffix}`;
		const toName = `${appName}${suffix}`;
		const fromApp = path.join(frameworks, `${fromName}.app`);
		if (!fs.existsSync(fromApp)) continue;
		renameBundle(fromApp, fromName, toName);
		updatePlist(path.join(fromApp, 'Contents', 'Info.plist'), {
			CFBundleIdentifier: `${bundleId}.helper${suffix.replace(/[^A-Za-z]/g, '').toLowerCase() || ''}`,
		});
		fs.moveSync(fromApp, path.join(frameworks, `${toName}.app`), { overwrite: true });
	}
}

function shouldBeExecutable(relPath) {
	const normalized = relPath.replace(/\\/g, '/');
	const base = path.posix.basename(normalized);
	if (normalized.includes('/Contents/MacOS/')) return true;
	if (/\.(dylib|so)$/i.test(normalized)) return true;
	if (normalized.includes('.framework/') && !path.posix.extname(base)) return true;
	if (/Helper/.test(base) && !path.posix.extname(base)) return true;
	if (base === 'chrome_crashpad_handler') return true;
	return false;
}

function zipAppWithUnixModes(appPath, zipPath) {
	return new Promise((resolve, reject) => {
		if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
		const output = fs.createWriteStream(zipPath);
		const archive = archiver('zip', { zlib: { level: 4 } });
		output.on('close', () => resolve(archive.pointer()));
		archive.on('error', reject);
		archive.pipe(output);

		const appFolderName = path.basename(appPath);
		const addDir = (absDir, zipDir) => {
			archive.append(Buffer.alloc(0), {
				name: zipDir.endsWith('/') ? zipDir : `${zipDir}/`,
				mode: 0o40755,
			});
			for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
				const abs = path.join(absDir, entry.name);
				const zipName = `${zipDir}/${entry.name}`.replace(/\\/g, '/');
				if (entry.isDirectory()) addDir(abs, zipName);
				else {
					const mode = shouldBeExecutable(zipName) ? 0o100755 : 0o100644;
					archive.file(abs, { name: zipName, mode });
				}
			}
		};

		addDir(appPath, appFolderName);
		archive.finalize();
	});
}

async function main() {
	if (!fs.existsSync(path.join(root, 'dist', 'main.js'))) {
		throw new Error('dist/main.js is missing. Run npm run build first.');
	}

	console.log(`[package-mac-app] packaging ${appName} darwin-${arch} (Electron ${electronPkg.version})`);
	const zipPath = downloadElectronZip(electronPkg.version, arch);
	console.log(`[package-mac-app] electron zip: ${zipPath}`);

	const workRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qm-mac-app-'));
	const extractDir = path.join(workRoot, 'electron');
	const stagingDir = path.join(workRoot, 'app');
	const asarPath = path.join(workRoot, 'app.asar');

	try {
		await extractZipMaterializingSymlinks(zipPath, extractDir);
		const extractedApp = path.join(extractDir, 'Electron.app');
		if (!fs.existsSync(extractedApp)) {
			throw new Error(`Electron.app not found after extract in ${extractDir}`);
		}

		console.log('[package-mac-app] copying filtered app sources...');
		copyAppSources(stagingDir);
		console.log('[package-mac-app] packing asar...');
		await asar.createPackageWithOptions(stagingDir, asarPath, {
			unpack: '**/*.{node,dylib,so}',
		});

		await fs.remove(finalAppDir);
		await fs.ensureDir(finalAppDir);
		await fs.copy(extractedApp, finalAppPath);
		customizeMacApp(finalAppPath);

		const resources = path.join(finalAppPath, 'Contents', 'Resources');
		const defaultAsar = path.join(resources, 'default_app.asar');
		if (fs.existsSync(defaultAsar)) await fs.remove(defaultAsar);
		await fs.copy(asarPath, path.join(resources, 'app.asar'));
		const unpacked = `${asarPath}.unpacked`;
		if (fs.existsSync(unpacked)) {
			await fs.copy(unpacked, path.join(resources, 'app.asar.unpacked'));
		}

		await fs.copy(path.join(root, 'assets'), path.join(resources, 'assets'));
		const staticsSrc = path.join(root, 'dist', 'statics');
		if (fs.existsSync(staticsSrc)) {
			await fs.copy(staticsSrc, path.join(resources, 'statics'));
		}

		const required = [
			path.join(finalAppPath, 'Contents', 'MacOS', appName),
			path.join(finalAppPath, 'Contents', 'Info.plist'),
			path.join(resources, 'app.asar'),
			path.join(resources, 'assets'),
		];
		for (const item of required) {
			if (!fs.existsSync(item)) {
				throw new Error(`Packaged app is missing expected path: ${item}`);
			}
		}

		const zipOut = path.join(outDir, `${appName}-darwin-${arch}.zip`);
		console.log(`[package-mac-app] zipping with unix executable bits: ${zipOut}`);
		const bytes = await zipAppWithUnixModes(finalAppPath, zipOut);
		console.log(`[package-mac-app] .app: ${finalAppPath}`);
		console.log(`[package-mac-app] zip: ${zipOut} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
		console.log('\nDone. Copy the zip to a Mac (preferred over the raw folder).');
		console.log('First launch: right-click the .app → Open, or: xattr -cr /path/to/QMClient.app');
	} finally {
		await fs.remove(workRoot).catch(() => {});
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
