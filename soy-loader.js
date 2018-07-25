var child_process = require('child_process')
var path = require('path');
var createSoyImports = require("./plugin.js");

// Run the loader.
module.exports = function(source) {
  // console.log(this.query.verbose);
  createSoyImports(this.query.outputDir); //, this.query.verbose !== undefined ? this.query.verbose : false);
  let resource = this._module.resource;
  resource = path.relative(this.query.inputDir, resource);
  resource = resource.replace(".soy", ".js")
  resource = `${this.query.outputDir}/${resource}`;
  return fs.readFileSync(resource);
};
