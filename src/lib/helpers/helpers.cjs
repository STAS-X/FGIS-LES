const genUniqId = () => {
    return Date.now() + '-' + Math.floor(Math.random() * 1000000000);
};

const getAllFilesFromFolder = (dirName, isRecursion = false) => {
    const fs = require('fs');
    const path = require('path');

    const mask = '.docx|.doc|.pdf';
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

                    results.push(
                        newFile.startsWith('/') ? newFile.slice(1) : newFile
                    );
                }
            }
        });
    };
    listDirForFiles(dirName);

    return results;
};

module.exports = { genUniqId, getAllFilesFromFolder };
