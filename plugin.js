var fs = require("fs");
var path = require("path");
var glob = require("glob");


function stringToArray(string) {
  return /\[(.*)\]/.exec(string)[1].split(", ");
}

function createSoyImports(directory, funcFile, directiveFile) {
  // let verbose = verb !== undefined ? verb : false;
  let files = glob.sync(`${directory}/**/*.js`, {})
  let mapping = {};
  for(fn of files){
    let fullFileName = path.resolve(fn);
    let fileContent = fs.readFileSync(fullFileName).toString();
    let relevantContent = null;
    try {
      relevantContent = fileContent.split("/* START */")[1].split("/* END */")[0];
    } catch (error){
      // console.log(`No function declaration data found in ${fullFileName}`);
      continue;
    }
    if(relevantContent === null) continue;
    let relevantContentLines = relevantContent.trim().split("\n");
    let declared = relevantContentLines[0].split('declared:')[1].trim();
    let parsedDeclared = stringToArray(declared);
    for(let method of parsedDeclared)
    {
      mapping[method] = fullFileName;
    }
  }
  for(fn of files){
    let fullFileName = path.resolve(fn);
    let fileContent = fs.readFileSync(fullFileName).toString();
    let relevantContent = null;
    try {
      relevantContent = fileContent.split("/* START */")[1].split("/* END */")[0];
    } catch (error){
      // if(verbose)
      //   console.log(`No function declaration data found in ${fullFileName}`);
      continue;
    }
    if(relevantContent === null) continue;
    let relevantContentLines = relevantContent.trim().split("\n");
    let called = relevantContentLines[1].split('called:')[1].trim();
    let parsedCalled = new Set(stringToArray(called));
    let newFileExtracted = /([\s\S]*?)\/\* START \*\/[\s\S]*?\/\* END \*\/([\s\S]*)/.exec(fileContent);
    let soyUtils = "import 'imports-loader?global=>window!js/components/Soy2js/soyutils.js?no-babel';"
    let newFileContent = `${soyUtils};\n${newFileExtracted[1].trim()}\n${newFileExtracted[2].trim()}\n`;
    for(let method of parsedCalled)
      if(method !== '' && fullFileName !== mapping[method]){
        if(method.startsWith('funcs.')){
          method = method.replace('funcs.', '');
          mapping[method] = funcFile;
        }
        if(method.startsWith('directives.')){
          method = method.replace('directives.', '');
          mapping[method] = directiveFile;
        }
        let relPath = path.relative(process.cwd(), mapping[method]);
        newFileContent = `import { ${method} } from '${relPath}';\n${newFileContent}`;
      }
    // if(verbose)
    //   console.log(`****** NEW FILE (${fullFileName}) ******`)
    fs.writeFileSync(fullFileName, newFileContent)
  }
};

module.exports = createSoyImports;
