module.exports = async context => {
    if (context.electronPlatformName !== 'darwin') return;
    const arch = context.arch === 3 ? 'arm64' : context.arch === 1 ? 'x64' : null;
    if (!arch) throw new Error('Build separate arm64 and x64 Mac packages.');
    const { validateMacNative } = await import('./mac-native.mjs');
    validateMacNative(context.packager.info.appDir, arch);
};
