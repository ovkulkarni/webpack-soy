package main

import (
	"flag"
	"log"
	"os"
	"path"
	"strings"

	templating "yext/pages/publishing/templating/soy"
	_ "yext/pages/siteurls"

	"github.com/robfig/soy"
	"github.com/robfig/soy/ast"
	"github.com/robfig/soy/soyhtml"
	"github.com/robfig/soy/soyjs"
)

var (
	templateDirectory    = flag.String("templates", "REQUIRED", "Directory to load Soy templates from")
	destinationDirectory = flag.String("destination", "REQUIRED", "Directory to write JS templates to")
	flog                 = log.New(os.Stderr, "", log.LstdFlags)
)

func init() {
	templating.InjectSoyFuncsDirectives()
}

func main() {
	flag.Parse()

	if *templateDirectory == "REQUIRED" || *destinationDirectory == "REQUIRED" {
		flag.Usage()
		os.Exit(1)
	}

	log.Println("Processing template directory:", *templateDirectory)

	for name, _ := range soyhtml.Funcs {
		if _, ok := soyjs.Funcs[name]; !ok {
			soyjs.Funcs[name] = makeJsFuncStub(name)
		}
	}

	for name, _ := range soyhtml.PrintDirectives {
		if _, ok := soyjs.PrintDirectives[name]; !ok {
			soyjs.PrintDirectives[name] = makeJsDirectiveStub(name)
		}
	}

	registry, err := soy.NewBundle().
		AddTemplateDir(*templateDirectory).
		AddParsePass(templating.AddNullSafeDirectives).
		Compile()
	fatalIf(err)

	for _, soyfile := range registry.SoyFiles {
		log.Println("Processing", soyfile.Name)
		templatefile := strings.Replace(soyfile.Name, *templateDirectory, "", 1)
		destfile := path.Join(*destinationDirectory, strings.Replace(templatefile, ".soy", ".js", -1))
		fatalIf(os.MkdirAll(path.Dir(destfile), 0777))
		f, err := os.Create(destfile)
		fatalIf(err)
		fatalIf(soyjs.Write(f, soyfile, soyjs.Options{}))
		_, err = f.WriteString("var nullSafe = function(x) {return x == null ? '' : x};")
		fatalIf(err)
	}

	log.Println("Done.")
}

func makeJsFuncStub(name string) soyjs.Func {
	return soyjs.Func{
		Apply: func(js soyjs.JSWriter, args []ast.Node) {
			js.Write(name + "(")
			for i, arg := range args {
				if i != 0 {
					js.Write(",")
				}
				js.Write(arg)
			}
			js.Write(")")
		},
		ValidArgLengths: []int{},
	}
}

func makeJsDirectiveStub(name string) soyjs.PrintDirective {
	if name != "nullSafe" {
		name = "Yext.Pages.Soy.Directives." + name
	}

	return soyjs.PrintDirective{
		Name:             name,
		CancelAutoescape: true,
	}
}

func fatalIf(err error) {
	if err != nil {
		flog.Fatalln("Fatal error:", err)
	}
}
