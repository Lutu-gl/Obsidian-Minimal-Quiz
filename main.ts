import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface MyPluginSettings {
    alignment: 'left' | 'center';
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    alignment: 'center',
};

export default class MinimalQuizPlugin extends Plugin {
    settings: MyPluginSettings;

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new MinimalQuizSettingTab(this.app, this));

		this.addRibbonIcon('checkbox-glyph', 'Start Quiz', () => {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				const editor = activeView.editor;
				this.startQuiz(editor);
			} else {
				new Notice('No active Markdown editor found.');
			}
		});

        this.addCommand({
            id: 'show-questions-modal',
            name: 'Start quiz on current file',
            editorCallback: (editor: Editor, view: MarkdownView) => {
				this.startQuiz(editor);
            },
        });
    }

	startQuiz(editor: Editor) {
		const content = editor.getValue();
		const qaMap = this.extractQuestionsAndAnswers(content);
		const entries = Array.from(qaMap.entries());
		if (entries.length > 0) {
			new QuestionsModal(this.app, entries, this.settings).open();
		} else {
			new Notice('No questions found.');
		}
	}

    extractQuestionsAndAnswers(content: string): Map<string, string> {
        const qaMap = new Map<string, string>();
        const regex = /(.*\?)\n([\s\S]*?)(?=\n\n|$)/g;
        let match;

        while ((match = regex.exec(content)) !== null) {
            const question = match[1].trim();
            const answer = match[2].trim();
            if (question && answer) {
                qaMap.set(question, answer);
            }
        }

        return qaMap;
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class QuestionsModal extends Modal {
    entries: [string, string][];
    answerVisible = false;
    currentIndex = 0;
    settings: MyPluginSettings;

    constructor(app: App, questions: [string, string][], settings: MyPluginSettings) {
        super(app);
        this.entries = questions;
        this.settings = settings;
    }

    onOpen() {
        this.render();
    }

    render() {
        const { contentEl } = this;
        contentEl.empty();

        if (this.currentIndex >= this.entries.length) {
            new Notice('You finished the Quiz - Good Job!');
            this.close();
            return;
        }

        const progressText = `${this.currentIndex + 1}/${this.entries.length}`;
        const progressEl = contentEl.createEl('div', {
            text: `Progress: ${progressText}`,
        });
        progressEl.style.marginBottom = '20px';

        const [question, answer] = this.entries[this.currentIndex];

        const questionEl = contentEl.createEl('h1');
        questionEl.textContent = question;

        const answerEl = contentEl.createEl('p', {
            text: this.answerVisible ? answer : '',
        });
        answerEl.style.marginTop = '5px';

        // Button-Text basierend auf der aktuellen Frage
        const isLastQuestion = this.currentIndex === this.entries.length - 1;
        const buttonText = this.answerVisible
            ? (isLastQuestion ? 'Finish Quiz' : 'Next Question')
            : 'Show Answer';

        const button = contentEl.createEl('button', {
            text: buttonText,
        });
        button.style.marginTop = '20px';
        button.addEventListener('click', () => this.toggleAnswer());

        if (this.settings.alignment === 'center') {
            contentEl.style.textAlign = 'center';
        } else {
            contentEl.style.textAlign = 'left';
        }
    }

    toggleAnswer() {
        if (this.answerVisible) {
            this.currentIndex++;
            this.answerVisible = false;
        } else {
            this.answerVisible = true;
        }
        this.render();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class MinimalQuizSettingTab extends PluginSettingTab {
    plugin: MinimalQuizPlugin;

    constructor(app: App, plugin: MinimalQuizPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('Modal Alignment')
            .setDesc('Choose the alignment of the modal content.')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption('left', 'Left')
                    .addOption('center', 'Center')
                    .setValue(this.plugin.settings.alignment)
                    .onChange(async (value: 'left' | 'center') => {
                        this.plugin.settings.alignment = value;
                        await this.plugin.saveSettings();
                    })
            );
    }
}