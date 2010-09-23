require.paths.unshift(path.dirname(__dirname)+'/lib');

fs.readdirSync(__dirname).forEach(function(file) {
  if (file.match(/\.dirty$/)) {
    fs.unlinkSync(path.join(__dirname, file));
  }
});
