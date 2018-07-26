const path = require('path'),
  CopyWebpackPlugin = require('copy-webpack-plugin'),
  PagesBuilder = require('./webpack.builder.js'),
  InlinerPlugin = require('./webpack.inliner.js'),
  SubresourceIntegrityPlugin = require('./webpack.sri.js'),
  SharedCache = {},
  entries = require('./webpack.entries.js'),
  MiniCssExtractPlugin = require("mini-css-extract-plugin"),
  SpeedMeasurePlugin = require("speed-measure-webpack-plugin");

/**
 * HappyPack: https://github.com/amireh/happypack
 */
const HappyPack = require('happypack');
const HappyThreadPool = HappyPack.ThreadPool({
  size: 4
});

/**
 * SpeedMeasurePlugin: https://github.com/stephencookdev/speed-measure-webpack-plugin
 */
const smp = new SpeedMeasurePlugin({
  disable: !process.env.MEASURE
});

// Webpack mode (https://medium.com/webpack/webpack-4-mode-and-optimization-5423a6bc597a)
const PROD = 'production',
      DEV = 'development';
const assetsPublicDirectoryName = require('./webpack.assetsOutput.js');

function isRelativeToAssets(name) {
  let rel = path.relative(path.resolve(__dirname,'./assets'), name);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function hashTemplate(mode, useChunk) {
  return mode === PROD ? `.[${useChunk ? 'chunk': ''}hash:8]` : '';
}

function getPlugins(mode) {
  const plugins = [
    new HappyPack({
      id: 'scss',
      threadPool: HappyThreadPool,
      loaders: [
        {
          loader: 'css-loader',
          options: {
            sourceMap: true
          }
        },
        {
          loader: 'postcss-loader',
          options: {
            sourceMap: true,
            config: {
              path: path.resolve(__dirname, 'postcss.config.js')
            }
          }
        },
        {
          loader: 'resolve-url-loader'
        },
        {
          loader: 'sass-loader',
          options: {
            sourceMap: true
          }
        }
      ]
    }),
    new HappyPack({
      id: 'js',
      threadPool: HappyThreadPool,
      loaders: [
        {
          loader: 'babel-loader',
          options: {
            presets: [
              ['env', {
                loose: true
              }]
            ],
            plugins: ['transform-object-rest-spread']
          }
        }
      ]
    }),
    new MiniCssExtractPlugin({
      filename: `[name]${hashTemplate(mode, true)}.css`,
      chunkFilename: `[id].css`
    }),
    new CopyWebpackPlugin([{
      from: 'assets/',
      to: `assets/[path][name]${hashTemplate(mode)}.[ext]`
    }]),
    new PagesBuilder({
      outputDir: assetsPublicDirectoryName,
      prod: mode === PROD,
    })
  ]

  if (mode === PROD) {
    plugins.push(new InlinerPlugin({}));
    plugins.push(new SubresourceIntegrityPlugin({}));
  }

  return plugins;
}

function config(mode) {
  return smp.wrap({
    mode: mode,
    context: path.resolve(__dirname),
    devtool: 'source-map',
    entry: entries,
    cache: SharedCache,
    output: {
      filename: `[name]${hashTemplate(mode, true)}.js`,
      publicPath: '',
      path: mode === PROD ? path.resolve(__dirname, `../desktop/${assetsPublicDirectoryName}`) : path.resolve(__dirname, '.tmp'),
    },
    module: {
      rules: [
        { // Rules for image and font files
          test: /\.(png|ico|gif|jpe?g|svg|webp|eot|otf|ttf|woff2?)$/,
          loader: 'file-loader',
          options: {
            name: function(filename){
              let relToSrc = path.relative('.', filename);
              let parsed = path.parse(relToSrc);
              let hash = mode === PROD ? '.[hash:8]': '';
              let nameTemplate = '';

              if (isRelativeToAssets(filename)) {
                nameTemplate = '[path][name]' + hash + '.[ext]';
              } else {
                nameTemplate = 'assets/vendor/[name]' + hash + '.[ext]';
              }
              return nameTemplate;
            },
            publicPath: '',
            outputPath: mode === PROD ? '' : '/',
          }
        },
        {
          test: /\.scss$/,
          use: [
            {
              loader: mode === PROD ? MiniCssExtractPlugin.loader: 'style-loader'
            },
            {
              loader: 'happypack/loader?id=scss'
            }
          ]
        },
        {
          test: /\.js$/,
          use: 'happypack/loader?id=js',
          exclude: /\/node_modules\/|\/lib\/|\/\.tmp\/|no-babel/
        },
        {
          test: /\.soy$/,
          loader: path.resolve('soy-loader.js'),
          query: {
            inputDir: path.resolve(__dirname, 'templates'),
            outputDir: path.resolve(__dirname, '.tmp/js/templates'),
            directiveFile: path.resolve(__dirname, 'js/components/Soy2js/directives.js'),
            funcsFile: path.resolve(__dirname, 'js/components/Soy2js/funcs.js')
          }
        },
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'ts-loader'
            }
          ]
        }
      ],
    },
    plugins: getPlugins(mode),
    resolve: {
      symlinks: false,
      cacheWithContext: false,
      extensions: ['.ts', '.js'],
      modules: [
        path.resolve(__dirname),
        path.resolve(__dirname, 'node_modules'),
        path.resolve(__dirname, 'bower_components'),
      ]
    },
  });
};

/**
 * For Grunt use only, comment if using webpack CLI
 */
module.exports = {
  dev: config(DEV),
  prod: config(PROD),
  assetsOutput: assetsPublicDirectoryName,
};

/*
 * npm install -g webpack webpack-cli
 * run `MEASURE=true webpack --watch` to see our webpack bottleneck(s)
 * (node-sass is ~50% our compilation time)
 * Unfortunately, this cannot run using grunt
 **/
// module.exports = config(DEV);
