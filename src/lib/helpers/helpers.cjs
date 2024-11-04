const genUniqId = () => {
    return Date.now() + '-' + Math.floor(Math.random() * 1000000000);
};

const isStringEqual = (st1 = '', st2 = '') => {
    return st1.toLowerCase().search(st2.toLowerCase());
};

const getAllFilesFromFolder = (dirName, options = {}) => {
    const fs = require('fs');
    const path = require('path');

    const { mask = '.docx|.doc|.pdf', isRecursion = false } = options;
    let results = [];

    const listDirForFiles = (dName) => {
        fs.readdirSync(dName).forEach((file) => {
            file = path.resolve(dName, file);
            const stat = fs.statSync(file);

            if (stat && stat.isDirectory() && isRecursion) {
                listDirForFiles(file);
            } else {
                if (
                    mask.split('|').includes(path.parse(file).ext.toLowerCase())
                ) {
                    console.log(
                        `Добавлена новая карта таксационного описания: [${
                            path.parse(file).base
                        }]`
                    );

                    const newFile = `${path
                        .parse(file)
                        .dir.replace(dirName, '')
                        .replace('\\', '/')}/${path.parse(file).base}`;
                    if (!path.parse(file).name.startsWith('~'))
                        results.push(
                            newFile.startsWith('/') ? newFile.slice(1) : newFile
                        );
                }
            }
        });
    };
    listDirForFiles(dirName);

    console.log(
        results,
        `Файлы [${mask}] из дириктории ${path.dirname(dirName)}`
    );

    return results;
};

module.exports = { genUniqId, getAllFilesFromFolder, isStringEqual };
