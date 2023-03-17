import { commands, extensions, ThemeIcon, Uri, window, workspace, type QuickInputButton, type QuickPickItem } from 'vscode';
import { hasArgs } from './args';
import { CommandId } from './commands';
import { $config, $state } from './extension';
import { run } from './run';
import { type Runnable, type TopLevelCommands } from './types';
import { goToSymbol, openSettingsJson, uint8ArrayToString } from './utils';
import { isWorkspaceCommandItem } from './workspaceCommands';

/**
 * Show quick pick with user commands. After picking one - run it.
 */
export async function showQuickPick(commandsForPicking: TopLevelCommands, isFolder = false): Promise<void> {
	const treeAsOneLevelMap: Record<string, {
		runnable: Runnable;
		parentFolderName?: string;
	}> = {};
	function traverseCommands(items: TopLevelCommands, parentFolderName?: string): void {
		for (const key in items) {
			const runnable = items[key];
			if (runnable.nestedItems) {
				traverseCommands(runnable.nestedItems, key);
			} else {
				treeAsOneLevelMap[key] = {
					runnable,
					parentFolderName,
				};
			}
		}
	}
	traverseCommands(commandsForPicking);

	const newCommandButton: QuickInputButton = {
		iconPath: new ThemeIcon('add'),
		tooltip: 'Add new command',
	};

	const revealCommandButton: QuickInputButton = {
		iconPath: new ThemeIcon('go-to-file'),
		tooltip: 'Reveal in settings.json',
	};

	const userCommands: QuickPickWithRunnable[] = Object.keys(treeAsOneLevelMap).map(label => ({
		// @ts-expect-error
		label: `${treeAsOneLevelMap[label]?.runnable?.icon ? `$(${treeAsOneLevelMap[label].runnable.icon}) ` : ''}${label}`,
		buttons: [revealCommandButton],
		runnable: treeAsOneLevelMap[label].runnable,
		description: treeAsOneLevelMap[label].parentFolderName ? `$(folder) ${treeAsOneLevelMap[label].parentFolderName}` : undefined,
	}));

	let pickedItem: QuickPickItem | undefined;
	const quickPick = window.createQuickPick();
	quickPick.matchOnDescription = true;
	quickPick.matchOnDetail = true;
	quickPick.title = 'Run command';

	if ($config.quickPickIncludeAllCommands && !isFolder) {
		const allCommandPaletteCommands = convertVscodeCommandToQuickPickItem(await getAllCommandPaletteCommands());
		// dedup?
		quickPick.items = [
			...userCommands,
			...allCommandPaletteCommands,
		];
	} else {
		quickPick.items = userCommands;
	}

	quickPick.buttons = [
		newCommandButton,
	];
	quickPick.onDidTriggerItemButton(async e => {
		const labelWithoutCodiconIcon = removeCodiconIconFromLabel(e.item.label);
		const clickedItem = treeAsOneLevelMap[labelWithoutCodiconIcon];
		if (e.button.tooltip === revealCommandButton.tooltip) {
			await openSettingsJson(isWorkspaceCommandItem(clickedItem) ? 'workspace' : 'global');
			goToSymbol(window.activeTextEditor, labelWithoutCodiconIcon);
		}
		quickPick.hide();
		quickPick.dispose();
	});
	quickPick.onDidChangeSelection(e => {
		pickedItem = e[0];
	});
	quickPick.onDidTriggerButton(e => {
		if (e.tooltip === newCommandButton.tooltip) {
			commands.executeCommand(CommandId.NewCommand);
		}
		quickPick.hide();
		quickPick.dispose();
	});

	quickPick.onDidAccept(async () => {
		if (pickedItem) {
			// @ts-expect-error
			await run(pickedItem.runnable);
		}
		quickPick.hide();
		quickPick.dispose();
	});
	quickPick.show();
}

/**
 * - Convert command ids to {@link QuickPickItem `QuickPickItem[]`}
 * - Add `args` detail to commands that can accept arguments.
 */
export function commandsToQuickPickItems(commandList: string[]): QuickPickItem[] {
	const quickPickItems: QuickPickItem[] = [];
	for (const com of commandList) {
		quickPickItems.push({
			label: `${com}${hasArgs(com) ? ' ($(pass-filled) args)' : ''}`,
		});
	}
	return quickPickItems;
}

type QuickPickWithRunnable = QuickPickItem & { runnable: Runnable };

function convertVscodeCommandToQuickPickItem(commanList: VscodeCommand[]): QuickPickWithRunnable[] {
	return commanList.map((com): QuickPickWithRunnable => ({
		label: com.title,
		detail: com.command,
		runnable: {
			command: com.command,
		},
	}));
}

interface VscodeCommand {
	command: string;
	title: string;
	category?: string;
}

export type VscodeCommandWithoutCategory = Omit<VscodeCommand, 'category'>;

export async function getAllCommandPaletteCommands(): Promise<VscodeCommandWithoutCategory[]> {
	if ($state.allCommandPaletteCommands.length) {
		return $state.allCommandPaletteCommands;
	}
	const commandsFromExtensions = getAllCommandsFromExtensions();
	const builtinCommands = await getAllBuiltinCommands();
	const allCommandPaletteCommands = [
		...builtinCommands,
		...commandsFromExtensions,
	];
	$state.allCommandPaletteCommands = allCommandPaletteCommands;
	return allCommandPaletteCommands;
}

async function getAllBuiltinCommands(): Promise<VscodeCommandWithoutCategory[]> {
	const commandsDataPath = $state.context.asAbsolutePath('./data/commandTitleMap.json');
	const file = await workspace.fs.readFile(Uri.file(commandsDataPath));
	try {
		const fileContentAsObject = JSON.parse(uint8ArrayToString(file));
		const result: VscodeCommandWithoutCategory[] = [];
		for (const key in fileContentAsObject) {
			result.push({
				command: key,
				title: fileContentAsObject[key],
			});
		}
		return result;
	} catch (e) {
		window.showErrorMessage(`Failed to get builtin commands: ${String(e)}`);
	}
	return [];
}

function getAllCommandsFromExtensions(): VscodeCommandWithoutCategory[] {
	const coms: VscodeCommandWithoutCategory[] = [];
	for (const extension of extensions.all) {
		const contributedCommands: VscodeCommand[] | undefined = extension.packageJSON?.contributes?.commands;
		if (contributedCommands) {
			coms.push(...contributedCommands.map(command => ({
				command: command.command,
				title: `${command.category ? `${command.category}: ` : ''}${command.title}`,
			})));
		}
	}
	return coms;
}

/**
 * Remove codicon that shows at the start of the label when
 * the item has "icon" property.
 */
function removeCodiconIconFromLabel(str: string): string {
	return str.replace(/\$\([a-z-]+\)\s/iu, '');
}
/**
 * Remove codicon with the args text that shows at the end of the label
 * of the command that accepts arguments.
 */
export function removeCodiconFromLabel(str: string): string {
	return str.replace(/\s\(\$\([a-z-]+\)\sargs\)/iu, '');
}
