const tar = require("tar");

const source = process.argv[2];
const destination = process.argv[3];

process.on("unhandledRejection", (err) => {
  throw err;
});

/*
 * This extracts the <$2> tar file and places the resulting files into the
 * directory specified by <$3>.
 */
tar
  .extract({ file: source, cwd: destination, onwarn: process.emitWarning })
  .then(() => process.exit(0));
