import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MinimalQuizPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
			this.addRibbonIcon('dice', 'Greet', () => {
			new Notice('Hello, world!');
		});

	this.addCommand({
		id: 'show-questions-modal',
		name: 'Start quiz on current file',
		editorCallback: (editor: Editor, view: MarkdownView) => {
			const content = editor.getValue();
        	const matches = [...content.matchAll(/(.*?)(?=\?)/g)];
			const results = matches.map(match => match[1].trim()).filter(Boolean);
			if (results.length > 0) {
				new QuestionsModal(this.app, results).open();
			} else {
				new Notice('No questions found.');
			}
		} 
	});

	this.addCommand({
		id: 'find-text-before-question-marks',
		name: 'Find text before question marks',
		editorCallback: (editor: Editor, view: MarkdownView) => {
			const content = editor.getValue();
        	const matches = [...content.matchAll(/(.*?)(?=\?)/g)];
			const results = matches.map(match => match[1].trim()).filter(Boolean);

			if (results.length > 0) {
				new Notice(`Found: \n${results.join('\n')}`);
			} else {
				new Notice('No questions found.');
			}
		}
	})

	}

	async backup(){
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
		console.log('Unloading Plugin')
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class QuestionsModal extends Modal {
	questions: string[];

	constructor(app: App, questions: string[]) {
		super(app);
		this.questions = questions;
	}

	onOpen() {
		const {contentEl, modalEl} = this;
		contentEl.setText('Woah!');

		modalEl.style.backdropFilter = 'blur(10px)';
		modalEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
		modalEl.style.color = 'white';
		modalEl.style.padding = '20px';
		modalEl.style.borderRadius = '8px';
		
		contentEl.createEl('h2', { text: 'Questions found:'});
		
	    const list = contentEl.createEl('ul');
   		this.questions.forEach(question => {
      		const item = list.createEl('li', { text: question });
      		item.style.marginBottom = '8px';
    	});
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MinimalQuizPlugin;

	constructor(app: App, plugin: MinimalQuizPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
