import { Terminal } from "vscode";

declare global {
  var nonTaskTerminals: Set<Terminal>;
}

export interface ExtensionConfig {
	/**
	 * Main config. Items to show in Tree View.
	 */
	commands: TopLevelCommands;
	/**
	 * Workspace specific config. Addition items to show in Tree View, for each workspace.
	 */
	workspaceCommands: TopLevelCommands;
	/**
	 * Use shorter command ids.
	 */
	alias: Record<string, string>;
	/**
	 * Whether or not to show keyboard shortcuts assigned to command contributed by user.
	 */
	showKeybindings: boolean;
	/**
	 * Whether Tree View shows folders collapsed by default or not.
	 */
	treeViewCollapseFolders: boolean;
	/**
	 * Symbol used in the tree view to indicate that command is also visible in the status bar.
	 */
	treeViewStatusBarVisibleSymbol: string;
	/**
	 * Symbol used in the tree view to indicate workspace command (from `#commands.workspaceCommands#`) setting.
	 */
	treeViewWorkspaceCommandSymbol: string;
	/**
	 * When checked - include all commands from Command Palette to the Quick Pick.
	 */
	quickPickIncludeAllCommands: boolean;
	/**
	 * Adds all items to Command Palette (Requires editor reload).
	 */
	populateCommandPalette: boolean;
	/**
	 * Allow string `\"args\"` to contain some of the variables from [variables-reference](https://code.visualstudio.com/docs/editor/variables-reference)
	 */
	variableSubstitutionEnabled: boolean;
	/**
	 * Add ability to run commands as links in documents. Links have format `@command?args@`. https://github.com/usernamehw/vscode-commands/issues/2
	 */
	documentLinksEnabled: boolean;
	/**
	 * Glob for which document should have document links enabled.
	 */
	documentLinksPattern: string;
	/**
	 * Controls the text of Status Bar item when adding from Tree View context menu.
	 */
	statusBarDefaultText: 'pick' | 'same';
	/**
	 * Where to put command on Status Bar (left of right).
	 */
	statusBarDefaultPosition: 'left' | 'right';
	toggleSettings: {
		/**
		* When enabled - show notification after using `commands.toggleSetting` or `commands.incrementSetting`.
		*/
		showNotification: boolean;
	};
}
/**
 * Main configuration property. Can contain folders or command objects.
 * Folders cannot contain folders.
 */
export interface TopLevelCommands {
	[key: string]: CommandFolder & CommandObject;// TODO: ideally it would also have `| string`
}

export type Runnable = CommandObject | Sequence | string;

export interface CommandObject {
	command: string;
	args?: unknown;
	delay?: number;
	/**
	 * Run this command or sequence **repeat** number of times.
	 */
	repeat?: number;
	icon?: string;
	markdownTooltip?: string;
	disableTooltip?: boolean;
	iconColor?: string;
	statusBar?: StatusBar;
	sequence?: Sequence;
	hidden?: boolean;
	when?: string;
	workspace?: string;
}
/**
 * Add command/folder to status bar
 */
interface StatusBar {
	alignment?: 'left' | 'right';
	text: string;
	name?: string;
	priority?: number;
	tooltip?: string;
	markdownTooltip?: string;
	hidden?: boolean;
	color?: string;
	backgroundColor?: 'error' | 'warning';
	activeEditorGlob?: string;
	activeEditorLanguage?: string;
}
export type Sequence = (CommandObject | string)[];
/**
 * Folder can only have `nestedItems` property.
 */
export interface CommandFolder {
	nestedItems?: TopLevelCommands;
	statusBar?: StatusBar;
	hidden?: boolean;
	workspace?: string;
}
