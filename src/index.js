// @ts-check

const { join, relative } = require('path')

const { copy, existsSync } = require('fs-extra')

const { restoreCache, saveCache } = require('./helpers/cache')
const { getNextConfig, configureHandlerFunctions, generateRedirects } = require('./helpers/config')
const { moveStaticPages, movePublicFiles } = require('./helpers/files')
const { generateFunctions, setupImageFunction, generatePagesResolver } = require('./helpers/functions')
const {
  verifyNetlifyBuildVersion,
  checkNextSiteHasBuilt,
  verifyBuildTarget,
  checkForRootPublish,
  logBetaMessage,
} = require('./helpers/verification')

module.exports = {
  async onPreBuild({
    constants,
    netlifyConfig,
    utils: {
      build: { failBuild },
      cache,
    },
  }) {
    logBetaMessage()
    const { publish } = netlifyConfig.build
    checkForRootPublish({ publish, failBuild })
    verifyNetlifyBuildVersion({ failBuild, ...constants })

    await restoreCache({ cache, publish })
  },

  async onBuild({
    constants,
    netlifyConfig,
    utils: {
      build: { failBuild },
    },
  }) {
    const { publish } = netlifyConfig.build

    checkNextSiteHasBuilt({ publish, failBuild })

    const { appDir, basePath, i18n, images, target, ignore } = await getNextConfig({ publish, failBuild })

    verifyBuildTarget(target)

    configureHandlerFunctions({ netlifyConfig, ignore, publish: relative(process.cwd(), publish) })

    await generateFunctions(constants, appDir)
    await generatePagesResolver({ netlifyConfig, target, constants })

    await movePublicFiles({ appDir, publish })

    if (process.env.EXPERIMENTAL_MOVE_STATIC_PAGES) {
      await moveStaticPages({ target, failBuild, netlifyConfig, i18n })
    }

    await setupImageFunction({ constants, imageconfig: images, netlifyConfig, basePath })

    await generateRedirects({
      netlifyConfig,
      basePath,
      i18n,
    })
  },

  async onPostBuild({ netlifyConfig, utils: { cache } }) {
    return saveCache({ cache, publish: netlifyConfig.build.publish })
  },
  onEnd() {
    logBetaMessage()
  },
}
