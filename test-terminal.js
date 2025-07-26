const { spawn } = require("child_process");
const fs = require("fs").promises;

async function testShells() {
  console.log("Testing available shells...\n");
  
  const shells = ["/bin/bash", "/bin/sh", "/usr/bin/bash", "/usr/bin/sh"];
  
  for (const shell of shells) {
    try {
      await fs.access(shell);
      console.log(`✓ ${shell} exists`);
      
      // Try to spawn it
      const test = spawn(shell, ["-c", "echo \\"Shell works\!\\""]);
      
      test.stdout.on("data", (data) => {
        console.log(`  Output: ${data.toString().trim()}`);
      });
      
      test.on("error", (err) => {
        console.log(`  ✗ Error: ${err.message}`);
      });
      
      test.on("exit", (code) => {
        console.log(`  Exit code: ${code}`);
      });
      
    } catch (err) {
      console.log(`✗ ${shell} not found`);
    }
  }
  
  console.log("\nEnvironment:");
  console.log("SHELL:", process.env.SHELL);
  console.log("PATH:", process.env.PATH);
  console.log("Platform:", process.platform);
}

testShells();
