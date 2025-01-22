import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runTests() {
  try {
    const { stdout, stderr } = await execAsync('npx jest --forceExit');
    console.log(stdout);
    if (stderr) console.error(stderr);
    process.exit(stdout.includes('FAIL') ? 1 : 0);
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

runTests();