import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers'

const argv = yargs(hideBin(process.argv))
.usage('Usage: $0 <command> [options]')
.argv
