#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const pluralize = require('pluralize');
const t = require('../templates');
const program = require('commander');
const colors = require('colors');
const thisdir = process.cwd();

program
    .name('vulegen')
    .version('0.1.0', '-v, --version');

program
    .command('init <name>')
    .description('Creates new folder and initialize boilerplate.')
    .action(init);

program
    .command('add <Model> [crud]')
    .description('Add a new Model and specify which routes should be made for normal user.')
    .action(add);

program
    .command('delete <Model>')
    .description('Deletes a Model')
    .action(deleteModel);


program.parse(process.argv)

if (!process.argv.slice(2).length || !['init', 'add', 'delete'].includes(process.argv.slice(2)[0])) {
    program.outputHelp(colors.red);
}


function init(name) {

    name = name.toLowerCase();
    const pathToProject = path.join(thisdir, name);
    if (fs.existsSync(pathToProject)) return console.error(colors.red('Folder with that name already exists in this location.'));

    const makePath = (fold = '') => path.join(pathToProject, fold);

    // create folders
    fs.mkdirSync(makePath())

    fs.mkdirSync(makePath('./bin'))
    fs.writeFileSync(makePath('./bin/www'), t.www())

    fs.mkdirSync(makePath('./config'))
    fs.writeFileSync(makePath('./config/index.js'), t.config());
    fs.writeFileSync(makePath('./config/passport.js'), t.passport())

    fs.mkdirSync(makePath('./helpers'))
    fs.writeFileSync(makePath('./helpers/index.js'), t.helpers());
    fs.writeFileSync(makePath('./helpers/AppError.js'), t.apperror());

    fs.mkdirSync(makePath('./middlewares'))
    fs.writeFileSync(makePath('./middlewares/index.js'), t.middlewares())

    fs.mkdirSync(makePath('./models'))
    fs.writeFileSync(makePath('./models/index.js'), t.export(`\tAdmin: require('./Admin'),\n\tUser: require('./User'),`));
    fs.writeFileSync(makePath('./models/User.js'), t.User());
    fs.writeFileSync(makePath('./models/Admin.js'), t.Admin());

    fs.mkdirSync(makePath('./routes'))
    fs.writeFileSync(makePath('./routes/index.js'), t.mainRouter());

    fs.mkdirSync(makePath('./routes/admin'));
    fs.writeFileSync(makePath('./routes/admin/index.js'), t.router(`router.use('/admins', require('./admins'));\nrouter.use('/users', require('./users'))`));
    fs.writeFileSync(makePath('./routes/admin/auth.js'), t.auth('Admin'));
    fs.writeFileSync(makePath('./routes/admin/admins.js'), t.modelRouter('Admin'));
    fs.writeFileSync(makePath('./routes/admin/users.js'), t.modelRouter('User'));

    fs.mkdirSync(makePath('./routes/front'));
    fs.writeFileSync(makePath('./routes/front/index.js'), t.router(`router.use('/auth', require('./auth'));`));
    fs.writeFileSync(makePath('./routes/front/auth.js'), t.auth('User'));

    fs.writeFileSync(makePath('./.env'), t.env());
    fs.writeFileSync(makePath('./.gitignore'), t.gitignore());
    fs.writeFileSync(makePath('./app.js'), t.appjs());
    fs.writeFileSync(makePath('./package.json'), t.packagejson(name));


    console.log();
    console.log(colors.green('Congratulations. You can now start using your new project.'))
    console.log();
    console.log(colors.yellow(`Don't forget to change your ${colors.red(`.env`)} variables.`));
    console.log(`\nChange directory: `)
    console.log(`\t$ cd ${name}`);
    console.log(`\nInstall packages: `)
    console.log(`\t$ npm i`)
    console.log('\nAdd new Model: ');
    console.log(`\t$ vulegen add Post`);
    console.log('\nRun the app: ');
    console.log(`\t$ npm start`);
    console.log(colors.green('\nDONE.\n'));
}

function add(name, crud) {
    const makePath = (fold = '') => path.join(thisdir, fold);

    // check if it is vulegen project
    if (!fs.existsSync(makePath('./package.json'))) return console.error('package.json is not located in the current directory.');
    let packagejson = fs.readFileSync(makePath('./package.json'), 'utf-8');
    packagejson = JSON.parse(packagejson);
    if (!(packagejson.vulegen == true)) return console.error(colors.yellow(`This project is not generated with vulegen. You can't do this action`));

    const { singular, plural } = word(name);

    if (fs.existsSync(makePath(`./models/${singular}.js`))) return console.error(colors.red(`Model with that name already exists.`));

    // make model and update exports
    fs.writeFileSync(makePath(`./models/${singular}.js`), t.schema(singular));
    let modelIndex = fs.readFileSync(makePath('./models/index.js'), 'utf-8');
    modelIndex = rewriteModelExports(singular, modelIndex);
    fs.writeFileSync(makePath('./models/index.js'), modelIndex);

    // make routes
    fs.writeFileSync(makePath(`./routes/admin/${plural}.js`), t.modelRouter(singular));
    fs.writeFileSync(makePath(`./routes/front/${plural}.js`), t.modelRouter(singular, crud, 'User'));

    // edit routes exports
    let adminRouter = fs.readFileSync(makePath('./routes/admin/index.js'), 'utf-8');
    adminRouter = rewriteRouterExport(plural, adminRouter);
    fs.writeFileSync(makePath('./routes/admin/index.js'), adminRouter);

    let frontRouter = fs.readFileSync(makePath('./routes/front/index.js'), 'utf-8');
    frontRouter = rewriteRouterExport(plural, frontRouter);
    fs.writeFileSync(makePath('./routes/front/index.js'), frontRouter);

    console.log(colors.green('\nDONE.\n'));
}

