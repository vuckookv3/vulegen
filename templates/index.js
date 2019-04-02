const fs = require('fs');
const { join } = require('path');
const ejs = require('ejs');

function readFile(name) {
    const file = fs.readFileSync(join(__dirname, `./${name}.ejs`), 'utf-8');
    return file;
}

function renderEjs(name, params = {}) {
    const str = readFile(name);
    return ejs.render(str, params);
}

module.exports = {
    packagejson: (name) => renderEjs('package', { name }),
    export: (init = '') => renderEjs('export', { init }),
    config: () => renderEjs('config'),
    router: (init = '') => renderEjs('router', { init }),
    mainRouter: () => renderEjs('mainrouter'),
    www: () => renderEjs('www'),
    gitignore: () => renderEjs('gitignore'),
    env: () => renderEjs('env'),
    appjs: () => renderEjs('express'),
    helpers: () => renderEjs('helpers'),
    passport: () => renderEjs('passport'),
    apperror: () => renderEjs('apperror'),
    middlewares: () => renderEjs('middlewares'),
    schema: (name) => renderEjs('schema', { name }),
    modelRouter: (name) => renderEjs('modelrouter', { name })
}
