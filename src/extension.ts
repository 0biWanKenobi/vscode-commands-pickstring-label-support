import { commands, window, workspace, type ExtensionContext, type TreeView } from 'vscode';
import { updateCommandPalette } from './commandPalette';
import { registerExtensionCommands } from './commands';
import { updateDocumentLinkProvider } from './documentLinksProvider';
import { getKeybindings, type VsCodeKeybindingItem } from './getKeybindings';
import { registerJsonSchemaCompletion } from './jsonSchema/jsonSchemaCompletions';
import { registerDynamicJsonSchema } from './jsonSchema/registerDynamicJsonSchema';
import { type VscodeCommandWithoutCategory } from './quickPick';
import { updateUserCommands } from './registerUserCommands';
import { updateStatusBarItems, updateStatusBarItemsVisibilityBasedOnActiveEditor } from './statusBar';
import { CommandsTreeViewProvider, type FolderTreeItem, type RunCommandTreeItem } from './TreeViewProvider';
import { type ExtensionConfig, type Runnable, type TopLevelCommands } from './types';
import { addWorkspaceIdToCommands, getWorkspaceId, setWorkspaceIdToContext } from './workspaceCommands';

export const enum Constants {
	ExtensionId = 'usernamehw.commands',
	ExtensionSettingsPrefix = 'commands',
	ExtensionMainSettingId = 'commands.commands',
	WorkspaceCommandsSettingId = 'commands.workspaceCommands',

	CommandPaletteWasPopulatedStorageKey = 'was_populated',

	PackageJsonFileName = 'package.json',
	SettingsJsonFileName = 'settings.json',
	KeybindingsJsonFileName = 'keybindings.json',

	NestingSymbol = '◦',
}

export let $config: ExtensionConfig;
export abstract class $state {
	public static lastExecutedCommand: Runnable = { command: 'noop' };
	public static context: ExtensionContext;
	/**
	 * Cache all Command Palette commands for `quickPickIncludeAllCommands` feature.
	 */
	public static allCommandPaletteCommands: VscodeCommandWithoutCategory[] = [];
	public static commandsTreeViewProvider: CommandsTreeViewProvider;
	public static commandsTreeView: TreeView<FolderTreeItem | RunCommandTreeItem>;
	public static keybindings: VsCodeKeybindingItem[] = [];
}

export async function activate(context: ExtensionContext): Promise<void> {
	$state.context = context;

	updateConfig();

	$state.commandsTreeViewProvider = new CommandsTreeViewProvider({});
	$state.commandsTreeView = window.createTreeView(`${Constants.ExtensionSettingsPrefix}.tree`, {
		treeDataProvider: $state.commandsTreeViewProvider,
		showCollapseAll: true,
	});

	registerExtensionCommands();

	await setWorkspaceIdToContext(context);
	updateEverything(context);

	registerDynamicJsonSchema(context);
	registerJsonSchemaCompletion(context);

	function updateConfig(): void {
		$config = workspace.getConfiguration(Constants.ExtensionSettingsPrefix) as unknown as ExtensionConfig;
	}

	context.subscriptions.push($state.commandsTreeView);
	context.subscriptions.push(workspace.onDidChangeConfiguration(e => {
		if (!e.affectsConfiguration(Constants.ExtensionSettingsPrefix)) {
			return;
		}
		updateConfig();
		updateEverything(context);
	}));

	context.subscriptions.push(window.onDidChangeActiveTextEditor(editor => {
		updateStatusBarItemsVisibilityBasedOnActiveEditor(editor);
	}));
}

/**
 * Function runs after every config update.
 */
async function updateEverything(context: ExtensionContext): Promise<void> {
	const allCommands = getAllCommands();
	$state.keybindings = [];
	if ($config.showKeybindings) {
		$state.keybindings = await getKeybindings(context);
	}
	$state.commandsTreeViewProvider.updateCommands(allCommands);
	$state.commandsTreeViewProvider.refresh();
	updateUserCommands(allCommands);
	updateStatusBarItems(allCommands);
	updateCommandPalette(allCommands, context);
	updateDocumentLinkProvider();
	updateWelcomeViewContext(Object.keys(allCommands).length === 0);
}

/**
 * Merge global and workspace commands.
 */
export function getAllCommands(): TopLevelCommands {
	const workspaceId = getWorkspaceId($state.context);
	const workspaceCommands = workspace.getConfiguration(Constants.ExtensionSettingsPrefix).inspect('workspaceCommands')?.workspaceValue as ExtensionConfig['workspaceCommands'] | undefined;
	if (workspaceId && workspaceCommands) {
		return {
			...$config.commands,
			...addWorkspaceIdToCommands(workspaceCommands, workspaceId),
		};
	} else {
		return $config.commands;
	}
}

function updateWelcomeViewContext(isEmpty: boolean): void {
	commands.executeCommand('setContext', 'commands:emptyCommands', isEmpty);
}

export function deactivate(): void { }
