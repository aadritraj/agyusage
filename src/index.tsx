import { render } from "ink";
import { App } from "./ui/App";
import { COMMANDS, printHelp } from "./cli/commands";

const args = Bun.argv.slice(2);

if (args.length === 0) {
  render(<App />);
} else {
  const command = COMMANDS.find(
    (c) => c.name === args[0].toLowerCase() || c.aliases?.includes(args[0].toLowerCase()),
  );

  if (!command) {
    console.error(`Unknown subcommand: ${args[0]}`);
    printHelp();
    process.exit(1);
  }

  await command.action();
}
