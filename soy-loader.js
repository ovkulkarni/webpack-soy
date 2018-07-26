var child_process = require('child_process')
var path = require('path');
var createSoyImports = require("./plugin.js");

// Run the loader.
module.exports = function(source) {
  // console.log(this.query.verbose);
  const outputDir = this.query.outputDir !== undefined ? this.query.outputDir : path.resolve('./.tmp/js/templates');
  const inputDir = this.query.inputDir !== undefined ? this.query.inputDir : path.resolve('./templates');
  const funcFile = this.query.funcFile !== undefined ? this.query.funcFile : path.resolve('./js/components/Soy2js/funcs.js')
  const directiveFile = this.query.directiveFile !== undefined ? this.query.directiveFile : path.resolve('./js/components/Soy2js/directives.js')

  createSoyImports(outputDir, funcFile, directiveFile); //, this.query.verbose !== undefined ? this.query.verbose : false);
  let resource = this._module.resource;
  resource = path.relative(inputDir, resource);
  resource = resource.replace(".soy", ".js")
  resource = `${outputDir}/${resource}`;
  return fs.readFileSync(resource);
};
