/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirProjectExport command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command exports a directory as project.
 *
 * END HEADER
 */

import { CodeFileMeta, MDFileMeta } from '../modules/fsal/types'

import path from 'path'
import sanitize from 'sanitize-filename'
import ZettlrCommand from './zettlr-command'
import { makeExport } from '../modules/export'
import objectToArray from '../../common/util/object-to-array'
import makeImgPathsAbsolute from '../../common/util/make-img-paths-absolute'
import { EOL } from 'os'

import { getFnExportRE } from '../../common/regular-expressions'
import { ExporterOptions } from '../modules/export/types'

export default class DirProjectExport extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'dir-project-export')
  }

  /**
    * Exports the current project.
    * @param {String} evt The event name
    * @param  {Object} arg The hash of a directory.
    */
  async run (evt: string, arg: any): Promise<boolean> {
    // First get the directory
    let dir = this._app.findDir(arg.hash)

    if (dir === null) {
      global.log.error('Could not export project: Directory not found.')
      return false
    }

    let config = dir._settings.project

    if (config === null) {
      global.log.error(`Could not export project: Directory ${dir.name} has no project.`)
      return false
    }

    // Receive a two dimensional array of all directory contents
    let files = objectToArray(dir, 'children')

    // Reduce to files-only
    files = files.filter((elem) => { return elem.type === 'file' })

    // Import our RE
    let fnExportRE = getFnExportRE(true) // We want the multiline version.

    let promiseArr: Array<Promise<MDFileMeta | CodeFileMeta>> = []
    files.forEach(element => {
      promiseArr.push(this._app.getFileSystem().getFileContents(element))
    })

    const contentsArr = await Promise.all(promiseArr)
    const fileContentArr: string[] = []

    contentsArr.forEach((value, index) => {
      let fileContent = makeImgPathsAbsolute(path.dirname(files[index]), value.content)

      if (!(contentsArr.length === 1)) {
        fileContent = fileContent.replace(fnExportRE, (match, p1: string, offset, string) => `[^${String(files[index].hash)}${p1}]`)
      }

      fileContentArr.push(fileContent.trim() + `${EOL}${EOL}`)
    })

    // Mock a file object to which ZettlrExport has access
    let tempfile = {
      'path': path.join(dir.path, sanitize(config.title, { replacement: '-' })),
      'name': sanitize(config.title, { replacement: '-' }), // obvious filename
      'content': fileContentArr.join()
    }

    // Start up the Exporter
    let opt: ExporterOptions = {
      'format': config.format, // Which format: "html", "docx", "odt", "pdf"
      'file': tempfile, // The file to be exported
      'dest': dir.path, // On project exports, always dir path
      'stripIDs': true,
      'stripTags': true,
      'stripLinks': 'full',
      'pdf': config.pdf,
      'title': config.title,
      'date': '\\today',
      'author': config.pdf.author,
      'keywords': config.pdf.keywords,
      'cslStyle': config.cslStyle
    }

    // Aaaand export.
    try {
      await makeExport(opt)
    } catch (err) {
      global.log.error(err.message, err)
      global.application.displayErrorMessage(
        err.title || err.message,
        err.message,
        err.additionalInfo || ''
      )
    }

    return true
  }
}
