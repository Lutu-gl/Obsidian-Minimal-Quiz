import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface MyPluginSettings {
	alignment: 'left' | 'center';
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	alignment: 'center'
}

export default class MinimalQuizPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
			this.addRibbonIcon('dice', 'Start Quiz', () => {
			new Notice('Quiz started!');
		});

		this.addCommand({
			id: 'show-questions-modal',
			name: 'Start quiz on current file',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				new Notice('Yup worked');
				const content = editor.getValue();
				const qaMap = this.extractQuestionsAndAnswers(content);
				const entries = Array.from(qaMap.entries());
				if (entries.length > 0) {
					new QuestionsModal(this.app, entries, this.settings).open();
				} else {
					new Notice('No questions found.');
				}
			} 
		});
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
		window.addEventListener('keydown', this.handleKeyDown);
	}

	handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === ' ' || event.key === 'Enter') {
			this.toggleAnswer();
			event.preventDefault();
		}
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
		
		let button;
		if (this.currentIndex >= this.entries.length - 1){
			button = contentEl.createEl('button', {
	            text: this.answerVisible ? 'Finish Quiz' : 'Show Answer',
			})
		} else {
			button = contentEl.createEl('button', {
	            text: this.answerVisible ? 'Next Question' : 'Show Answer',
	        });
		}
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
		window.removeEventListener('keydown', this.handleKeyDown);
	}
}