function deleteModel(model) {
    const makePath = (fold = '') => path.join(thisdir, fold);

    // check if it is vulegen project
    if (!fs.existsSync(makePath('./package.json'))) return console.error('package.json is not located in the current directory.');
    let packagejson = fs.readFileSync(makePath('./package.json'), 'utf-8');
    packagejson = JSON.parse(packagejson);
    if (!(packagejson.vulegen == true)) return console.error(colors.yellow(`This project is not generated with vulegen. You can't do this action`));

    const { singular, plural } = word(model);

    if (!fs.existsSync(makePath(`./models/${singular}.js`))) return console.error(colors.red(`Model with that name doesn't exist.`));

    fs.unlinkSync(makePath(`./models/${singular}.js`));
    fs.unlinkSync(makePath(`./routes/admin/${plural}.js`));
    fs.unlinkSync(makePath(`./routes/front/${plural}.js`));

    let modelIndex = fs.readFileSync(makePath('./models/index.js'), 'utf-8');
    modelIndex = deleteModelExports(singular, modelIndex);
    fs.writeFileSync(makePath(`./models/index.js`), modelIndex);

    let adminIndex = fs.readFileSync(makePath('./routes/admin/index.js'), 'utf-8');
    adminIndex = deleteRouterExports(plural, adminIndex);
    fs.writeFileSync(makePath(`./routes/admin/index.js`), adminIndex);

    let frontIndex = fs.readFileSync(makePath('./routes/front/index.js'), 'utf-8');
    frontIndex = deleteRouterExports(plural, frontIndex);
    fs.writeFileSync(makePath(`./routes/front/index.js`), frontIndex);

    console.log(colors.green(`\nDONE.\n`));
}


function word(name) {
    let singular = null;
    let plural = null;

    name = name.toLowerCase();
    if (pluralize.isSingular(name)) {
        singular = name;
        plural = pluralize.plural(name);
    } else if (pluralize.isPlural(name)) {
        singular = pluralize.singular(name);
        plural = name;
    } else {
        return console.error('Unrecognized word. Please enter English word for name of Model.')
    }

    singular = singular.charAt(0).toUpperCase() + singular.slice(1);

    return { singular, plural };
}

function deleteModelExports(singular, str) {
    let arr = str
        .split('\n')
        .map(e => e.trim())
        .filter(e => !!e)
        .filter(e => !(e.startsWith('module') || e.startsWith('}')))
        .filter(e => !(e.startsWith(singular)))
        .map(e => `\t${e}`);

    arr = arr.sort();

    return [
        `module.exports = {`,
        ...arr,
        `};`
    ].join('\n');
}

function deleteRouterExports(plural, str) {
    let arr = str
        .split('\n')
        .map(e => e.trim())
        .filter(e => !!e)
        .filter(e => !(e.startsWith('const') || e.startsWith('module')))
        .filter(e => !(e.includes(plural)))

    arr = arr.sort();

    return [
        `const express = require('express');`,
        `const router = express.Router();`,
        ``,
        ...arr,
        ``,
        `module.exports = router;`
    ].join('\n');

}

function rewriteModelExports(singular, str) {
    let arr = str
        .split('\n')
        .map(e => e.trim())
        .filter(e => !!e)
        .filter(e => !(e.startsWith('module') || e.startsWith('}')))
        .map(e => `\t${e}`);

    arr.push(`\t${singular}: require('./${singular}'),`);
    arr = arr.sort();
    return [
        `module.exports = {`,
        ...arr,
        `};`
    ].join('\n');
}

function rewriteRouterExport(plural, str) {
    let arr = str
        .split('\n')
        .map(e => e.trim())
        .filter(e => !!e)
        .filter(e => !(e.startsWith('const') || e.startsWith('module')))

    arr.push(`router.use('/${plural}', require('./${plural}'))`);
    arr = arr.sort();

    return [
        `const express = require('express');`,
        `const router = express.Router();`,
        ``,
        ...arr,
        ``,
        `module.exports = router;`
    ].join('\n');
}