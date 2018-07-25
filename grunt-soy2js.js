"use strict"

const exec = require('child_process').exec;

module.exports = (grunt) => {
  grunt.config.merge({
    shell: {
      soy2js: {
        command: 'soy2js -templates=templates -destination=.tmp/js/templates',
        options: {
          async: false,
          stdout: false // Its a little noisy
        }
      }
    },
    watch: {
      soy2js: {
        files: ['templates/**/*.soy'],
        tasks: ['shell:soy2js', 'webpack:devwatch']
      }
    }
  });
  grunt.task.renameTask('devbuild', 'devbuild-orig');
  grunt.registerTask('devbuild', ['shell:soy2js', 'devbuild-orig']);
};
