import React from "react";
import { render } from "ink";
import { App } from "./ui/App";
import { COMMANDS, printHelp } from "./cli/commands";

const main = async (): Promise<void> => {
  const args = Bun.argv.slice(2);

  if (args.length === 0) {
    render(<App />);
  } else {
    const inputCmd = args[0].toLowerCase();
    const command = COMMANDS.find((c) => c.name === inputCmd || c.aliases?.includes(inputCmd));

    if (command) {
      await command.action();
    } else {
      console.error(`Unknown subcommand: ${args[0]}`);
      printHelp();
      process.exit(1);
    }
  }
};

main();
