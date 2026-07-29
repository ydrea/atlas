const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function getCumquatPackageRoot() {
  return path.dirname(require.resolve('react-native-cumquat/package.json'));
}

describe('Cumquat package native integration', () => {
  test('delegates native Codegen and autolinking to react-native-cumquat', () => {
    const appPackageJson = readJson('package.json');
    const appConfig = read('app.config.js');

    expect(appPackageJson.dependencies['react-native-cumquat']).toBeDefined();
    expect(appPackageJson.codegenConfig).toBeUndefined();
    expect(appConfig).not.toContain('./plugins/withCumquatNative');
    expect(
      fs.existsSync(path.join(projectRoot, 'plugins/withCumquatNative.js')),
    ).toBe(false);
  });

  test('ships package-owned React Native Codegen configuration', () => {
    const packageRoot = getCumquatPackageRoot();
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
    );

    expect(packageJson.codegenConfig).toMatchObject({
      name: 'CumquatSpec',
      type: 'modules',
      jsSrcsDir: 'src',
      includesGeneratedCode: true,
      android: {
        javaPackageName: 'com.cumquat',
      },
    });
  });

  test('compiles the package C++ implementation as a C++20 CocoaPod', () => {
    const packageRoot = getCumquatPackageRoot();
    const podspec = fs.readFileSync(
      path.join(packageRoot, 'Cumquat.podspec'),
      'utf8',
    );

    expect(podspec).toContain('"cpp/**/*.{hpp,cpp,c,h}"');
    expect(podspec).toContain('"ios/generated/*.{h,cpp,mm}"');
    expect(podspec).toContain(
      '"CLANG_CXX_LANGUAGE_STANDARD" => "c++20"',
    );
    expect(podspec).toContain('install_modules_dependencies(s)');
  });

  test('registers the pure C++ TurboModule from the package', () => {
    const packageRoot = getCumquatPackageRoot();
    const onLoad = fs.readFileSync(
      path.join(packageRoot, 'ios/OnLoad.mm'),
      'utf8',
    );

    expect(onLoad).toContain('registerCxxModuleToGlobalModuleMap');
    expect(onLoad).toContain('std::make_shared<CumquatImpl>');
  });
});
