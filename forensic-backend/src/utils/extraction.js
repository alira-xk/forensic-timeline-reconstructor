const { spawn } = require('child_process');
const path = require('path');
const logger = require('./logger');

const EXTRACTION_TIMEOUT = parseInt(process.env.EXTRACTION_TIMEOUT) || 120000;

const runPythonExtraction = (filePath, fileType, fileId, caseId) => {
  return new Promise((resolve, reject) => {
    const pythonPath = process.env.PYTHON_PATH || 'python';
    const enginePath = path.resolve(process.env.PYTHON_ENGINE_PATH || './python-engine/main.py');

    logger.info('Starting Python extraction', { filePath, fileType, fileId, caseId });

    const proc = spawn(pythonPath, [
      enginePath,
      '--file', filePath,
      '--type', fileType,
      '--file-id', fileId,
      '--case-id', caseId,
    ]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`Extraction timed out after ${EXTRACTION_TIMEOUT / 1000}s`));
    }, EXTRACTION_TIMEOUT);

    proc.on('close', (code) => {
      clearTimeout(timer);

      if (stderr) {
        logger.warn('Python stderr output', { fileId, stderr: stderr.substring(0, 500) });
      }

      if (code !== 0) {
        return reject(new Error(`Python process exited with code ${code}: ${stderr}`));
      }

      try {
        const result = JSON.parse(stdout);
        if (!result.success) {
          return reject(new Error(result.error || 'Extraction returned failure'));
        }
        resolve(result);
      } catch (parseErr) {
        reject(new Error(`Failed to parse Python output: ${parseErr.message}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
};

module.exports = { runPythonExtraction };
