/**
 * BEGIN HEADER
 *
 * Contains:        Build Script
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains scripts to package resources that aren't in the asar.
 *
 * END HEADER
 */

var fs = require('fs-extra')
var path = require('path')

const dirs = [
    'img',
    'fonts/crimson',
    'fonts/inconsolata',
    'fonts/lato',
    'fonts/liberation-mono',
]

const options = {
    mode: 0o2775
  }

module.exports = function(basePath, electronVersion, platform, arch, done) {

    dirs.map(dir => {
        let dest = path.join(basePath, dir)
        let sourcedir = path.join(__dirname,dir)
        copyResources(sourcedir, dest)
    },

    function copyResources(sourcedir, dest) {

        fs.ensureDir(sourcedir, options)
        .then(() => {
          console.log('success!')
        })
        .catch(err => {
          console.error(err)
        })

        fs.copy(sourcedir,dest)

    },
    done(),
 }
