#!/usr/bin/env node

const fs = require('fs')
const program = require('commander')
const readline = require('readline')
const Table = require('cli-table');

const HOME_FOLDER = process.env.HOME + '/.stopwatch-tracker/'
const STATE_FILE = HOME_FOLDER + 'states.json'
const DEFAULT_FILE = HOME_FOLDER + 'default.csv'
const DEFAULT_FILE_TMP = HOME_FOLDER + 'default.csv.tmp'

if (!fs.existsSync(HOME_FOLDER))
{
	fs.mkdirSync(HOME_FOLDER)
	fs.appendFileSync(STATE_FILE, JSON.stringify({auto_increment: 1}))
	fs.appendFileSync(DEFAULT_FILE, 'Name,Start,End,Duration\n')
}

const STATE = JSON.parse(fs.readFileSync(STATE_FILE))

program
	.command('stopwatch [env]')
	.description('Use stopwatch to track and save events.')
	.version('1.0.0')
	.usage('[options] [key_name]')
	.option('-f, --file', 'Add the path to destination file. If not, stopwatch-cli will save the results on private.')
	.option('-g, --go', 'Go!')
	.option('-s, --stop', 'Stop!')
	.option('-d, --dump', 'Dump reccords.')
	.parse(process.argv)

const reader = readline.createInterface({input: fs.createReadStream(DEFAULT_FILE)})
const writer = fs.createWriteStream(DEFAULT_FILE_TMP)
var key_name = program.args[0] ? program.args[0] : (STATE.auto_increment + '')

var started = false
var line_selected = null

reader.on('line', (line) => {
	var columns = line.split(',')
	if (columns[0] === key_name + '' && columns[2] === '')
	{
		started = (new Date().getTime() / 1000) - (new Date(columns[1]).getTime() / 1000)
		line_selected = line
	}
}).on('close', () => {
	if (program.go && started === false)
	{
		fs.appendFileSync(DEFAULT_FILE, [key_name, new Date().toISOString(), '', ''].join(',') + '\n')

		console.log('Go!');
	}
	else if (program.go)
	{
		console.log('Already started ' + started.toFixed(3) + ' seconds ago.')
	}
	else if (program.stop)
	{
		const writer = fs.createWriteStream(DEFAULT_FILE_TMP)

		if (started !== false)
		{
			fs.unlinkSync(STATE_FILE)

			STATE.auto_increment++
			fs.appendFileSync(STATE_FILE, JSON.stringify(STATE))

			console.log('Stop!');
		}
		else
		{
			console.log('Nothing to stop.');
		}
	}

	const table = new Table({
		head: ['Name', 'Start', 'End', 'Duration']
	})

	let line_number = 0
	readline.createInterface({input: fs.createReadStream(DEFAULT_FILE)})
		.on('line', (line) => {
			if (program.stop && started !== false)
			{
				if (line_selected === line)
				{
					var columns = line.split(',')
					columns[2] = new Date().toISOString()
					columns[3] = started.toFixed(3)
					line = columns.join(',')
				}
				writer.write(`${line}\n`)
			}
			if (program.dump && line_number > 0)
			{
				table.push(line.split(','))
			}
			line_number++
		})
		.on('close', () => {
			if (program.stop && started !== false)
			{
				writer.end(() => {
					fs.unlinkSync(DEFAULT_FILE)
					fs.renameSync(DEFAULT_FILE_TMP, DEFAULT_FILE)
				})
			}
			if (program.dump)
			{
				console.log('\nSTOPWATCH LOG');
				console.log(table.toString());
				console.log('');
			}
			if (program.go && started !== false)
			{
				console.log('Already started ' + started.toFixed(3) + ' seconds ago.')
			}
		})
})
