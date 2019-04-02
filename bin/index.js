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
    .action((name) => {
        init(name);
    });

program
    .command('add <Model>')
    .description('Add a new Model')
    .action((model) => {
        console.log('add model', model)
    });

program.command('delete <Model>')
    .description('Deletes a Model')
    .action(() => {
        console.log('delete model')
    })

program.parse(process.argv)

if (!process.argv.slice(2).length || !['init', 'add', 'delete'].includes(process.argv.slice(2)[0])) {
    program.outputHelp(colors.red);
}


function init(name) {
    // check name and folder avaibility
    if (!name) return console.error('\x1b[31m%s\x1b[0m', 'You must specify name of the project as second argument.');
    name = name.toLowerCase();
    const pathToProject = path.join(thisdir, name);
    if (fs.existsSync(pathToProject)) return console.error('\x1b[31m%s\x1b[0m', 'Folder with that name already exists in this location.');

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
    fs.writeFileSync(makePath('./models/index.js'), t.export());

    fs.mkdirSync(makePath('./routes'))
    fs.writeFileSync(makePath('./routes/index.js'), t.mainRouter());
    fs.mkdirSync(makePath('./routes/admin'))
    fs.writeFileSync(makePath('./routes/admin/index.js'), t.router());
    fs.mkdirSync(makePath('./routes/front'))
    fs.writeFileSync(makePath('./routes/front/index.js'), t.router());

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
    console.log(colors.green('\nDONE.\n'))
}

function add(name) {
    const makePath = (fold = '') => path.join(thisdir, fold);

    // check if it is vulegen project
    if (!fs.existsSync(makePath('./package.json'))) return console.error('package.json not located in current directory.');
    let packagejson = fs.readFileSync(makePath('./package.json'), { encoding: 'UTF8' });
    packagejson = JSON.parse(packagejson);
    if (!(packagejson.vulegen == true)) return console.error(`This is not generated with vulegen. You can't do this action.`);

    const { singular, plural } = word(name);

    if (fs.existsSync(makePath(`./models/${singular}.js`))) return console.error(`Model with that name already exists.`);

    // make model
    fs.writeFileSync(makePath(`./models/${singular}.js`), t.schema(singular));
    const modelIndex = fs.readFileSync(makePath('./models/index.js'), { encoding: 'UTF8' });
    let newModelIndex = modelIndex.split('\n');
    newModelIndex = newModelIndex.slice(1, newModelIndex.length - 1).filter(e => !!e)
    newModelIndex.push(`\t${singular}: require('./${singular}'),`)
    newModelIndex = newModelIndex.sort();
    newModelIndex.unshift(`module.exports = {`);
    newModelIndex.push(`}`)
    newModelIndex = newModelIndex.join('\n')
    fs.writeFileSync(makePath('./models/index.js'), newModelIndex);

    // make routes
    fs.writeFileSync(makePath(`./routes/admin/${plural}.js`), t.modelRouter(singular));
    fs.writeFileSync(makePath(`./routes/front/${plural}.js`), t.modelRouter(singular));

    // edit routes exports
    let adminRouter = fs.readFileSync(makePath('./routes/admin/index.js'), { encoding: 'UTF8' });
    adminRouter = adminRouter.split('\n');
    adminRouter = adminRouter.slice(2, adminRouter.length - 1).filter(e => !!e);
    adminRouter.push(`router.use('/${plural}', require('./${plural}'));`);
    adminRouter = adminRouter.sort();
    adminRouter.unshift(`const router = express.Router();\n`);
    adminRouter.unshift(`const express = require('express');`)
    adminRouter.push(`\nmodule.exports = router;`)
    adminRouter = adminRouter.join('\n');
    fs.writeFileSync(makePath('./routes/admin/index.js'), adminRouter);

    let frontRouter = fs.readFileSync(makePath('./routes/front/index.js'), { encoding: 'UTF8' });
    frontRouter = frontRouter.split('\n');
    frontRouter = frontRouter.slice(2, frontRouter.length - 1).filter(e => !!e);
    frontRouter.push(`router.use('/${plural}', require('./${plural}'));`);
    frontRouter = frontRouter.sort();
    frontRouter.unshift(`const router = express.Router();\n`);
    frontRouter.unshift(`const express = require('express');`)
    frontRouter.push(`\nmodule.exports = router;`)
    frontRouter = frontRouter.join('\n');
    fs.writeFileSync(makePath('./routes/front/index.js'), frontRouter);

    console.log('DONE')
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