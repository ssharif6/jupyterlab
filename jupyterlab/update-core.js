var childProcess = require('child_process');
var fs = require('fs-extra');
var glob = require('glob');
var path = require('path');
var sortPackageJson = require('sort-package-json');

// Get the current version of JupyterLab
var cwd = path.resolve('..');
var version = childProcess.execSync('python setup.py --version', { cwd: cwd });
version = version.toString().trim();

var corePackage = require('./package.json');
corePackage.jupyterlab.extensions = {};
corePackage.jupyterlab.mimeExtensions = {};
corePackage.jupyterlab.version = version;
corePackage.jupyterlab.linkedPackages = {};
corePackage.dependencies = {};

var basePath = path.resolve('..');
var packages = glob.sync(path.join(basePath, 'packages/*'));
packages.forEach(function(packagePath) {

   var dataPath = path.join(packagePath, 'package.json');
   try {
    var data = require(dataPath);
  } catch (e) {
    return;
  }

  if (data.private === true) {
    return;
  }

  // Make sure it is included as a dependency and a linked package.
  corePackage.dependencies[data.name] = '^' + String(data.version);
  var relativePath = '../packages/' + path.basename(packagePath);
  corePackage.jupyterlab.linkedPackages[data.name] = relativePath;

  var jlab = data.jupyterlab;
  if (!jlab) {
    return;
  }

  // Add its dependencies to the core dependencies.
  var deps = data.dependencies || [];
  for (var dep in deps) {
    corePackage.dependencies[dep] = deps[dep];
  }

  // Handle extensions.
  ['extension', 'mimeExtension'].forEach(function(item) {
    var ext = jlab[item];
    if (ext === true) {
      ext = ''
    }
    if (typeof ext !== 'string') {
      return;
    }
    corePackage.jupyterlab[item + 's'][data.name] = ext;
  });
});

// Write the package.json back to disk.
var text = JSON.stringify(sortPackageJson(corePackage), null, 2) + '\n';
fs.writeFileSync('./package.json', text);
