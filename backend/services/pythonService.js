const { spawn } = require("child_process");
const path = require("path");

const runPythonExtractor = (filePath, fileType) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "../../python-engine/extract.py");

    // filePath from MongoDB is like: uploads\filename.png
    // This converts it to full backend file path
    const absoluteFilePath = path.join(__dirname, "..", filePath);

    const pythonProcess = spawn("python", [
      scriptPath,
      absoluteFilePath,
      fileType,
    ]);

    let output = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(errorOutput || "Python extraction failed"));
      }

      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch (error) {
        reject(new Error("Invalid JSON returned from Python script"));
      }
    });
  });
};

module.exports = {
  runPythonExtractor,
};