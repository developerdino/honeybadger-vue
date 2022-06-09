import Honeybadger from '@honeybadger-io/js'
import { logError } from './error-logging'

function shouldLogError (app, options) {
  if (app.config.warnHandler) {
    return true
  }

  const hasConsole = typeof console !== 'undefined'
  const isDebug = options.debug || process.env.NODE_ENV !== 'production'
  return hasConsole && isDebug
}

function extractContext (vm) {
  const options = vm.$options || {}
  const name = options.name || options._componentTag
  const file = options.__file
  const parentName = vm.$parent && vm.$parent.$options ? vm.$parent.$options.name : undefined

  // Vue2 - $options.propsData
  // Vue3 - $props
  const props = options.propsData || vm.$props;

  return {
    isRoot: vm.$root === vm,
    name: name,
    props,
    parentName: parentName,
    file: file
  }
}

function init(options) {
  const vue = options.vue
  if (!vue) {
    console.error('HoneybadgerVue component cannot be initialized. Vue app missing from options.')
    return
  }

  if (options.debug) {
    console.log(`Honeybadger configured with ${options.apiKey}`)
  }
  const honeybadger = Honeybadger.configure(options)
  vue.$honeybadger = honeybadger

  // vue 2 support -> make available for all components
  vue.prototype.$honeybadger = honeybadger

  if (vue.config && vue.config.globalProperties) {
    // vue 3 support -> make available for all components
    vue.config.globalProperties.$honeybadger = honeybadger
  }
  const chainedErrorHandler = vue.config.errorHandler
  vue.config.errorHandler = (error, vm, info) => {
    honeybadger.notify(error, { context: { vm: extractContext(vm), info: info } })
    if (typeof chainedErrorHandler === 'function') {
      chainedErrorHandler.call(vue, error, vm, info)
    }

    if (shouldLogError(vue, options)) {
      logError(vue, error, vm, info)
    }
  }
}

module.exports = {
  init
}
